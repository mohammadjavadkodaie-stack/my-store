import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { QueryCategoriesDto } from './dto/query-categories.dto';

/**
 * مسیرهای مدیریتی دسته‌بندی‌ها (admin/categories) — فقط ADMIN.
 * JwtAuthGuard سراسری + RolesGuard؛ بدون @Public تا ورود الزامی بماند.
 */
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** GET /admin/categories — شامل غیرفعال‌ها؛ همه‌ی فیلدها (isActive/sortOrder) */
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAllForAdmin(query);
  }
}
