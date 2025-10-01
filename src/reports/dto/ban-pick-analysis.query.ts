import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  Matches,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 밴/픽률 분석 쿼리 DTO
 * 지역, 티어, 라인별로 세분화된 챔피언 통계 조회
 */
export class BanPickAnalysisQuery {
  @ApiProperty({
    description: '패치 버전 (형식: X.Y 또는 X.Y.Z)',
    example: '15.19',
    required: true,
  })
  @IsString()
  @Matches(/^\d+\.\d+(\.\d+)?$/, {
    message: 'Patch must be in format X.Y or X.Y.Z (e.g., 15.19 or 15.19.1)',
  })
  patch!: string;

  @ApiProperty({
    description: '큐 타입 (420: 솔로랭크, 440: 자유랭크, 450: 칼바람 등)',
    example: 420,
    required: true,
    minimum: 0,
    maximum: 9999,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Queue must be a non-negative integer' })
  @Max(9999, { message: 'Queue must be less than 10000' })
  queue!: number;

  @ApiProperty({
    description: '지역 코드 (kr, na, euw, eune, br, jp, lan, las, oce, ru, tr)',
    example: 'kr',
    required: false,
    enum: ['kr', 'na', 'euw', 'eune', 'br', 'jp', 'lan', 'las', 'oce', 'ru', 'tr', 'all'],
  })
  @IsOptional()
  @IsIn(['kr', 'na', 'euw', 'eune', 'br', 'jp', 'lan', 'las', 'oce', 'ru', 'tr', 'all'])
  region?: string;

  @ApiProperty({
    description: '티어 (IRON, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER, GRANDMASTER, CHALLENGER)',
    example: 'PLATINUM',
    required: false,
    enum: [
      'IRON',
      'BRONZE',
      'SILVER',
      'GOLD',
      'PLATINUM',
      'EMERALD',
      'DIAMOND',
      'MASTER',
      'GRANDMASTER',
      'CHALLENGER',
      'all',
    ],
  })
  @IsOptional()
  @IsIn([
    'IRON',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'EMERALD',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'CHALLENGER',
    'all',
  ])
  tier?: string;

  @ApiProperty({
    description: '라인/역할 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)',
    example: 'MIDDLE',
    required: false,
    enum: ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY', 'all'],
  })
  @IsOptional()
  @IsIn(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY', 'all'])
  role?: string;

  @ApiProperty({
    description: '정렬 기준 (pickRate, banRate, winRate, games)',
    example: 'pickRate',
    required: false,
    default: 'pickRate',
    enum: ['pickRate', 'banRate', 'winRate', 'games'],
  })
  @IsOptional()
  @IsIn(['pickRate', 'banRate', 'winRate', 'games'])
  sortBy?: 'pickRate' | 'banRate' | 'winRate' | 'games';

  @ApiProperty({
    description: '정렬 순서 (desc: 내림차순, asc: 오름차순)',
    example: 'desc',
    required: false,
    default: 'desc',
    enum: ['desc', 'asc'],
  })
  @IsOptional()
  @IsIn(['desc', 'asc'])
  sortOrder?: 'desc' | 'asc';

  @ApiProperty({
    description: '결과 개수 제한',
    example: 50,
    required: false,
    default: 100,
    minimum: 1,
    maximum: 500,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(500, { message: 'Limit cannot exceed 500' })
  limit?: number;

  @ApiProperty({
    description: '결과 오프셋 (페이지네이션용)',
    example: 0,
    required: false,
    default: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0, { message: 'Offset must be non-negative' })
  offset?: number;

  @ApiProperty({
    description: '최소 게임 수 (해당 게임 수 이상만 포함)',
    example: 30,
    required: false,
    default: 30,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Minimum games must be at least 1' })
  minGames?: number;
}
