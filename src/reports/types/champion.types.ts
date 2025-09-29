// src/reports/types/champion.types.ts
export interface ChampionRow {
  id: number;
  en: string;
  ko: string;
  key: string | null;
}

export function toChampionRow(u: unknown): ChampionRow | null {
  if (!u || typeof u !== 'object') return null;
  const r = u as Record<string, unknown>;

  const idNum =
    typeof r.id === 'number'
      ? r.id
      : typeof r.id === 'string' && r.id.trim() !== ''
        ? Number(r.id)
        : NaN;
  if (!Number.isFinite(idNum)) return null;

  const en = typeof r.en === 'string' ? r.en : '';
  const ko = typeof r.ko === 'string' ? r.ko : en;

  const key = typeof r.key === 'string' ? r.key : null;

  return { id: idNum, en, ko, key };
}
