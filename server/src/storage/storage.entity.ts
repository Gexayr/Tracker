import { Entity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
@Index(['userId', 'year', 'month'], { unique: true })
export class Storage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  year: number;

  @Column()
  month: number; // 0-11

  @Column({ type: 'jsonb' })
  payload: any; // { habits: Habit[], data: Record<string, Record<number, boolean>> }
}
