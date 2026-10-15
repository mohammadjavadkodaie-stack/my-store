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
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParseIntIdPipe } from '../common/pipes/parse-int-id.pipe';
import { CreateSlideDto } from './dto/create-slide.dto';
import { ReorderSlidesDto } from './dto/reorder-slides.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { SlidesService } from './slides.service';

/**
 * مسیرهای مدیریتی اسلایدهای هیرو (admin/slides) — فقط ADMIN.
 * JwtAuthGuard سراسری + RolesGuard؛ بدون @Public تا ورود الزامی بماند.
 */
@Controller('admin/slides')
export class AdminSlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  /** GET /admin/slides — شامل غیرفعال‌ها؛ همان ترتیب ثابت */
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.slidesService.findAllForAdmin();
  }

  /** POST /admin/slides — ساخت؛ سقف 10 اسلاید و ترتیب سمت سرور */
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSlideDto) {
    return this.slidesService.create(dto);
  }

  /**
   * POST /admin/slides/reorder — چیدمان مجدد؛ عمداً پیش از مسیرهای :id
   * اعلام می‌شود تا «reorder» هرگز به‌عنوان شناسه تفسیر نشود.
   */
  @Roles(Role.ADMIN)
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  reorder(@Body() dto: ReorderSlidesDto) {
    return this.slidesService.reorder(dto);
  }

  /** PATCH /admin/slides/:id — ویرایش؛ شناسه‌ی نامعتبر => 400، نبود => 404 */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntIdPipe) id: number, @Body() dto: UpdateSlideDto) {
    return this.slidesService.update(id, dto);
  }

  /** DELETE /admin/slides/:id — حذف قطعی؛ نبود => 404 */
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntIdPipe) id: number) {
    await this.slidesService.remove(id);
    return { message: 'اسلاید حذف شد' };
  }
}
