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
}
