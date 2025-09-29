import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'patch_totals' })
export class PatchTotals {
  @PrimaryColumn({ type: 'text' })
  patch!: string;

  @Column({ type: 'int' })
  total_games!: number;

  @Column({ type: 'int' })
  total_wins!: number;
}
