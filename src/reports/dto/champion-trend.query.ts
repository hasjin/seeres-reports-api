import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChampionTrendQuery {
  @ApiProperty({
    description: '챔피언 ID',
    example: 266,
    required: true,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Champion ID must be at least 1' })
  championId!: number;

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
    description: '기준 패치 버전 (이 패치까지의 데이터 조회)',
    example: '15.19',
    required: true,
  })
  @IsString()
  @Matches(/^\d+\.\d+(\.\d+)?$/, {
    message: 'Patch must be in format X.Y or X.Y.Z (e.g., 15.19 or 15.19.1)',
  })
  upto!: string;

  @ApiProperty({
    description: '조회할 패치 개수',
    example: 12,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  n = 10;
}
