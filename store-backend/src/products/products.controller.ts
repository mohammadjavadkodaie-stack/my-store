import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SlugPipe } from '../common/pipes/slug.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFiltersQueryDto } from './dto/product-filters-query.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** GET /products — عمومی؛ جست‌وجو، فیلتر و صفحه‌بندی */
  @Public()
  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  /**
   * GET /products/filters — عمومی؛ گزینه‌های موجود فیلترها.
   * باید قبل از مسیر :slug ثبت شود تا «filters» به‌عنوان اسلاگ تفسیر نشود.
   */
  @Public()
  @Get('filters')
  findFilters(@Query() query: ProductFiltersQueryDto) {
    return this.productsService.findFilters(query);
  }

  /** GET /products/:slug — عمومی؛ اسلاگ نامعتبر => 404 */
  @Public()
  @Get(':slug')
  findOne(@Param('slug', SlugPipe) slug: string) {
    return this.productsService.findBySlug(slug);
  }

  /** POST /products — فقط ADMIN */
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /** PATCH /products/:id — فقط ADMIN */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  /** DELETE /products/:id — فقط ADMIN؛ حذف نرم (اسلاگ آزاد و پنهان از همه‌ی مسیرها) */
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return { message: 'محصول حذف شد' };
  }
}
