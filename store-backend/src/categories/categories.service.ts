import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  DEFAULT_LIST_LIMIT,
  QueryCategoriesDto,
} from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/** فقط فیلدهای خودِ منبع Category — هیچ فیلد اضافه‌ای برنمی‌گردد */
const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  platform: true,
} satisfies Prisma.CategorySelect;

/**
 * نمای عمومی لیست/جزئیات: فیلدهای منبع + تصویر + تعداد محصولات فعال.
 * sortOrder و isActive فقط برای ترتیب/فیلتر در دیتابیس خوانده می‌شوند و
 * پیش از پاسخ (مثل _count) از خروجی نگاشت می‌شوند.
 */
const PUBLIC_CATEGORY_LIST_SELECT = {
  ...CATEGORY_SELECT,
  image: true,
  sortOrder: true,
  isActive: true,
  _count: {
    select: { products: { where: { isActive: true, deletedAt: null } } },
  },
} satisfies Prisma.CategorySelect;

/** نمای ادمین (پاسخ create/update): فیلدهای منبع + تصویر + ترتیب + فعال بودن */
const ADMIN_CATEGORY_SELECT = {
  ...CATEGORY_SELECT,
  image: true,
  sortOrder: true,
  isActive: true,
} satisfies Prisma.CategorySelect;

type AdminCategoryView = Prisma.CategoryGetPayload<{
  select: typeof ADMIN_CATEGORY_SELECT;
}>;

/**
 * نمای لیست ادمین (GET /admin/categories): فیلدهای ادمین + شمارش همه‌ی محصولات
 * دسته‌بندی (فعال و غیرفعال) — فقط برای مسیرهای ADMIN.
 */
const ADMIN_CATEGORY_LIST_SELECT = {
  ...ADMIN_CATEGORY_SELECT,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

type AdminCategoryListRow = Prisma.CategoryGetPayload<{
  select: typeof ADMIN_CATEGORY_LIST_SELECT;
}>;

/** آیتم لیست ادمین: همه‌ی فیلدها (شامل isActive/sortOrder) + تعداد کل محصولات */
export interface AdminCategoryListItem extends Omit<
  AdminCategoryListRow,
  '_count'
> {
  productCount: number;
}

/** شمارش خام (_count) را به productCount نگاشت می‌کند؛ هیچ فیلدی حذف نمی‌شود */
function toAdminCategoryListItem(
  row: AdminCategoryListRow,
): AdminCategoryListItem {
  const { _count, ...rest } = row;
  return { ...rest, productCount: _count.products };
}

type PublicCategoryRow = Prisma.CategoryGetPayload<{
  select: typeof PUBLIC_CATEGORY_LIST_SELECT;
}>;

/** نمای عمومی دسته‌بندی: فیلدهای منبع + تصویر + تعداد محصولات فعال */
export interface PublicCategoryView extends Omit<
  PublicCategoryRow,
  '_count' | 'sortOrder' | 'isActive'
> {
  productCount: number;
}

/** ردیف خام را به نمای عمومی نگاشت می‌کند (شمارش به productCount؛ ترتیب/فعال بودن حذف) */
function toPublicCategory(row: PublicCategoryRow): PublicCategoryView {
  const { _count, sortOrder, isActive, ...rest } = row;
  return { ...rest, productCount: _count.products };
}

export interface PaginatedCategories {
  items: PublicCategoryView[];
  total: number;
  page: number;
  limit: number;
}

/** نتیجه‌ی GET /admin/categories — شامل دسته‌بندی‌های غیرفعال هم */
export interface PaginatedAdminCategories {
  items: AdminCategoryListItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** شرط WHERE مشترک لیست دسته‌بندی‌ها؛ activeOnly=true فقط فعال‌ها (نمای عمومی) */
  private buildCategoryListWhere(
    query: QueryCategoriesDto,
    activeOnly: boolean,
  ): Prisma.CategoryWhereInput {
    const where: Prisma.CategoryWhereInput = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (query.platform) {
      where.platform = query.platform;
    }
    return where;
  }

  /**
   * لیست صفحه‌بندی‌شده‌ی دسته‌بندی‌های فعال با فیلتر اختیاری پلتفرم؛
   * مرتب بر اساس sortOrder سپس id (ترتیب ثابت، نه ورودی کاربر).
   */
  async findAll(query: QueryCategoriesDto): Promise<PaginatedCategories> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;
    const where = this.buildCategoryListWhere(query, true);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        select: PUBLIC_CATEGORY_LIST_SELECT,
        // ترتیب ثابت (نه ورودی کاربر)
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items: items.map(toPublicCategory), total, page, limit };
  }

  /**
   * GET /admin/categories — لیست مدیریتی همه‌ی دسته‌بندی‌ها (فعال و غیرفعال)
   * با همه‌ی فیلدها (isActive/sortOrder)؛ productCount شامل همه‌ی محصولات است.
   */
  async findAllForAdmin(
    query: QueryCategoriesDto,
  ): Promise<PaginatedAdminCategories> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;
    const where = this.buildCategoryListWhere(query, false);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        select: ADMIN_CATEGORY_LIST_SELECT,
        // ترتیب ثابت (نه ورودی کاربر)
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items: items.map(toAdminCategoryListItem), total, page, limit };
  }

  /** یک دسته‌بندی فعال بر اساس اسلاگ؛ در صورت نبود => 404 */
  async findBySlug(slug: string): Promise<PublicCategoryView> {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      select: PUBLIC_CATEGORY_LIST_SELECT,
    });
    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }
    return toPublicCategory(category);
  }

  /** ساخت دسته‌بندی؛ پاسخ ادمین (شامل sortOrder/isActive)؛ اسلاگ تکراری => 409 */
  async create(dto: CreateCategoryDto): Promise<AdminCategoryView> {
    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          platform: dto.platform,
          image: dto.image,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: ADMIN_CATEGORY_SELECT,
      });
    } catch (error) {
      this.handlePrismaError(error, 'دسته‌بندی');
    }
  }

  /** ویرایش دسته‌بندی؛ پاسخ ادمین (شامل sortOrder/isActive)؛ 404 / 409 */
  async update(id: number, dto: UpdateCategoryDto): Promise<AdminCategoryView> {
    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.platform !== undefined) data.platform = dto.platform;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
        select: ADMIN_CATEGORY_SELECT,
      });
    } catch (error) {
      this.handlePrismaError(error, 'دسته‌بندی');
    }
  }

  /**
   * حذف دسته‌بندی؛ اگر محصولِ حذف‌نشده‌ای به آن وابسته باشد => 409.
   * محصولات حذف‌نرم‌شده در این شمارش به‌حساب نمی‌آیند، اما اگر رکوردهای
   * حذف‌شده هنوز به دسته ارجاع بدهند، محدودیت کلید خارجی همان 409 را می‌دهد.
   */
  async remove(id: number): Promise<void> {
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new ConflictException('این دسته‌بندی دارای محصول است');
    }

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      // کوئری شمارش بالا ممکن است با داده‌ی هم‌زمان رد شود؛ کلید خارجی (P2003)
      // باز هم به همان 409 «دارای محصول» نگاشت می‌شود تا رفتار یکنواخت بماند.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException('این دسته‌بندی دارای محصول است');
      }
      this.handlePrismaError(error, 'دسته‌بندی');
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
