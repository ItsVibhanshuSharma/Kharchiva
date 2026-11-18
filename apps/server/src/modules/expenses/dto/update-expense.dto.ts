import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ExpenseSource, ExpenseType } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountPaise?: number;

  @IsOptional()
  @IsIn(['INR'])
  currency?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

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

  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @IsOptional()
  @IsEnum(ExpenseSource)
  source?: ExpenseSource;

  @IsOptional()
  @IsDateString({ strict: true })
  expenseDate?: string;
}
