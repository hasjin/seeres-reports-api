import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { PatchChampImpactQuery } from './dto/patch-champ-impact.query';
import { PatchChampImpactService } from './services/patch-champ-impact.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('reports')
@Controller('reports')
@UseInterceptors(CacheInterceptor)
export class ReportsController {
  constructor(private readonly patchSvc: PatchChampImpactService) {}

  @CacheTTL(120)
  @Get('patch-champ-impact')
  async patchImpact(@Query() q: PatchChampImpactQuery) {
    return this.patchSvc.run(q);
  }
}
