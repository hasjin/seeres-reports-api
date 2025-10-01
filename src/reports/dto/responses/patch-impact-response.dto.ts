import { ApiProperty } from '@nestjs/swagger';
import { GraphMetadataDto } from './graph-metadata.dto';

/**
 * 패치 통계 데이터
 */
export class PatchStatsDto {
  @ApiProperty({
    description: '게임 수',
    example: 1500,
  })
  games: number;

  @ApiProperty({
    description: '승리 수',
    example: 780,
  })
  wins: number;

  @ApiProperty({
    description: '승률 (0-1)',
    example: 0.52,
  })
  winRate: number;

  @ApiProperty({
    description: '픽률 (0-1)',
    example: 0.15,
  })
  pickRate: number;

  @ApiProperty({
    description: '밴률 (0-1)',
    example: 0.05,
  })
  banRate: number;

  @ApiProperty({
    description: '승률 (백분율)',
    example: 52.0,
  })
  winRatePercent: number;

  @ApiProperty({
    description: '픽률 (백분율)',
    example: 15.0,
  })
  pickRatePercent: number;

  @ApiProperty({
    description: '밴률 (백분율)',
    example: 5.0,
  })
  banRatePercent: number;
}

/**
 * 통계 변화량
 */
export class StatsChangeDto {
  @ApiProperty({
    description: '승률 변화',
    example: 0.03,
  })
  winRate: number;

  @ApiProperty({
    description: '픽률 변화',
    example: 0.05,
  })
  pickRate: number;

  @ApiProperty({
    description: '밴률 변화',
    example: 0.02,
  })
  banRate: number;

  @ApiProperty({
    description: '승률 변화 (백분율 포인트)',
    example: 3.0,
  })
  winRatePercent: number;

  @ApiProperty({
    description: '픽률 변화 (백분율 포인트)',
    example: 5.0,
  })
  pickRatePercent: number;

  @ApiProperty({
    description: '밴률 변화 (백분율 포인트)',
    example: 2.0,
  })
  banRatePercent: number;
}

/**
 * 임팩트 등급
 */
export type ImpactTier = 'very-high' | 'high' | 'medium' | 'low' | 'very-low';

/**
 * 챔피언 임팩트 데이터
 */
export class ChampionImpactDto {
  @ApiProperty({
    description: '챔피언 ID',
    example: 266,
  })
  championId: number;

  @ApiProperty({
    description: '현재 패치 통계',
    type: PatchStatsDto,
  })
  current: PatchStatsDto;

  @ApiProperty({
    description: '변화량 (델타)',
    type: StatsChangeDto,
  })
  delta: StatsChangeDto;

  @ApiProperty({
    description: '임팩트 점수 (0-100)',
    example: 75.5,
  })
  impactScore: number;

  @ApiProperty({
    description: '임팩트 등급',
    example: 'high',
    enum: ['very-high', 'high', 'medium', 'low', 'very-low'],
  })
  impactTier: ImpactTier;
}

/**
 * 임팩트 통계 요약
 */
export class ImpactSummaryDto {
  @ApiProperty({
    description: '총 챔피언 수',
    example: 165,
  })
  totalChampions: number;

  @ApiProperty({
    description: '버프된 챔피언 수 (승률 상승)',
    example: 45,
  })
  buffedChampions: number;

  @ApiProperty({
    description: '너프된 챔피언 수 (승률 하락)',
    example: 38,
  })
  nerfedChampions: number;

  @ApiProperty({
    description: '가장 큰 승률 상승',
    example: 0.08,
  })
  maxWinRateIncrease: number;

  @ApiProperty({
    description: '가장 큰 승률 하락',
    example: -0.06,
  })
  maxWinRateDecrease: number;

  @ApiProperty({
    description: '평균 승률 변화',
    example: 0.005,
  })
  avgWinRateChange: number;

  @ApiProperty({
    description: '가장 큰 픽률 변화',
    example: 0.12,
  })
  maxPickRateChange: number;

  @ApiProperty({
    description: '메타 변화 정도 (0-100)',
    example: 45.5,
  })
  metaShiftScore: number;
}

/**
 * 패치 챔피언 임팩트 응답 DTO
 */
export class PatchImpactResponseDto {
  @ApiProperty({
    description: '현재 패치 버전',
    example: '15.19',
  })
  currentPatch: string;

  @ApiProperty({
    description: '기준 패치 버전',
    example: '15.18',
  })
  basePatch: string;

  @ApiProperty({
    description: '큐 타입',
    example: 420,
  })
  queue: number;

  @ApiProperty({
    description: '챔피언별 임팩트 데이터',
    type: [ChampionImpactDto],
  })
  champions: ChampionImpactDto[];

  @ApiProperty({
    description: '그래프 메타데이터',
    type: GraphMetadataDto,
  })
  graphMetadata: GraphMetadataDto;

  @ApiProperty({
    description: '임팩트 통계 요약',
    type: ImpactSummaryDto,
  })
  summary: ImpactSummaryDto;
}
