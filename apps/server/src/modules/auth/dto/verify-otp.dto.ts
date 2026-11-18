import { IsUUID, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsUUID()
  requestId!: string;

  @Matches(/^\+91[6-9]\d{9}$/)
  phoneNumber!: string;

  @Matches(/^\d{6}$/)
  otp!: string;
}
