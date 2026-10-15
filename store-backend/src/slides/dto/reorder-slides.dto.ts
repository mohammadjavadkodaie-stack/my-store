import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { MAX_SLIDES } from './create-slide.dto';

/**
 * بدنه‌ی چیدمان مجدد اسلایدها (POST /admin/slides/reorder — فقط ADMIN).
 * فهرست شناسه‌ها باید بدون تکرار و دقیقاً همان مجموعه‌ی اسلایدهای موجود
 * باشد؛ تطابق کامل در سرویس داخل تراکنش بررسی می‌شود.
 */
export class ReorderSlidesDto {
  @IsArray({ message: 'شناسه‌ها باید آرایه باشند' })
  @ArrayMaxSize(MAX_SLIDES, {
    message: 'حداکثر 10 اسلاید قابل چیدمان است',
  })
  @ArrayUnique({ message: 'شناسه‌ها نباید تکراری باشند' })
  @IsInt({ each: true, message: 'هر شناسه باید عدد صحیح باشد' })
  @Min(1, { each: true, message: 'شناسه نامعتبر است' })
  ids!: number[];
}
