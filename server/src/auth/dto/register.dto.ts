import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail } from '../../users/email.util';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @MaxLength(255)
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  // Decorators run bottom-up; with stopAtFirstError the bottom-most check reports first.
  @MaxLength(128, { message: 'Password must be at most 128 characters long' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsString({ message: 'Password is required' })
  password: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MaxLength(100)
  @IsString()
  name?: string | null;
}
