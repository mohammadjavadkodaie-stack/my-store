import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlideDto, MAX_SLIDES } from './dto/create-slide.dto';
import { ReorderSlidesDto } from './dto/reorder-slides.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';

/** فقط فیلدهای خودِ منبع HeroSlide — هیچ فیلد اضافه‌ای برنمی‌گردد */
export const SLIDE_SELECT = {
  id: true,
  imageUrl: true,
  title: true,
  subtitle: true,
  buttonLabel: true,
  linkPath: true,
  isActive: true,
  sortOrder: true,
} satisfies Prisma.HeroSlideSelect;

export type SlideView = Prisma.HeroSlideGetPayload<{
  select: typeof SLIDE_SELECT;
}>;

/** ترتیب ثابت نمایش: sortOrder صعودی و سپس id صعودی */
const SLIDE_ORDER_BY: Prisma.HeroSlideOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { id: 'asc' },
];

/**
 * قاعده‌ی وابسته: برچسب دکمه و مسیر دکمه یا هر دو مقدار دارند یا هیچ‌کدام.
 * در سرویس بررسی می‌شود تا در PATCH روی مقدار نهایی (فعلی + تغییرات) اعمال شود.
 */
function assertButtonPair(
  buttonLabel: string | null,
  linkPath: string | null,
): void {
  const hasLabel = buttonLabel !== null && buttonLabel !== '';
  const hasPath = linkPath !== null && linkPath !== '';
  if (hasLabel !== hasPath) {
    throw new BadRequestException(
      'برچسب دکمه و مسیر دکمه باید هر دو مقدار داشته باشند یا هر دو خالی باشند',
    );
  }
}

@Injectable()
export class SlidesService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /slides — عمومی؛ فقط اسلایدهای فعال با ترتیب ثابت */
  findAll(): Promise<SlideView[]> {
    return this.prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: SLIDE_ORDER_BY,
      select: SLIDE_SELECT,
    });
  }

  /** GET /admin/slides — شامل اسلایدهای غیرفعال؛ همان ترتیب */
  findAllForAdmin(): Promise<SlideView[]> {
    return this.prisma.heroSlide.findMany({
      orderBy: SLIDE_ORDER_BY,
      select: SLIDE_SELECT,
    });
  }

  /**
   * ساخت اسلاید. sortOrder از کلاینت گرفته نمی‌شود و برابر
   * (بیشترین sortOrder + 1) یا صفر (وقتی اسلایدی وجود ندارد) است.
   * شمارش + ساخت داخل یک تراکنش انجام می‌شود تا سقف 10 اسلاید
   * هرگز با درخواست‌های هم‌زمان رد نشود.
   */
  async create(dto: CreateSlideDto): Promise<SlideView> {
    const buttonLabel = dto.buttonLabel ?? null;
    const linkPath = dto.linkPath ?? null;
    assertButtonPair(buttonLabel, linkPath);

    return this.prisma.$transaction(async (tx) => {
      const total = await tx.heroSlide.count();
      if (total >= MAX_SLIDES) {
        throw new BadRequestException(
          `حداکثر ${MAX_SLIDES} اسلاید قابل ثبت است`,
        );
      }

      const aggregate = await tx.heroSlide.aggregate({
        _max: { sortOrder: true },
      });
      const maxSortOrder = aggregate._max.sortOrder;

      return tx.heroSlide.create({
        data: {
          imageUrl: dto.imageUrl,
          title: dto.title ?? null,
          subtitle: dto.subtitle ?? null,
          buttonLabel,
          linkPath,
          isActive: dto.isActive ?? true,
          sortOrder: maxSortOrder === null ? 0 : maxSortOrder + 1,
        },
        select: SLIDE_SELECT,
      });
    });
  }

  /**
   * ویرایش اسلاید؛ نبود رکورد => 404. قاعده‌ی «برچسب دکمه و مسیر دکمه»
   * روی نتیجه‌ی نهایی (مقدار فعلی + تغییرات) بررسی می‌شود و sortOrder
   * از کلاینت پذیرفته نمی‌شود.
   */
  async update(id: number, dto: UpdateSlideDto): Promise<SlideView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.heroSlide.findUnique({
          where: { id },
          select: { buttonLabel: true, linkPath: true },
        });
        if (!current) {
          throw new NotFoundException('اسلاید یافت نشد');
        }

        assertButtonPair(
          dto.buttonLabel !== undefined ? dto.buttonLabel : current.buttonLabel,
          dto.linkPath !== undefined ? dto.linkPath : current.linkPath,
        );

        const data: Prisma.HeroSlideUpdateInput = {};
        if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
        if (dto.title !== undefined) data.title = dto.title;
        if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
        if (dto.buttonLabel !== undefined) data.buttonLabel = dto.buttonLabel;
        if (dto.linkPath !== undefined) data.linkPath = dto.linkPath;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;

        return tx.heroSlide.update({
          where: { id },
          data,
          select: SLIDE_SELECT,
        });
      });
    } catch (error) {
      this.handlePrismaError(error, 'اسلاید');
    }
  }

  /**
   * چیدمان مجدد: فهرست شناسه‌ها باید دقیقاً همان مجموعه‌ی اسلایدهای موجود
   * باشد (بدون تکرار، بدون کم/زیاد) وگرنه 400. سپس sortOrder هر اسلاید
   * برابر اندیس آن در فهرست می‌شود؛ همه‌ی به‌روزرسانی‌ها در یک تراکنش.
   */
  async reorder(dto: ReorderSlidesDto): Promise<SlideView[]> {
    return this.prisma.$transaction(async (tx) => {
      const slides = await tx.heroSlide.findMany({ select: { id: true } });
      const existingIds = new Set(slides.map((slide) => slide.id));
      const requestedIds = new Set(dto.ids);

      const matchesExistingSet =
        requestedIds.size === dto.ids.length &&
        requestedIds.size === existingIds.size &&
        dto.ids.every((id) => existingIds.has(id));
      if (!matchesExistingSet) {
        throw new BadRequestException(
          'فهرست شناسه‌ها با اسلایدهای موجود مطابقت ندارد',
        );
      }

      for (let index = 0; index < dto.ids.length; index += 1) {
        await tx.heroSlide.update({
          where: { id: dto.ids[index] },
          data: { sortOrder: index },
        });
      }

      return tx.heroSlide.findMany({
        orderBy: SLIDE_ORDER_BY,
        select: SLIDE_SELECT,
      });
    });
  }

  /** حذف قطعی اسلاید؛ نبود رکورد => 404 */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.heroSlide.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error, 'اسلاید');
    }
  }

  /** نگاشت خطاهای Prisma به پاسخ‌های عمومی HTTP */
  private handlePrismaError(error: unknown, resource: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(`${resource} تکراری است`);
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('ارجاع نامعتبر است');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`${resource} یافت نشد`);
      }
    }
    throw error;
  }
}
