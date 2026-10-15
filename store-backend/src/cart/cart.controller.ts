import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { ParseIntIdPipe } from '../common/pipes/parse-int-id.pipe';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/**
 * سبد خرید کاربر جاری. هیچ مسیری @Public نیست و userId همیشه از
 * @CurrentUser (توکن) گرفته می‌شود، نه از بدنه/پارامتر/کوئری.
 */
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** GET /cart — سبد کاربر جاری با جمع‌های محاسبه‌شده‌ی سمت سرور */
  @Get()
  getCart(@CurrentUser() user: UserEntity) {
    return this.cartService.getCart(user.id);
  }

  /** POST /cart/items — افزودن/افزایش کالا */
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  addItem(@CurrentUser() user: UserEntity, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  /** PATCH /cart/items/:productId — تعیین تعداد (1..10) */
  @Patch('items/:productId')
  updateItem(
    @CurrentUser() user: UserEntity,
    @Param('productId', ParseIntIdPipe) productId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, productId, dto);
  }

  /** DELETE /cart/items/:productId — حذف یک کالا از سبد کاربر جاری */
  @Delete('items/:productId')
  removeItem(
    @CurrentUser() user: UserEntity,
    @Param('productId', ParseIntIdPipe) productId: number,
  ) {
    return this.cartService.removeItem(user.id, productId);
  }

  /** DELETE /cart — خالی‌کردن سبد کاربر جاری */
  @Delete()
  clear(@CurrentUser() user: UserEntity) {
    return this.cartService.clear(user.id);
  }
}
