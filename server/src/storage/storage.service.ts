import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Storage } from './storage.entity';
import { UpsertStorageDto } from './dto/upsert-storage.dto';
import { DEFAULT_HABITS, Habit, HabitPayload } from './storage.constants';

export interface StorageRecord {
  id: number;
  year: number;
  month: number;
  payload: HabitPayload;
}

function hasCorePayload(payload: unknown): payload is HabitPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as HabitPayload).habits !== 'undefined' &&
    typeof (payload as HabitPayload).data !== 'undefined'
  );
}

function toRecord(s: Storage): StorageRecord {
  return {
    id: s.id,
    year: s.year,
    month: s.month,
    payload: s.payload,
  };
}

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(Storage)
    private repo: Repository<Storage>,
  ) {}

  async getForUser(
    userId: number,
    year: number,
    month: number,
  ): Promise<Storage | null> {
    return this.repo.findOne({ where: { userId, year, month } });
  }

  /** All stored months of a year for the user, sorted by month (0-11). */
  async getYearForUser(
    userId: number,
    year: number,
  ): Promise<{ year: number; month: number; payload: HabitPayload }[]> {
    const rows = await this.repo.find({
      where: { userId, year },
      order: { month: 'ASC' },
      select: { year: true, month: true, payload: true },
    });
    return rows.map((r) => ({
      year: r.year,
      month: r.month,
      payload: r.payload,
    }));
  }

  /**
   * Atomic insert-or-update on the (userId, year, month) unique constraint,
   * so concurrent PUTs for the same month cannot collide.
   */
  async upsertForUser(
    userId: number,
    dto: UpsertStorageDto,
  ): Promise<StorageRecord> {
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Storage)
      .values({
        userId,
        year: dto.year,
        month: dto.month,
        payload: dto.payload,
      })
      .orUpdate(['payload'], ['userId', 'year', 'month'])
      .returning(['id', 'year', 'month', 'payload'])
      .execute();
    const row = (result.raw as StorageRecord[])[0];
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      payload: row.payload,
    };
  }

  /**
   * Returns the user's record for the current month, creating it if missing.
   * A new month is seeded from the user's most recent earlier month (same habits,
   * empty completion data); brand-new users get the default habit list.
   * An existing payload with core fields is never overwritten.
   */
  async ensureCurrentMonth(userId: number): Promise<StorageRecord> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const record = await this.getForUser(userId, year, month);
    if (record && hasCorePayload(record.payload)) return toRecord(record);

    const payload = await this.buildSeedPayload(userId, year, month);

    if (record) {
      // Row exists but payload is missing/corrupt: repair it.
      return this.upsertForUser(userId, { year, month, payload });
    }

    // Insert only if still absent (a concurrent request may have created it).
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(Storage)
      .values({ userId, year, month, payload: payload })
      .orIgnore()
      .execute();
    const created = await this.getForUser(userId, year, month);
    return toRecord(created!);
  }

  private async buildSeedPayload(
    userId: number,
    year: number,
    month: number,
  ): Promise<HabitPayload> {
    const previous = await this.repo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('(s.year * 12 + s.month) < :ym', { ym: year * 12 + month })
      .orderBy('s.year', 'DESC')
      .addOrderBy('s.month', 'DESC')
      .limit(24)
      .getMany();

    const source = previous.find(
      (p) => hasCorePayload(p.payload) && Array.isArray(p.payload.habits),
    );
    const prevPayload = source?.payload;
    const habits: Habit[] = prevPayload ? prevPayload.habits : DEFAULT_HABITS;
    const chartType =
      typeof prevPayload?.chartType === 'string'
        ? prevPayload.chartType
        : 'line';

    const data: Record<string, Record<string, boolean>> = {};
    habits.forEach((h) => (data[String(h.id)] = {}));
    return { habits: habits.map((h) => ({ ...h })), data, chartType };
  }
}
