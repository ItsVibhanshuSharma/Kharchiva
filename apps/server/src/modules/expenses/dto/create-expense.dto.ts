import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export enum ExpenseType {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
}

export enum ExpenseSource {
  MANUAL = 'MANUAL',
  QUICK = 'QUICK',
  RECURRING = 'RECURRING',
  VOICE = 'VOICE',
  RECEIPT = 'RECEIPT',
}

export class CreateExpenseDto {
  @IsUUID()
  clientId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountPaise!: number;

  @Transform(({ value }) => value ?? 'INR')
  @IsIn(['INR'])
  currency = 'INR';

  @IsMongoId()
  categoryId!: string;

  @IsOptional()
  @IsMongoId()
  paymentSourceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 160)
  merchant?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  note?: string;

  @Transform(({ value }) => value ?? ExpenseType.PERSONAL)
  @IsEnum(ExpenseType)
  type: ExpenseType = ExpenseType.PERSONAL;

  @IsDateString({ strict: true })
  expenseDate!: string;

  @Transform(({ value }) => value ?? ExpenseSource.MANUAL)
  @IsEnum(ExpenseSource)
  source: ExpenseSource = ExpenseSource.MANUAL;
}
