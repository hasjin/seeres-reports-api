import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PatchChampImpactQuery {
  @IsString()
  patch!: string;

  @IsIn(['prev', 'major-minor-prev'])
  @IsOptional()
  baseline?: 'prev' | 'major-minor-prev';

  @Type(() => Number)
  @IsInt()
  queue!: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  offset?: number;
}
