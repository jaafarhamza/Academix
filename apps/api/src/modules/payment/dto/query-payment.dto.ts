import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../../../generated/prisma/enums';
import { toOptionalInteger, trimString } from './payment-shared.transformers';

export class QueryPaymentDto {
  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  teacher_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  student_group_id?: string;

  @Transform(trimString)
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  payment_from?: string;

  @Transform(trimString)
  @IsOptional()
  @IsDateString()
  payment_to?: string;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(toOptionalInteger)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
