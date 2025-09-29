import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ban_patch_stats' })
export class BanPatchStats {
  @PrimaryColumn({ type: 'text' })
  patch!: string;

  @PrimaryColumn({ type: 'int' })
  queue!: number;

  @PrimaryColumn({ type: 'int' })
  champion_id!: number;

  @Column({ type: 'int' })
  bans!: number;
}
