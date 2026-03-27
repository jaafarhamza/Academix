import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchesProperty', async: false })
class MatchesPropertyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [propertyName] = args.constraints as [string];
    const payload = args.object as Record<string, unknown>;
    return value === payload[propertyName];
  }

  defaultMessage(args: ValidationArguments): string {
    const [propertyName] = args.constraints as [string];
    return `${args.property} must match ${propertyName}`;
  }
}

export const MatchesProperty = (
  propertyName: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator => {
  return (target: object, propertyNameTarget: string | symbol): void => {
    const decoratorOptions = {
      target: target.constructor,
      propertyName: propertyNameTarget.toString(),
      constraints: [propertyName],
      validator: MatchesPropertyConstraint,
      ...(validationOptions ? { options: validationOptions } : {}),
    };

    registerDecorator(decoratorOptions);
  };
};
