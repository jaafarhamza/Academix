import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MatchesProperty } from '../validators/matches-property.validator';

export class ChangeCenterPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'newPassword must include uppercase, lowercase, number, and symbol',
    },
  )
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @MatchesProperty('newPassword', {
    message: 'confirmPassword must match newPassword',
  })
  confirmPassword!: string;
}
