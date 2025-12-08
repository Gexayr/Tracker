import { Body, Controller, Get, Param, Put, UseGuards, Req } from '@nestjs/common';
import { StorageService } from './storage.service';
import { UpsertStorageDto } from './dto/upsert-storage.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':year/:month')
  async get(@Req() req: any, @Param('year') year: string, @Param('month') month: string) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const userId = req.user.sub as number;
    const record = await this.storageService.getForUser(userId, y, m);
    return record ? record : { year: y, month: m, payload: null };
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async upsert(@Req() req: any, @Body() dto: UpsertStorageDto) {
    const userId = req.user.sub as number;
    const saved = await this.storageService.upsertForUser(userId, dto);
    return { id: saved.id, year: saved.year, month: saved.month, payload: saved.payload };
  }
}
