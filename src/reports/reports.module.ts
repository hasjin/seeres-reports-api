import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { PatchChampImpactService } from './services/patch-champ-impact.service';
import { ChampionTrendController } from './controllers/champion-trend.controller';
import { ChampionTrendService } from './services/champion-trend.service';
import { ChampionsController } from './controllers/champions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [
    ReportsController,
    ChampionTrendController,
    ChampionsController,
  ],
  providers: [PatchChampImpactService, ChampionTrendService],
})
export class ReportsModule {}
