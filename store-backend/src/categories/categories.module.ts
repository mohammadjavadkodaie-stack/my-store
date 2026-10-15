import { Module } from '@nestjs/common';
import { SlugPipe } from '../common/pipes/slug.pipe';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

// PrismaModule با @Global() تعریف شده؛ پس بدون import اضافه در دسترس است.
@Module({
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, SlugPipe],
})
export class CategoriesModule {}
