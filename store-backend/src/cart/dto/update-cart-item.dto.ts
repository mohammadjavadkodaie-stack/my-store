import { IsInt, Max, Min } from 'class-validator';
import { MAX_CART_ITEM_QUANTITY } from './add-cart-item.dto';

/** بدنه‌ی تغییر تعداد (PATCH /cart/items/:productId)؛ مقدار 1..10 */
export class UpdateCartItemDto {
  @IsInt({ message: 'تعداد باید عدد صحیح باشد' })
  @Min(1, { message: 'تعداد حداقل 1 است' })
  @Max(MAX_CART_ITEM_QUANTITY, {
    message: `تعداد هر کالا حداکثر ${MAX_CART_ITEM_QUANTITY} است`,
  })
  quantity!: number;
}
