import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'champion_patch_stats' })
export class ChampionPatchStats {
  @PrimaryColumn({ type: 'text' })
  patch!: string;

  @PrimaryColumn({ type: 'int' })
  queue!: number; // MV에 queue 포함 버전 가정

  @PrimaryColumn({ type: 'int' })
  champion_id!: number;

  @Column({ type: 'int' })
  games!: number;

  @Column({ type: 'int' })
  wins!: number;

  @Column({ type: 'float', nullable: true })
  winrate!: number | null;
}
