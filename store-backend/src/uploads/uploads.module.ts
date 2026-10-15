import { Module } from '@nestjs/common';
import { AdminUploadsController } from './admin-uploads.controller';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * ماژول آپلود/سرو تصاویر — گاردهای سراسری (JWT، نقش‌ها، throttle)
 * از app.module.ts به مسیرها اعمال می‌شوند و نیازی به import اضافه نیست.
 */
@Module({
  controllers: [AdminUploadsController, UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
