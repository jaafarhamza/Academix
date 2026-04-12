import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { DeductionType } from '../../../generated/prisma/enums';

@ValidatorConstraint({ name: 'CenterCostValue', async: false })
export class CenterCostValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, validationArguments: ValidationArguments): boolean {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return false;
    }

    const payload = validationArguments.object as {
      deduction_type?: DeductionType;
    };

    if (
      payload.deduction_type === DeductionType.PERCENTAGE_OF_TOTAL ||
      payload.deduction_type === DeductionType.PERCENTAGE_PER_STUDENT
    ) {
      return value >= 0 && value <= 100;
    }

    if (payload.deduction_type === DeductionType.FIXED_PER_STUDENT) {
      return value > 0;
    }

    return true;
  }

  defaultMessage(validationArguments: ValidationArguments): string {
    const payload = validationArguments.object as {
      deduction_type?: DeductionType;
    };

    if (
      payload.deduction_type === DeductionType.PERCENTAGE_OF_TOTAL ||
      payload.deduction_type === DeductionType.PERCENTAGE_PER_STUDENT
    ) {
      return 'percentage deduction value must be between 0 and 100';
    }

    if (payload.deduction_type === DeductionType.FIXED_PER_STUDENT) {
      return 'fixed deduction value must be greater than 0';
    }

    return 'value is invalid for the selected deduction type';
  }
}

export function IsValidCenterCostValue(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'IsValidCenterCostValue',
      target: object.constructor,
      propertyName,
      validator: CenterCostValueConstraint,
      ...(validationOptions ? { options: validationOptions } : {}),
    });
  };
}
