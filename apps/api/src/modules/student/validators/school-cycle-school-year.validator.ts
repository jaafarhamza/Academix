import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { SchoolCycle, SchoolYear } from '../../../generated/prisma/enums';

const PRIMARY_ALLOWED_YEARS: SchoolYear[] = [
  SchoolYear.FIRST_YEAR,
  SchoolYear.SECOND_YEAR,
  SchoolYear.THIRD_YEAR,
  SchoolYear.FOURTH_YEAR,
  SchoolYear.FIFTH_YEAR,
  SchoolYear.SIXTH_YEAR,
];

const COLLEGE_AND_LYCEE_ALLOWED_YEARS: SchoolYear[] = [
  SchoolYear.FIRST_YEAR,
  SchoolYear.SECOND_YEAR,
  SchoolYear.THIRD_YEAR,
];

const ALLOWED_YEARS_BY_CYCLE: Record<SchoolCycle, SchoolYear[]> = {
  [SchoolCycle.PRIMARY]: PRIMARY_ALLOWED_YEARS,
  [SchoolCycle.COLLEGE]: COLLEGE_AND_LYCEE_ALLOWED_YEARS,
  [SchoolCycle.LYCEE]: COLLEGE_AND_LYCEE_ALLOWED_YEARS,
};

const isSchoolCycle = (value: unknown): value is SchoolCycle =>
  typeof value === 'string' && value in SchoolCycle;

const isSchoolYear = (value: unknown): value is SchoolYear =>
  typeof value === 'string' && value in SchoolYear;

@ValidatorConstraint({ name: 'isValidSchoolYearForCycle', async: false })
export class IsValidSchoolYearForCycleConstraint implements ValidatorConstraintInterface {
  validate(schoolYear: unknown, args: ValidationArguments): boolean {
    const payload = args.object as { schoolCycle?: unknown };
    const schoolCycle = payload.schoolCycle;

    if (!isSchoolCycle(schoolCycle) || !isSchoolYear(schoolYear)) {
      return true;
    }

    return ALLOWED_YEARS_BY_CYCLE[schoolCycle].includes(schoolYear);
  }

  defaultMessage(args: ValidationArguments): string {
    const payload = args.object as { schoolCycle?: unknown };
    const schoolCycle = payload.schoolCycle;

    if (schoolCycle === SchoolCycle.PRIMARY) {
      return 'schoolYear must be between FIRST_YEAR and SIXTH_YEAR for PRIMARY';
    }

    if (
      schoolCycle === SchoolCycle.COLLEGE ||
      schoolCycle === SchoolCycle.LYCEE
    ) {
      return 'schoolYear must be between FIRST_YEAR and THIRD_YEAR for COLLEGE/LYCEE';
    }

    return 'schoolYear is not valid for the provided schoolCycle';
  }
}

export const IsValidSchoolYearForCycle = (
  validationOptions?: ValidationOptions,
): PropertyDecorator => {
  return (target: object, propertyName: string | symbol): void => {
    const decoratorOptions = {
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [],
      validator: IsValidSchoolYearForCycleConstraint,
      ...(validationOptions ? { options: validationOptions } : {}),
    };

    registerDecorator(decoratorOptions);
  };
};
