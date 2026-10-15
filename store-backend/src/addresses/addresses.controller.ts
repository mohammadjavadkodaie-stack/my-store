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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * آدرس‌های کاربر جاری. هیچ مسیری @Public و هیچ مسیری @Roles نیست: هر کاربر
 * وارد‌شده‌ای فقط به آدرس‌های خودش دسترسی دارد و userId همیشه از @CurrentUser
 * (توکن) گرفته می‌شود، نه از بدنه/پارامتر/کوئری.
 */
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /** GET /addresses — آدرس‌های کاربر جاری؛ پیش‌فرض اول، سپس قدیمی‌ترها */
  @Get()
  findAll(@CurrentUser() user: UserEntity) {
    return this.addressesService.findAll(user.id);
  }

  /** POST /addresses — ساخت آدرس (حداکثر ۳ آدرس برای هر کاربر) */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: UserEntity, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  /** PATCH /addresses/:id — ویرایش آدرس مالک؛ نبود/مالِ دیگری => 404 */
  @Patch(':id')
  update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntIdPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  /** DELETE /addresses/:id — حذف آدرس مالک؛ پاسخ: آدرس‌های باقی‌مانده */
  @Delete(':id')
  remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntIdPipe) id: number,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}
