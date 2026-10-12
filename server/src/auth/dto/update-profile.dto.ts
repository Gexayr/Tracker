import { IsIn, IsOptional } from 'class-validator';

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export class UpdateProfileDto {
  @IsIn(SUPPORTED_LOCALES, {
    message: `locale must be one of: ${SUPPORTED_LOCALES.join(', ')}`,
  })
  @IsOptional()
  locale?: Locale;
}
