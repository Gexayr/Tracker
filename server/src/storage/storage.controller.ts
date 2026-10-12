import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { UpsertStorageDto } from './dto/upsert-storage.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MAX_YEAR, MIN_YEAR } from './storage.constants';

const intPipe = (name: string) =>
  new ParseIntPipe({
    exceptionFactory: () =>
      new BadRequestException(`${name} must be an integer`),
  });

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':year/:month')
  async get(
    @Req() req: { user: { sub: number } },
    @Param('year', intPipe('year')) year: number,
    @Param('month', intPipe('month')) month: number,
  ) {
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException(
        `year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
      );
    }
    if (month < 0 || month > 11) {
      throw new BadRequestException('month must be between 0 and 11');
    }
    const record = await this.storageService.getForUser(
      req.user.sub,
      year,
      month,
    );
    return record
      ? {
          id: record.id,
          year: record.year,
          month: record.month,
          payload: record.payload,
        }
      : { year, month, payload: null };
  }

  @Put()
  async upsert(
    @Req() req: { user: { sub: number } },
    @Body() dto: UpsertStorageDto,
  ) {
    return this.storageService.upsertForUser(req.user.sub, dto);
  }
}
