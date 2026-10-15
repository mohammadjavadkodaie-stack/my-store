import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { ParseIntIdPipe } from '../common/pipes/parse-int-id.pipe';
import { ListOrdersDto } from './dto/list-orders.dto';
import { OrdersService } from './orders.service';

/**
 * سفارش‌های کاربر جاری. هیچ مسیری @Public نیست و userId همیشه از
 * @CurrentUser (توکن) گرفته می‌شود، نه از بدنه/پارامتر/کوئری.
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** POST /orders — ثبت سفارش از سبد کاربر جاری؛ بدنه‌ای ندارد (10/دقیقه) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: UserEntity) {
    return this.ordersService.createFromCart(user.id);
  }

  /** GET /orders — سفارش‌های کاربر جاری؛ جدیدترین اول، صفحه‌بندی‌شده */
  @Get()
  findAll(@CurrentUser() user: UserEntity, @Query() query: ListOrdersDto) {
    return this.ordersService.findAll(user.id, query);
  }

  /** GET /orders/:id — جزئیات سفارش مالک؛ نبود یا مال نبودن => 404 عمومی */
  @Get(':id')
  findOne(
    @Param('id', ParseIntIdPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    return this.ordersService.findOne(user.id, id);
  }
}
