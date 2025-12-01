import { IsInt, IsObject, Max, Min } from 'class-validator';

export class UpsertStorageDto {
  @IsInt()
  year: number;

  @IsInt()
  @Min(0)
  @Max(11)
  month: number;

  @IsObject()
  payload: any;
}
