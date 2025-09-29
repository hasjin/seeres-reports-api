// src/reports/services/champion-trend.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChampionTrendQuery } from '../dto/champion-trend.query';

export type ChampionTrendPoint = {
  patch: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
};

type DbTrendRow = {
  patch: string;
  games: number;
  wins: number;
  winRate: number | null;
  pickRate: number | null;
};

function isDbTrendRow(v: unknown): v is DbTrendRow {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.patch === 'string' &&
    typeof o.games === 'number' &&
    typeof o.wins === 'number' &&
    (typeof o.winRate === 'number' || o.winRate === null) &&
    (typeof o.pickRate === 'number' || o.pickRate === null)
  );
}

@Injectable()
export class ChampionTrendService {
  constructor(private readonly ds: DataSource) {}

  async run(q: ChampionTrendQuery): Promise<ChampionTrendPoint[]> {
    const championId = q.championId;
    const queue = q.queue;
    const uptoPatch = q.upto;
    const limit = Math.max(1, Math.min(q.n ?? 12, 60));

    const sql = `
      WITH target AS (
        SELECT released_at FROM patches WHERE patch = $3
      )
      SELECT
        p.patch,
        COALESCE(cps.games, 0) AS games,
        COALESCE(cps.wins,  0) AS wins,
        COALESCE( (COALESCE(cps.wins,0)::numeric / NULLIF(COALESCE(cps.games,0),0)), 0 )::float AS "winRate",
        COALESCE( (COALESCE(cps.games,0)::numeric / NULLIF(pt.total_games,0)), 0 )::float      AS "pickRate"
      FROM patches p
      LEFT JOIN champion_patch_stats_q cps
        ON cps.patch = p.patch AND cps.champion_id = $1 AND cps.queue = $2
      LEFT JOIN patch_totals_q pt
        ON pt.patch = p.patch AND pt.queue = $2
      WHERE p.released_at <= (SELECT released_at FROM target)
      ORDER BY p.released_at DESC
      LIMIT $4
    `;

    const params = [championId, queue, uptoPatch, limit] as const;
    const mutableParams: (string | number)[] = [...params];

    const rowsUnknown: unknown = await this.ds.query(sql, mutableParams);
    const rowsArray = Array.isArray(rowsUnknown) ? rowsUnknown : [];

    const parsed: ChampionTrendPoint[] = rowsArray
      .filter(isDbTrendRow)
      .map((r) => ({
        patch: r.patch,
        games: r.games,
        wins: r.wins,
        winRate: r.winRate ?? 0,
        pickRate: r.pickRate ?? 0,
      }));

    return parsed.reverse();
  }
}
