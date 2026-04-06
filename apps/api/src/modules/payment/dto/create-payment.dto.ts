import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';
import {
  ToNumber,
  trimOptionalString,
  trimString,
} from './payment-shared.transformers';

export class CreatePaymentDto {
  @Transform(trimString)
  @IsUUID()
  student_id!: string;

  @Transform(trimString)
  @IsUUID()
  teacher_id!: string;

  @Transform(trimString)
  @IsOptional()
  @IsUUID()
  student_group_id?: string;

  @ToNumber()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'amount must be a valid number with up to 2 decimals' },
  )
  @Min(0.01, { message: 'amount must be greater than 0' })
  @Max(99999999.99, {
    message: 'amount must be less than or equal to 99999999.99',
  })
  amount!: number;

  @Transform(trimString)
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
