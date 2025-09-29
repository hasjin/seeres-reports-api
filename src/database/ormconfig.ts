import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Patch } from './entities/Patch';
import { ChampionPatchStats } from './entities/ChampionPatchStats';
import { BanPatchStats } from './entities/BanPatchStats';
import { PatchTotals } from './entities/PatchTotals';

export const getTypeOrmConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get<string>('db.host'),
  port: config.get<number>('db.port'),
  username: config.get<string>('db.user'),
  password: config.get<string>('db.password'),
  database: config.get<string>('db.database'),
  entities: [Patch, ChampionPatchStats, BanPatchStats, PatchTotals],
  synchronize: false, // DDL는 기존 DB 사용, 절대 true 금지
  logging: false,
});
