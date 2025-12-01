import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['year', 'month'], { unique: true })
export class Storage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  year: number;

  @Column()
  month: number; // 0-11

  @Column({ type: 'jsonb' })
  payload: any; // { habits: Habit[], data: Record<string, Record<number, boolean>> }
}
