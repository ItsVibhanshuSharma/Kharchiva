import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_AMOUNT_PAISE, SplitType } from '../split.util';

export class PayerDto {
  @IsMongoId()
  memberId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_PAISE)
  amountPaise!: number;
}

export class SplitEntryDto {
  @IsMongoId()
  memberId!: string;

  /** EXACT: paise. PERCENT: basis points (10000 = 100%). Ignored for EQUAL. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AMOUNT_PAISE)
  value?: number;
}

/** Body used to replace an expense. Edits send the whole expense again. */
export class GroupExpenseBodyDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_PAISE)
  amountPaise!: number;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  categoryKey?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  note?: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  receiptKey?: string;

  @IsDateString({ strict: true })
  expenseDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PayerDto)
  payers!: PayerDto[];

  @IsEnum(SplitType)
  splitType!: SplitType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits!: SplitEntryDto[];
}

export class CreateGroupExpenseDto extends GroupExpenseBodyDto {
  @IsUUID()
  clientId!: string;
}

export class CreateSettlementDto {
  @IsUUID()
  clientId!: string;

  @IsMongoId()
  fromMemberId!: string;

  @IsMongoId()
  toMemberId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_PAISE)
  amountPaise!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  settledAt?: string;
}

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @IsOptional()
  @IsMongoId()
  cursor?: string;
}
