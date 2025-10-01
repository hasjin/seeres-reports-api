import { ApiProperty } from '@nestjs/swagger';
import { GraphMetadataDto } from './graph-metadata.dto';

/**
 * 챔피언 트렌드 데이터 포인트
 */
export class ChampionTrendPointDto {
  @ApiProperty({
    description: '패치 버전',
    example: '15.19',
  })
  patch: string;

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
    description: '승률 (백분율)',
    example: 52.0,
  })
  winRatePercent: number;

  @ApiProperty({
    description: '픽률 (백분율)',
    example: 15.0,
  })
  pickRatePercent: number;
}

/**
 * 트렌드 통계 요약
 */
export class TrendSummaryDto {
  @ApiProperty({
    description: '평균 승률',
    example: 0.515,
  })
  avgWinRate: number;

  @ApiProperty({
    description: '평균 픽률',
    example: 0.12,
  })
  avgPickRate: number;

  @ApiProperty({
    description: '최고 승률',
    example: 0.54,
  })
  maxWinRate: number;

  @ApiProperty({
    description: '최저 승률',
    example: 0.49,
  })
  minWinRate: number;

  @ApiProperty({
    description: '승률 변동폭',
    example: 0.05,
  })
  winRateVolatility: number;

  @ApiProperty({
    description: '최근 트렌드 방향',
    example: 'up',
    enum: ['up', 'down', 'stable'],
  })
  recentTrend: 'up' | 'down' | 'stable';

  @ApiProperty({
    description: '총 게임 수',
    example: 15000,
  })
  totalGames: number;
}

/**
 * 챔피언 트렌드 응답 DTO
 */
export class ChampionTrendResponseDto {
  @ApiProperty({
    description: '챔피언 ID',
    example: 266,
  })
  championId: number;

  @ApiProperty({
    description: '큐 타입',
    example: 420,
  })
  queue: number;

  @ApiProperty({
    description: '트렌드 데이터 포인트 목록',
    type: [ChampionTrendPointDto],
  })
  trends: ChampionTrendPointDto[];

  @ApiProperty({
    description: '그래프 메타데이터',
    type: GraphMetadataDto,
  })
  graphMetadata: GraphMetadataDto;

  @ApiProperty({
    description: '통계 요약',
    type: TrendSummaryDto,
  })
  summary: TrendSummaryDto;
}
