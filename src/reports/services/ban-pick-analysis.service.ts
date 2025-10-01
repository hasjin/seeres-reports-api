import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BanPickAnalysisQuery } from '../dto/ban-pick-analysis.query';
import { BanPickAnalysisRow } from '../models/ban-pick-analysis.model';

/**
 * 밴/픽률 분석 서비스
 * 지역, 티어, 라인별 세분화된 챔피언 통계 제공
 */
@Injectable()
export class BanPickAnalysisService {
  constructor(private readonly ds: DataSource) {}

  /**
   * 밴/픽률 분석 실행
   */
  async run(q: BanPickAnalysisQuery): Promise<BanPickAnalysisRow[]> {
    if (q.queue === undefined || q.queue === null) {
      throw new BadRequestException('queue is required');
    }

    const patch = q.patch;
    const queue = q.queue;
    const region = q.region && q.region !== 'all' ? q.region : null;
    const tier = q.tier && q.tier !== 'all' ? q.tier : null;
    const role = q.role && q.role !== 'all' ? q.role : null;
    const limit = q.limit ?? 100;
    const offset = q.offset ?? 0;
    const minGames = q.minGames ?? 30;
    const sortBy = q.sortBy ?? 'pickRate';
    const sortOrder = q.sortOrder ?? 'desc';

    // 필터 조건에 따라 적절한 쿼리 선택
    const useRegionTierRole = region !== null || tier !== null || role !== null;

    let sql: string;
    let params: (string | number | null)[];

    if (useRegionTierRole) {
      // 지역/티어/라인 필터가 있을 때
      sql = this.buildFilteredQuery(sortBy, sortOrder);
      params = [patch, queue, region, tier, role, minGames, limit, offset];
    } else {
      // 필터가 없을 때 (기본 큐별 통계)
      sql = this.buildDefaultQuery(sortBy, sortOrder);
      params = [patch, queue, minGames, limit, offset];
    }

    const rowsUnknown: unknown = await this.ds.query(sql, params);
    const rowsArray = Array.isArray(rowsUnknown) ? rowsUnknown : [];
    return rowsArray.map((row) => this.parseRow(row));
  }

  /**
   * 필터가 적용된 쿼리 빌드
   */
  private buildFilteredQuery(sortBy: string, sortOrder: string): string {
    const orderByClause = this.getOrderByClause(sortBy, sortOrder);

    return `
      WITH
      total_games AS (
        SELECT COALESCE(SUM(total_games), 0)::INTEGER AS total
        FROM patch_totals_region_tier
        WHERE patch = $1
          AND queue = $2
          AND ($3::TEXT IS NULL OR region = $3)
          AND ($4::TEXT IS NULL OR tier = $4)
      ),
      pick_stats AS (
        SELECT
          champion_id,
          SUM(games)::INTEGER AS games,
          SUM(wins)::INTEGER AS wins,
          (SUM(wins)::NUMERIC / NULLIF(SUM(games), 0))::FLOAT AS win_rate
        FROM champion_stats_region_tier_role
        WHERE patch = $1
          AND queue = $2
          AND ($3::TEXT IS NULL OR region = $3)
          AND ($4::TEXT IS NULL OR tier = $4)
          AND ($5::TEXT IS NULL OR role = $5)
        GROUP BY champion_id
      ),
      ban_stats AS (
        SELECT
          champion_id,
          SUM(bans)::INTEGER AS bans
        FROM ban_stats_region_tier_role
        WHERE patch = $1
          AND queue = $2
          AND ($3::TEXT IS NULL OR region = $3)
          AND ($4::TEXT IS NULL OR tier = $4)
        GROUP BY champion_id
      ),
      all_champions AS (
        SELECT champion_id FROM pick_stats
        UNION
        SELECT champion_id FROM ban_stats
      )
      SELECT
        ac.champion_id AS "championId",
        COALESCE(ps.games, 0) AS games,
        COALESCE(ps.wins, 0) AS wins,
        COALESCE(bs.bans, 0) AS bans,
        COALESCE(ps.win_rate, 0) AS "winRate",
        (COALESCE(ps.games, 0)::NUMERIC / NULLIF(tg.total, 0))::FLOAT AS "pickRate",
        (COALESCE(bs.bans, 0)::NUMERIC / NULLIF(tg.total, 0))::FLOAT AS "banRate"
      FROM all_champions ac
      CROSS JOIN total_games tg
      LEFT JOIN pick_stats ps ON ps.champion_id = ac.champion_id
      LEFT JOIN ban_stats bs ON bs.champion_id = ac.champion_id
      WHERE COALESCE(ps.games, 0) >= $6
      ${orderByClause}
      LIMIT $7 OFFSET $8
    `;
  }

  /**
   * 기본 쿼리 빌드 (필터 없음)
   */
  private buildDefaultQuery(sortBy: string, sortOrder: string): string {
    const orderByClause = this.getOrderByClause(sortBy, sortOrder);

    return `
      WITH
      total_games AS (
        SELECT total_games AS total
        FROM patch_totals_q
        WHERE patch = $1 AND queue = $2
      ),
      pick_stats AS (
        SELECT
          champion_id,
          games,
          wins,
          (wins::NUMERIC / NULLIF(games, 0))::FLOAT AS win_rate
        FROM champion_patch_stats_q
        WHERE patch = $1 AND queue = $2
      ),
      ban_stats AS (
        SELECT
          champion_id,
          bans
        FROM ban_patch_stats_q
        WHERE patch = $1 AND queue = $2
      ),
      all_champions AS (
        SELECT champion_id FROM pick_stats
        UNION
        SELECT champion_id FROM ban_stats
      )
      SELECT
        ac.champion_id AS "championId",
        COALESCE(ps.games, 0) AS games,
        COALESCE(ps.wins, 0) AS wins,
        COALESCE(bs.bans, 0) AS bans,
        COALESCE(ps.win_rate, 0) AS "winRate",
        (COALESCE(ps.games, 0)::NUMERIC / NULLIF(tg.total, 0))::FLOAT AS "pickRate",
        (COALESCE(bs.bans, 0)::NUMERIC / NULLIF(tg.total, 0))::FLOAT AS "banRate"
      FROM all_champions ac
      CROSS JOIN total_games tg
      LEFT JOIN pick_stats ps ON ps.champion_id = ac.champion_id
      LEFT JOIN ban_stats bs ON bs.champion_id = ac.champion_id
      WHERE COALESCE(ps.games, 0) >= $3
      ${orderByClause}
      LIMIT $4 OFFSET $5
    `;
  }

  /**
   * ORDER BY 절 생성
   */
  private getOrderByClause(sortBy: string, sortOrder: string): string {
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    let orderColumn: string;

    switch (sortBy) {
      case 'pickRate':
        orderColumn = '"pickRate"';
        break;
      case 'banRate':
        orderColumn = '"banRate"';
        break;
      case 'winRate':
        orderColumn = '"winRate"';
        break;
      case 'games':
        orderColumn = 'games';
        break;
      default:
        orderColumn = '"pickRate"';
    }

    return `ORDER BY ${orderColumn} ${direction}, "championId" ASC`;
  }

  /**
   * DB 행을 모델로 파싱
   */
  private parseRow(row: any): BanPickAnalysisRow {
    return {
      championId: Number(row.championId ?? 0),
      games: Number(row.games ?? 0),
      wins: Number(row.wins ?? 0),
      bans: Number(row.bans ?? 0),
      winRate: Number(row.winRate ?? 0),
      pickRate: Number(row.pickRate ?? 0),
      banRate: Number(row.banRate ?? 0),
      region: row.region ?? undefined,
      tier: row.tier ?? undefined,
      role: row.role ?? undefined,
    };
  }
}
