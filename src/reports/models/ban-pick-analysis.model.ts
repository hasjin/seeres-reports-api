/**
 * 밴/픽률 분석 결과 행
 */
export type BanPickAnalysisRow = {
  championId: number;
  games: number;
  wins: number;
  bans: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  region?: string;
  tier?: string;
  role?: string;
};

/**
 * 필터별 집계 결과
 */
export type BanPickAggregation = {
  filterType: 'region' | 'tier' | 'role';
  filterValue: string;
  totalGames: number;
  totalChampions: number;
  avgPickRate: number;
  avgBanRate: number;
  avgWinRate: number;
};
