import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string | null;

  /** Preferred UI language ('en' | 'ru'); null = client decides. */
  @Column({ type: 'varchar', length: 8, nullable: true })
  locale?: string | null;

  /** Tokens issued before this moment are rejected; null = no revocation. */
  @Column({ type: 'timestamptz', nullable: true })
  sessionsValidAfter?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
