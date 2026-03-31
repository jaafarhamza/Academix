import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return value;
};

export class CreateRoomDto {
  @IsInt()
  @Min(0)
  floor!: number;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  roomName!: string;

  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
