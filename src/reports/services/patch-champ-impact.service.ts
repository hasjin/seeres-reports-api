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

  async run(q: PatchChampImpactQuery): Promise<PatchChampImpactRow[]> {
    if (q.queue === undefined || q.queue === null) {
      throw new BadRequestException('queue is required');
    }

    const baseline = q.baseline ?? 'prev';
    const prevPatchQuery =
      baseline === 'major-minor-prev' ? prevMajorMinorPatchSql : prevPatchSql;

    // 1) 기준(base) 패치 계산
    const prevRowsUnknown: unknown = await this.ds.query(prevPatchQuery, [
      q.patch,
    ]);
    const prevRows: PrevPatchRow[] = Array.isArray(prevRowsUnknown)
      ? prevRowsUnknown.filter(isPrevPatchRow)
      : [];
    const basePatch: string | null = prevRows[0]?.patch ?? null;

    // 2) 공통 파라미터
    const currPatch = q.patch;
    const queue = q.queue;
    const limit = q.limit ?? 9999;
    const offset = q.offset ?? 0;

    // 3) 핵심 SQL (큐 포함 MV)
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

    // 4) 타입 안전한 파라미터
    type SqlParam = string | number | null;
    const params: SqlParam[] = [
      currPatch,
      basePatch, // null일 수도 있으므로 null 허용
      queue,
      limit,
      offset,
    ];

    // 5) 실행 + 런타임 파싱
    const rowsUnknown: unknown = await this.ds.query(sql, params);
    const rowsArray = Array.isArray(rowsUnknown) ? rowsUnknown : [];
    return rowsArray.map(parseImpactRow);
  }
}
