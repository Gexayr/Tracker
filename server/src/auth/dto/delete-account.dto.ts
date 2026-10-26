import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  // Only required when the account has a password (see AuthService.deleteAccount) —
  // Google-only accounts have nothing to check it against.
  @MaxLength(128)
  @IsString()
  @IsOptional()
  password?: string;
}
