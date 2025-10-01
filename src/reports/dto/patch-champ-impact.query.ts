import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PatchChampImpactQuery {
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
    description: '기준 패치 선택 방식',
    example: 'prev',
    enum: ['prev', 'major-minor-prev'],
    required: false,
    default: 'prev',
  })
  @IsIn(['prev', 'major-minor-prev'])
  @IsOptional()
  baseline?: 'prev' | 'major-minor-prev';

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
    description: '결과 개수 제한',
    example: 50,
    required: false,
    default: 9999,
    minimum: 1,
    maximum: 9999,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(9999, { message: 'Limit cannot exceed 9999' })
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
    description:
      '지역 필터 (kr, na, euw, eune, br, lan, las, oce, ru, tr, jp, ph, sg, th, tw, vn)',
    example: 'kr',
    required: false,
  })
  @IsOptional()
  @IsIn([
    'kr',
    'na',
    'euw',
    'eune',
    'br',
    'lan',
    'las',
    'oce',
    'ru',
    'tr',
    'jp',
    'ph',
    'sg',
    'th',
    'tw',
    'vn',
    'all',
  ])
  region?: string;

  @ApiProperty({
    description:
      '티어 필터 (IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER)',
    example: 'PLATINUM',
    required: false,
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
    description: '라인 필터 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)',
    example: 'MIDDLE',
    required: false,
  })
  @IsOptional()
  @IsIn(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY', 'all'])
  role?: string;
}
