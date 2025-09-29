import { Controller, Get, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SignedRequestGuard } from '../../security/signed-request.guard';
import { ChampionRow, toChampionRow } from '../types/champion.types';

@Controller('champions')
@UseGuards(SignedRequestGuard)
export class ChampionsController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  async list(): Promise<ChampionRow[]> {
    const sql = `
      select
        c.champion_id as id,
        c.name        as en,
        coalesce(l.name, c.data->>'name_ko', c.name) as ko,
        c.champ_key   as key
      from champions c
             left join champion_l10n l
                       on l.champion_id = c.champion_id and l.lang = 'ko'
      order by c.champion_id
    `;

    const rowsUnknown: unknown = await this.ds.query(sql);
    const rows = Array.isArray(rowsUnknown) ? rowsUnknown : [];

    const out: ChampionRow[] = [];
    for (const u of rows) {
      const v = toChampionRow(u);
      if (v) out.push(v);
    }
    return out;
  }
}