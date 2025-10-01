import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PatchChampImpactQuery } from '../dto/patch-champ-impact.query';
import { PatchChampImpactRow } from '../models/patch-champ-impact.model';
import {
  prevPatchSql,
  prevMajorMinorPatchSql,
} from '../../common/utils/patch.util';
import {
  PrevPatchRow,
  isPrevPatchRow,
  parseImpactRow,
} from '../types/db.types';

@Injectable()
export class PatchChampImpactService {
  constructor(private readonly ds: DataSource) {}

  /**
   * 기준 패치 조회 (컨트롤러에서 사용)
   */
  async getBasePatch(
    patch: string,
    queue: number,
    baseline?: 'prev' | 'major-minor-prev',
  ): Promise<string | null> {
    const baselineType = baseline ?? 'prev';
    const prevPatchQuery =
      baselineType === 'major-minor-prev'
        ? prevMajorMinorPatchSql
        : prevPatchSql;

    // First, pick "previous patch" without queue constraints (legacy behavior)
    const prevRowsUnknown: unknown = await this.ds.query(prevPatchQuery, [
      patch,
    ]);
    const prevRows: PrevPatchRow[] = Array.isArray(prevRowsUnknown)
      ? prevRowsUnknown.filter(isPrevPatchRow)
      : [];
    let basePatch: string | null = prevRows[0]?.patch ?? null;

    const checkRowsUnknown: unknown = basePatch
      ? await this.ds.query(
          `SELECT 1 FROM patch_totals_q WHERE patch = $1 AND queue = $2 LIMIT 1`,
          [basePatch, queue],
        )
      : [];
    const hasBaseForQueue =
      basePatch !== null &&
      Array.isArray(checkRowsUnknown) &&
      checkRowsUnknown.length > 0;

    if (!hasBaseForQueue) {
      const prevForQueueSql = `
        SELECT patch
        FROM patch_totals_q
        WHERE queue = $2
          AND (split_part(patch,'.',1)::int, split_part(patch,'.',2)::int)
              < (split_part($1,'.',1)::int, split_part($1,'.',2)::int)
        ORDER BY split_part(patch,'.',1)::int DESC,
                 split_part(patch,'.',2)::int DESC
        LIMIT 1
      `;
      const altUnknown: unknown = await this.ds.query(prevForQueueSql, [
        patch,
        queue,
      ]);
      const alt = Array.isArray(altUnknown) ? altUnknown : [];
      basePatch =
        (alt[0] as { patch?: string } | undefined)?.patch ?? basePatch ?? null;
    }

    return basePatch;
  }

  async run(q: PatchChampImpactQuery): Promise<PatchChampImpactRow[]> {
    if (q.queue === undefined || q.queue === null) {
      throw new BadRequestException('queue is required');
    }

    const basePatch = await this.getBasePatch(q.patch, q.queue, q.baseline);
    const currPatch = q.patch;
    const queue = q.queue;
    const limit = q.limit ?? 9999;
    const offset = q.offset ?? 0;

    // 필터 값이 있는지 확인
    const hasFilters =
      (q.region && q.region !== 'all') ||
      (q.tier && q.tier !== 'all') ||
      (q.role && q.role !== 'all');

    if (hasFilters) {
      return this.runWithFilters(
        currPatch,
        basePatch,
        queue,
        limit,
        offset,
        q.region,
        q.tier,
        q.role,
      );
    }

    // 기존 쿼리 (필터 없음)
    const sql = `
    WITH
    curr_tot AS ( SELECT total_games FROM patch_totals_q WHERE patch = $1 AND queue = $3 ),
    base_tot AS ( SELECT total_games FROM patch_totals_q WHERE patch = $2 AND queue = $3 ),
    curr_pick AS (
      SELECT champion_id, games, wins, (wins::numeric / NULLIF(games,0))::float AS win_rate
      FROM champion_patch_stats_q
      WHERE patch = $1 AND queue = $3
    ),
    base_pick AS (
      SELECT champion_id, games, wins, (wins::numeric / NULLIF(games,0))::float AS win_rate
      FROM champion_patch_stats_q
      WHERE patch = $2 AND queue = $3
    ),
    curr_ban AS (
      SELECT champion_id, bans
      FROM ban_patch_stats_q
      WHERE patch = $1 AND queue = $3
    ),
    base_ban AS (
      SELECT champion_id, bans
      FROM ban_patch_stats_q
      WHERE patch = $2 AND queue = $3
    ),
    ids AS (
      SELECT champion_id FROM champion_patch_stats_q WHERE patch = $1 AND queue = $3
      UNION
      SELECT champion_id FROM champion_patch_stats_q WHERE patch = $2 AND queue = $3
      UNION
      SELECT champion_id FROM ban_patch_stats_q WHERE patch = $1 AND queue = $3
      UNION
      SELECT champion_id FROM ban_patch_stats_q WHERE patch = $2 AND queue = $3
    )
    SELECT
      i.champion_id                                                                 AS "championId",
      COALESCE(c.games, 0)                                                          AS games,
      COALESCE(c.wins, 0)                                                           AS wins,
      (COALESCE(c.wins,0)::numeric / NULLIF(COALESCE(c.games,0),0))::float          AS "winRate",
      (COALESCE(c.games,0)::numeric / NULLIF(ct.total_games,0))::float              AS "pickRate",
      (COALESCE(cb.bans,0)::numeric / NULLIF(ct.total_games,0))::float              AS "banRate",
      (
        (COALESCE(c.wins,0)::numeric / NULLIF(COALESCE(c.games,0),0))
        - COALESCE(b.win_rate,0)
      )::float                                                                       AS "dWinRate",
      (
        (COALESCE(c.games,0)::numeric / NULLIF(ct.total_games,0))
        - COALESCE((COALESCE(b.games,0)::numeric / NULLIF(bt.total_games,0)), 0)
      )::float                                                                       AS "dPickRate",
      (
        (COALESCE(cb.bans,0)::numeric / NULLIF(ct.total_games,0))
        - COALESCE((COALESCE(bb.bans,0)::numeric / NULLIF(bt.total_games,0)), 0)
      )::float                                                                       AS "dBanRate"
    FROM ids i
    LEFT JOIN curr_pick c ON c.champion_id = i.champion_id
    LEFT JOIN base_pick b ON b.champion_id = i.champion_id
    LEFT JOIN curr_ban  cb ON cb.champion_id = i.champion_id
    LEFT JOIN base_ban  bb ON bb.champion_id = i.champion_id
    CROSS JOIN curr_tot ct
    LEFT  JOIN base_tot bt ON true
    ORDER BY COALESCE(c.games,0) DESC, i.champion_id ASC
    LIMIT $4 OFFSET $5
  `;

    type SqlParam = string | number | null;
    const params: SqlParam[] = [currPatch, basePatch, queue, limit, offset];

    const rowsUnknown: unknown = await this.ds.query(sql, params);
    const rowsArray = Array.isArray(rowsUnknown) ? rowsUnknown : [];
    return rowsArray.map(parseImpactRow);
  }

  /**
   * 지역/티어/라인 필터 적용 쿼리
   */
  private async runWithFilters(
    currPatch: string,
    basePatch: string | null,
    queue: number,
    limit: number,
    offset: number,
    region?: string,
    tier?: string,
    role?: string,
  ): Promise<PatchChampImpactRow[]> {
    // WHERE 조건 동적 생성
    const conditions: string[] = ['patch = $1', 'queue = $2'];
    const params: (string | number | null)[] = [currPatch, queue];
    let paramIndex = 3;

    if (region && region !== 'all') {
      conditions.push(`region = $${paramIndex}`);
      params.push(region);
      paramIndex++;
    }

    if (tier && tier !== 'all') {
      conditions.push(`tier = $${paramIndex}`);
      params.push(tier);
      paramIndex++;
    }

    if (role && role !== 'all') {
      conditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // basePatch를 위한 조건 (패치만 다름)
    const baseConditions = conditions.map((c) => c.replace('$1', '$999'));
    baseConditions[0] = `patch = $${paramIndex}`;
    const baseWhereClause = baseConditions.join(' AND ');

    const baseParams: (string | number | null)[] = [basePatch, queue];
    if (region && region !== 'all') baseParams.push(region);
    if (tier && tier !== 'all') baseParams.push(tier);
    if (role && role !== 'all') baseParams.push(role);

    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;

    const sql = `
    WITH
    curr_tot AS (
      SELECT COALESCE(SUM(total_games), 0)::INTEGER AS total_games
      FROM patch_totals_region_tier
      WHERE ${whereClause}
    ),
    base_tot AS (
      SELECT COALESCE(SUM(total_games), 0)::INTEGER AS total_games
      FROM patch_totals_region_tier
      WHERE ${baseWhereClause}
    ),
    curr_pick AS (
      SELECT
        champion_id,
        SUM(games)::INTEGER AS games,
        SUM(wins)::INTEGER AS wins,
        (SUM(wins)::numeric / NULLIF(SUM(games),0))::float AS win_rate
      FROM champion_stats_region_tier_role
      WHERE ${whereClause}
      GROUP BY champion_id
    ),
    base_pick AS (
      SELECT
        champion_id,
        SUM(games)::INTEGER AS games,
        SUM(wins)::INTEGER AS wins,
        (SUM(wins)::numeric / NULLIF(SUM(games),0))::float AS win_rate
      FROM champion_stats_region_tier_role
      WHERE ${baseWhereClause}
      GROUP BY champion_id
    ),
    curr_ban AS (
      SELECT
        champion_id,
        SUM(bans)::INTEGER AS bans
      FROM ban_stats_region_tier_role
      WHERE ${whereClause}
      GROUP BY champion_id
    ),
    base_ban AS (
      SELECT
        champion_id,
        SUM(bans)::INTEGER AS bans
      FROM ban_stats_region_tier_role
      WHERE ${baseWhereClause}
      GROUP BY champion_id
    ),
    ids AS (
      SELECT DISTINCT champion_id FROM champion_stats_region_tier_role WHERE ${whereClause}
      UNION
      SELECT DISTINCT champion_id FROM champion_stats_region_tier_role WHERE ${baseWhereClause}
      UNION
      SELECT DISTINCT champion_id FROM ban_stats_region_tier_role WHERE ${whereClause}
      UNION
      SELECT DISTINCT champion_id FROM ban_stats_region_tier_role WHERE ${baseWhereClause}
    )
    SELECT
      i.champion_id                                                                 AS "championId",
      COALESCE(c.games, 0)                                                          AS games,
      COALESCE(c.wins, 0)                                                           AS wins,
      (COALESCE(c.wins,0)::numeric / NULLIF(COALESCE(c.games,0),0))::float          AS "winRate",
      (COALESCE(c.games,0)::numeric / NULLIF(ct.total_games,0))::float              AS "pickRate",
      (COALESCE(cb.bans,0)::numeric / NULLIF(ct.total_games,0))::float              AS "banRate",
      (
        (COALESCE(c.wins,0)::numeric / NULLIF(COALESCE(c.games,0),0))
        - COALESCE(b.win_rate,0)
      )::float                                                                       AS "dWinRate",
      (
        (COALESCE(c.games,0)::numeric / NULLIF(ct.total_games,0))
        - COALESCE((COALESCE(b.games,0)::numeric / NULLIF(bt.total_games,0)), 0)
      )::float                                                                       AS "dPickRate",
      (
        (COALESCE(cb.bans,0)::numeric / NULLIF(ct.total_games,0))
        - COALESCE((COALESCE(bb.bans,0)::numeric / NULLIF(bt.total_games,0)), 0)
      )::float                                                                       AS "dBanRate"
    FROM ids i
    LEFT JOIN curr_pick c ON c.champion_id = i.champion_id
    LEFT JOIN base_pick b ON b.champion_id = i.champion_id
    LEFT JOIN curr_ban  cb ON cb.champion_id = i.champion_id
    LEFT JOIN base_ban  bb ON bb.champion_id = i.champion_id
    CROSS JOIN curr_tot ct
    LEFT  JOIN base_tot bt ON true
    ORDER BY COALESCE(c.games,0) DESC, i.champion_id ASC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

    const allParams = [...params, ...baseParams.slice(1), limit, offset];

    const rowsUnknown: unknown = await this.ds.query(sql, allParams);
    const rowsArray = Array.isArray(rowsUnknown) ? rowsUnknown : [];
    return rowsArray.map(parseImpactRow);
  }
}
