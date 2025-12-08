import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findAll() {
    return this.repo.find({ select: { id: true, email: true, name: true, createdAt: true, updatedAt: true } });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async create(user: { name?: string | null; email: string; password: string }) {
    const existing = await this.findByEmail(user.email);
    if (existing) {
      throw new Error('Email already in use');
    }
    const passwordHash = await bcrypt.hash(user.password, 10);
    const entity = this.repo.create({
      email: user.email,
      name: user.name ?? null,
      passwordHash,
    });
    const saved = await this.repo.save(entity);
    // Do not return passwordHash
    const { passwordHash: _, ...safe } = saved as any;
    return safe;
  }

  async upsertOAuthUser(email: string, name?: string | null) {
    const existing = await this.findByEmail(email);
    if (existing) {
      // Update name if newly provided and previously null
      if (!existing.name && name) {
        existing.name = name;
        await this.repo.save(existing);
      }
      const { passwordHash: _, ...safe } = existing as any;
      return safe;
    }
    const entity = this.repo.create({ email, name: name ?? null, passwordHash: null });
    const saved = await this.repo.save(entity);
    const { passwordHash: _, ...safe } = saved as any;
    return safe;
  }
}