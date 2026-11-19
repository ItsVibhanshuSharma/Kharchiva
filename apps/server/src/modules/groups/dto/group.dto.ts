import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export const PHONE_PATTERN = /^\+91[6-9]\d{9}$/;

export class InvitedMemberDto {
  @IsString()
  @Length(1, 60)
  displayName!: string;

  @Matches(PHONE_PATTERN, { message: 'phoneNumber must look like +919876543210' })
  phoneNumber!: string;
}

export class CreateGroupDto {
  @IsString()
  @Length(1, 80)
  title!: string;

  /** Name the creator wants to appear as inside this group. */
  @IsString()
  @Length(1, 60)
  displayName!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(49)
  @ValidateNested({ each: true })
  @Type(() => InvitedMemberDto)
  members?: InvitedMemberDto[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  title?: string;

  @IsOptional()
  @IsEnum({ ACTIVE: 'ACTIVE', CLOSED: 'CLOSED' })
  status?: 'ACTIVE' | 'CLOSED';
}

export class JoinGroupDto {
  @IsString()
  @Length(1, 60)
  displayName!: string;
}

export class AddMemberDto extends InvitedMemberDto {}
