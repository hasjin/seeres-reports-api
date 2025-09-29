import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ChampionTrendQuery {
  @IsInt() championId!: number;
  @IsInt() queue!: number;
  @IsString() upto!: string;
  @IsOptional() @IsInt() @Min(1) n = 10;
}
