import { Matches } from 'class-validator';

export class RequestOtpDto {
  @Matches(/^\+91[6-9]\d{9}$/)
  phoneNumber!: string;
}
