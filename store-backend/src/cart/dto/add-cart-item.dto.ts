import { IsInt, Max, Min } from 'class-validator';

/** سقف تعداد هر کالا در سبد خرید */
export const MAX_CART_ITEM_QUANTITY = 10;
/** سقف تعداد کالاهای متمایز در سبد خرید */
export const MAX_CART_ITEMS = 30;
/** بیشینه‌ی شناسه‌ی محصول (سقف Int در PostgreSQL) */
export const MAX_PRODUCT_ID = 2_147_483_647;

/**
 * بدنه‌ی افزودن کالا (POST /cart/items).
 * مقادیر عددی باید در JSON واقعاً number باشند؛ @Type عمداً حذف شده تا
 * رشته‌هایی مثل "5" با 400 رد شوند. userId هرگز در بدنه پذیرفته نمی‌شود.
 */
export class AddCartItemDto {
  @IsInt({ message: 'شناسه‌ی محصول باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه‌ی محصول نامعتبر است' })
  @Max(MAX_PRODUCT_ID, { message: 'شناسه‌ی محصول نامعتبر است' })
  productId!: number;

  @IsInt({ message: 'تعداد باید عدد صحیح باشد' })
  @Min(1, { message: 'تعداد حداقل 1 است' })
  @Max(MAX_CART_ITEM_QUANTITY, {
    message: `تعداد هر کالا حداکثر ${MAX_CART_ITEM_QUANTITY} است`,
  })
  quantity!: number;
}
