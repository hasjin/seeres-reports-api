import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type Champion = {
  id: number;
  key: string;
  name: string;
};

type DbChampionRow = {
  id: unknown;
  key: unknown;
  name: unknown;
};

const toInt = (v: unknown): number =>
  typeof v === 'number' ? v : Number.parseInt(String(v), 10);

const asText = (v: unknown): string => (typeof v === 'string' ? v : '');

function parseChampionRow(r: DbChampionRow): Champion {
  return {
    id: toInt(r.id),
    key: asText(r.key),
    name: asText(r.name),
  };
}

@Injectable()
export class ChampionsService {
  constructor(private readonly ds: DataSource) {}

  async list(lang: string): Promise<Champion[]> {
    const sql = `
      SELECT
        c.champion_id AS id,
        COALESCE(c.key, '')::text AS key,
        COALESCE(l.name, c.name)::text AS name
      FROM champions c
      LEFT JOIN champion_l10n l
        ON l.champion_id = c.champion_id AND l.lang = $1
      ORDER BY c.champion_id
    `;

    const rowsUnknown: unknown = await this.ds.query(sql, [lang] as const);
    const rows = Array.isArray(rowsUnknown)
      ? (rowsUnknown as DbChampionRow[])
      : [];
    return rows.map(parseChampionRow);
  }
}
