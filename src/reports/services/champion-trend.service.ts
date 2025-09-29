// src/reports/services/champion-trend.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ChampionTrendQuery = {
  championId: number;
  queue: number;
  upto: string;
  n: number;
};

export type ChampionTrendPoint = {
  patch: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
};

type TrendRow = {
  patch: unknown;
  games: unknown;
  wins: unknown;
  winRate: unknown;
  pickRate: unknown;
};

function isTrendRow(r: unknown): r is TrendRow {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  const isNumLike = (v: unknown) =>
    typeof v === 'number' || typeof v === 'string';
  return (
    typeof o.patch === 'string' &&
    isNumLike(o.games) &&
    isNumLike(o.wins) &&
    isNumLike(o.winRate) &&
    isNumLike(o.pickRate)
  );
}

function toPoint(r: TrendRow): ChampionTrendPoint {
  return {
    patch: String(r.patch),
    games: Number(r.games ?? 0),
    wins: Number(r.wins ?? 0),
    winRate: Number(r.winRate ?? 0),
    pickRate: Number(r.pickRate ?? 0),
  };
}

@Injectable()
export class ChampionTrendService {
  constructor(private readonly ds: DataSource) {}

  async run(q: ChampionTrendQuery): Promise<ChampionTrendPoint[]> {
    const sql = `
      WITH t AS (
        SELECT
          p.patch,
          p.released_at,
          COALESCE(NULLIF(split_part(p.patch,'.',1),''),'0')::int AS maj,
          COALESCE(NULLIF(split_part(p.patch,'.',2),''),'0')::int AS min,
          COALESCE(NULLIF(split_part(p.patch,'.',3),''),'0')::int AS rev
        FROM patches p
        WHERE p.patch = $3
        LIMIT 1
      ),
      plist AS (
        SELECT
          p.patch,
          p.released_at,
          COALESCE(NULLIF(split_part(p.patch,'.',1),''),'0')::int AS maj,
          COALESCE(NULLIF(split_part(p.patch,'.',2),''),'0')::int AS min,
          COALESCE(NULLIF(split_part(p.patch,'.',3),''),'0')::int AS rev
        FROM patches p
      )
      SELECT
        pl.patch,
        COALESCE(cps.games,0) AS games,
        COALESCE(cps.wins,0)  AS wins,
        (COALESCE(cps.wins,0)::numeric / NULLIF(COALESCE(cps.games,0),0))::float AS "winRate",
        (COALESCE(cps.games,0)::numeric / NULLIF(pt.total_games,0))::float      AS "pickRate"
      FROM plist pl
      CROSS JOIN t
      LEFT JOIN champion_patch_stats_q cps
        ON cps.patch = pl.patch AND cps.champion_id = $1 AND cps.queue = $2
      LEFT JOIN patch_totals_q pt
        ON pt.patch = pl.patch AND pt.queue = $2
      WHERE
        CASE
          WHEN t.released_at IS NOT NULL AND pl.released_at IS NOT NULL
            THEN pl.released_at <= t.released_at
          ELSE (pl.maj, pl.min, pl.rev) <= (t.maj, t.min, t.rev)
        END
      ORDER BY
        (pl.released_at IS NULL), pl.released_at DESC, pl.maj DESC, pl.min DESC, pl.rev DESC
      LIMIT $4
    `;

    const params = [q.championId, q.queue, q.upto, q.n] as const;
    const raw: unknown = await this.ds.query(sql, [...params]);
    return Array.isArray(raw) ? raw.filter(isTrendRow).map(toPoint) : [];
  }
}
