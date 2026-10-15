import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** محدودیت‌های فیلد specs — هیچ کلید/مقداری خارج از این قواعد پذیرفته نمی‌شود */
export const SPECS_MAX_KEYS = 30;
export const SPEC_KEY_MAX_LENGTH = 60;
export const SPEC_VALUE_MAX_LENGTH = 200;
export const FORBIDDEN_SPEC_KEY = '__proto__';

export const SPECS_VALIDATION_MESSAGE =
  'مشخصات باید شیءای ساده با حداکثر 30 کلید باشد؛ هر کلید بین 1 تا 60 کاراکتر و به‌جز __proto__، و هر مقدار رشته‌ای حداکثر 200 کاراکتر';

/**
 * اعتبارسنجی specs بدون هیچ تبدیل نوعی:
 * فقط شیء ساده (نه آرایه/تاریخ/نمونه‌ی کلاس)، حداکثر 30 کلید،
 * کلید 1 تا 60 کاراکتر و به‌جز «__proto__» (دفاع در برابر prototype pollution)،
 * و مقدارها فقط رشته‌ی حداکثر 200 کاراکتر.
 */
@ValidatorConstraint({ name: 'isValidSpecs', async: false })
export class IsValidSpecsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > SPECS_MAX_KEYS) {
      return false;
    }
    return entries.every(([key, item]) => {
      if (key.length === 0 || key.length > SPEC_KEY_MAX_LENGTH) {
        return false;
      }
      if (key === FORBIDDEN_SPEC_KEY) {
        return false;
      }
      return typeof item === 'string' && item.length <= SPEC_VALUE_MAX_LENGTH;
    });
  }

  defaultMessage(): string {
    return SPECS_VALIDATION_MESSAGE;
  }
}

/** دکوراتور اعتبارسنجی فیلد specs (پیام پیش‌فرض از خودِ محدودیت می‌آید) */
export function IsValidSpecs(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isValidSpecs',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: IsValidSpecsConstraint,
    });
  };
}
