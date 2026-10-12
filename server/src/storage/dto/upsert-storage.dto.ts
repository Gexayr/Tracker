import { IsInt, IsObject, Max, Min, registerDecorator } from 'class-validator';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import type { HabitPayload } from '../storage.constants';
import { MAX_YEAR, MIN_YEAR, validateHabitPayload } from '../storage.constants';

function IsHabitPayload(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isHabitPayload',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => validateHabitPayload(value) === null,
        defaultMessage: (args: ValidationArguments) =>
          validateHabitPayload(args.value) ?? 'payload is invalid',
      },
    });
  };
}

export class UpsertStorageDto {
  // Decorators run bottom-up; with stopAtFirstError the bottom-most check reports first.
  @Max(MAX_YEAR)
  @Min(MIN_YEAR)
  @IsInt()
  year: number;

  @Max(11)
  @Min(0)
  @IsInt()
  month: number;

  // Free-form object (not a nested DTO) so whitelist does not strip unknown keys.
  @IsHabitPayload()
  @IsObject()
  payload: HabitPayload;
}
