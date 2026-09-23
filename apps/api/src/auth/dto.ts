import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SetupDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class LoginDto extends SetupDto {}
