import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { StorageService } from './storage.service';
import { UpsertStorageDto } from './dto/upsert-storage.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':year/:month')
  async get(@Param('year') year: string, @Param('month') month: string) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const record = await this.storageService.get(y, m);
    return record ? record : { year: y, month: m, payload: null };
  }

  @Put()
  async upsert(@Body() dto: UpsertStorageDto) {
    const saved = await this.storageService.upsert(dto);
    return { id: saved.id, year: saved.year, month: saved.month, payload: saved.payload };
  }
}
