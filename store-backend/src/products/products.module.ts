import { Module } from '@nestjs/common';
import { SlugPipe } from '../common/pipes/slug.pipe';
import { AdminProductsController } from './admin-products.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

// PrismaModule با @Global() تعریف شده؛ پس بدون import اضافه در دسترس است.
@Module({
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, SlugPipe],
})
export class ProductsModule {}
