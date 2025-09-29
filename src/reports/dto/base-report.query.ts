import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BaseReportQuery extends PaginationDto {
  @IsString()
  patch!: string; // e.g., '15.19'

  @IsOptional()
  @IsString()
  region?: string; // e.g., 'asia'

  @IsOptional()
  @IsString()
  platform?: string; // e.g., 'kr'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  queue?: number; // e.g., 420

  @IsOptional()
  @IsString()
  baseline?: 'prev' | 'major-minor-prev'; // 기본 'prev'
}
