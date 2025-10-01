import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { PatchChampImpactService } from './services/patch-champ-impact.service';
import { ChampionTrendController } from './controllers/champion-trend.controller';
import { ChampionTrendService } from './services/champion-trend.service';
import { ChampionsController } from './controllers/champions.controller';
import { BanPickAnalysisController } from './controllers/ban-pick-analysis.controller';
import { BanPickAnalysisService } from './services/ban-pick-analysis.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [
    ReportsController,
    ChampionTrendController,
    ChampionsController,
    BanPickAnalysisController,
  ],
  providers: [
    PatchChampImpactService,
    ChampionTrendService,
    BanPickAnalysisService,
  ],
})
export class ReportsModule {}
