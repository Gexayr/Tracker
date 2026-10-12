import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../users/email.util';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @MaxLength(255)
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @MaxLength(128)
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password is required' })
  password: string;
}
