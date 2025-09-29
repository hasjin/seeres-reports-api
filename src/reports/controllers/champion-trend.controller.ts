// src/reports/controllers/champion-trend.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ChampionTrendService } from '../services/champion-trend.service';
import { SignedRequestGuard } from '../../security/signed-request.guard';

@Controller('champion-trend')
@UseGuards(SignedRequestGuard)
export class ChampionTrendController {
  constructor(private readonly svc: ChampionTrendService) {}

  @Get()
  async get(
    @Query('championId') championId: string,
    @Query('queue') queue: string,
    @Query('upto') upto: string,
    @Query('limit') limit = '12',
  ) {
    return this.svc.run({
      championId: Number(championId),
      queue: Number(queue),
      upto: String(upto),
      n: Number(limit) || 12,
    });
  }
}
