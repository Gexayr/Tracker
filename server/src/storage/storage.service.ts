import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Storage } from './storage.entity';
import { UpsertStorageDto } from './dto/upsert-storage.dto';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private repo: Repository<Storage>,
  ) {}

  async get(year: number, month: number): Promise<Storage | null> {
    return this.repo.findOne({ where: { year, month } });
  }

  async upsert(dto: UpsertStorageDto): Promise<Storage> {
    const existing = await this.get(dto.year, dto.month);
    if (existing) {
      existing.payload = dto.payload;
      // Save a single entity
      return await this.repo.save(existing);
    }
    // Create a single entity explicitly (not an array)
    const created = this.repo.create(dto as DeepPartial<Storage>);
    return await this.repo.save(created);
  }
}
