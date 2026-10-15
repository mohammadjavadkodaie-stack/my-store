import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminQueryProductsDto } from './dto/admin-query-products.dto';
import { ProductsService } from './products.service';

/**
 * مسیرهای مدیریتی محصولات (admin/products) — فقط ADMIN.
 * JwtAuthGuard سراسری + RolesGuard؛ بدون @Public تا ورود الزامی بماند.
 */
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** GET /admin/products — همه‌ی فیلدها (بدون پنهان‌سازی)؛ فیلتر اختیاری isActive */
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query: AdminQueryProductsDto) {
    return this.productsService.findAllForAdmin(query);
  }
}
