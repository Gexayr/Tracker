import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @MaxLength(8192)
  @IsNotEmpty({ message: 'idToken is required' })
  @IsString({ message: 'idToken is required' })
  idToken: string;
}
