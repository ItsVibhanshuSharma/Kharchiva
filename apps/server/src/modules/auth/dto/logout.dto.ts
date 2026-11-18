import { IsOptional, IsString, Length } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @Length(32, 256)
  refreshToken?: string;
}
