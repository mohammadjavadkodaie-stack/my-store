import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SlidesService } from './slides.service';

/** مسیرهای عمومی اسلایدهای هیرو (slides) */
@Controller('slides')
export class SlidesController {
  constructor(private readonly slidesService: SlidesService) {}

  /** GET /slides — عمومی؛ فقط اسلایدهای فعال با ترتیب sortOrder سپس id */
  @Public()
  @Get()
  findAll() {
    return this.slidesService.findAll();
  }
}
