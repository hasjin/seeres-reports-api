// src/reports/types/db.types.ts
import type { PatchChampImpactRow } from '../models/patch-champ-impact.model';

/** SELECT 1 FROM ... exists 체크 결과 */
export type ExistsRow = { exists: boolean };

/** 이전 패치를 조회하는 prevPatch 쿼리 결과 */
export type PrevPatchRow = { patch: string | null };

/** patch-champ-impact 주 쿼리의 DB 반환 컬럼 */
export type ImpactDbRow = {
  championId: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  dWinRate: number;
  dPickRate: number;
  dBanRate: number;
};

/* ---------------------------------- */
/* 타입 가드                           */
/* ---------------------------------- */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export function isExistsRow(v: unknown): v is ExistsRow {
  return isRecord(v) && typeof v.exists === 'boolean';
}

export function isPrevPatchRow(v: unknown): v is PrevPatchRow {
  return (
    isRecord(v) &&
    'patch' in v &&
    (v.patch === null || typeof v.patch === 'string')
  );
}

function asNumber(x: unknown, name: string): number {
  const n = typeof x === 'string' ? Number(x) : x;
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new TypeError(`Invalid number for ${name}: ${String(x)}`);
  }
  return n;
}

function asInt(x: unknown, name: string): number {
  const n = asNumber(x, name);
  return (n | 0) === n ? n : Math.trunc(n);
}

/* ---------------------------------- */
/* 런타임 파서 → 강타입 도메인 모델     */
/* ---------------------------------- */

export function parseImpactRow(u: unknown): PatchChampImpactRow {
  if (!isRecord(u)) throw new TypeError('Row is not an object');

  return {
    championId: asInt(u.championId, 'championId'),
    games: asInt(u.games, 'games'),
    wins: asInt(u.wins, 'wins'),
    winRate: asNumber(u.winRate, 'winRate'),
    pickRate: asNumber(u.pickRate, 'pickRate'),
    banRate: asNumber(u.banRate, 'banRate'),
    dWinRate: asNumber(u.dWinRate, 'dWinRate'),
    dPickRate: asNumber(u.dPickRate, 'dPickRate'),
    dBanRate: asNumber(u.dBanRate, 'dBanRate'),
  };
}
