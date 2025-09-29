import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'patches' })
export class Patch {
  @PrimaryColumn({ type: 'text' })
  patch!: string;

  @Column({ type: 'date', nullable: true })
  released_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  major_minor!: string | null;
}
