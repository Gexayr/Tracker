import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Raw, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './users.entity';
import { normalizeEmail } from './email.util';

export type SafeUser = Omit<User, 'passwordHash'>;

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof QueryFailedError &&
    (e.driverError as { code?: string } | undefined)?.code ===
      PG_UNIQUE_VIOLATION
  );
}

export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  /**
   * Case-insensitive lookup. New rows are always stored normalized, but LOWER()
   * also matches any legacy rows that were stored with mixed case.
   */
  findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    return this.repo.findOne({
      where: {
        email: Raw((alias) => `LOWER(${alias}) = :email`, {
          email: normalized,
        }),
      },
    });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Updates UI preferences; returns false if the user does not exist. */
  async updatePreferences(
    id: number,
    patch: { locale?: string | null },
  ): Promise<boolean> {
    if (patch.locale === undefined) {
      return (await this.repo.count({ where: { id } })) > 0;
    }
    const result = await this.repo.update({ id }, { locale: patch.locale });
    return (result.affected ?? 0) > 0;
  }

  async create(user: {
    name?: string | null;
    email: string;
    password: string;
  }): Promise<SafeUser> {
    const email = normalizeEmail(user.email);
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const passwordHash = await bcrypt.hash(user.password, 10);
    const entity = this.repo.create({
      email,
      name: user.name || null,
      passwordHash,
    });
    try {
      const saved = await this.repo.save(entity);
      return toSafeUser(saved);
    } catch (e) {
      // Concurrent registration with the same email
      if (isUniqueViolation(e))
        throw new ConflictException('Email already in use');
      throw e;
    }
  }

  async upsertOAuthUser(
    rawEmail: string,
    name?: string | null,
  ): Promise<SafeUser> {
    const email = normalizeEmail(rawEmail);
    const existing = await this.findByEmail(email);
    if (existing) {
      let changed = false;
      if (existing.passwordHash) {
        // Emails are not verified at registration, so whoever set this password
        // may not own the address. Google just proved ownership: drop the
        // password and revoke every token issued for it (pre-hijack defence).
        existing.passwordHash = null;
        existing.sessionsValidAfter = new Date();
        changed = true;
      }
      // Update name if newly provided and previously null
      if (!existing.name && name) {
        existing.name = name.slice(0, 255);
        changed = true;
      }
      if (changed) await this.repo.save(existing);
      return toSafeUser(existing);
    }
    const entity = this.repo.create({
      email,
      name: name ? name.slice(0, 255) : null,
      passwordHash: null,
    });
    try {
      const saved = await this.repo.save(entity);
      return toSafeUser(saved);
    } catch (e) {
      // Lost a race with a concurrent sign-in for the same email: use the winner's row
      if (isUniqueViolation(e)) {
        const winner = await this.findByEmail(email);
        if (winner) return toSafeUser(winner);
      }
      throw e;
    }
  }
}
