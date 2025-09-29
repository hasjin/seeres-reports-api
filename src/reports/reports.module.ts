import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { PatchChampImpactService } from './services/patch-champ-impact.service';

@Module({
  controllers: [ReportsController],
  providers: [PatchChampImpactService],
})
export class ReportsModule {}
