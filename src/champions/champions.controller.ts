import { Controller, Get, Query } from '@nestjs/common';
import { ChampionsService } from './champions.service';

@Controller('api/champions')
export class ChampionsController {
  constructor(private readonly svc: ChampionsService) {}

  @Get()
  async list(@Query('lang') lang = 'en') {
    return this.svc.list(lang);
  }
}
