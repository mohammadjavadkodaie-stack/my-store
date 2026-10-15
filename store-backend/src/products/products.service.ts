import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SLUG_MAX_LENGTH } from '../common/pipes/slug.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryProductsDto } from './dto/admin-query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFiltersQueryDto } from './dto/product-filters-query.dto';
import {
  DEFAULT_LIST_LIMIT,
  ProductSort,
  QueryProductsDto,
} from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * فیلدهای عمومی لیست — بدون description، categoryId و stock.
 * هرگز فیلد خارج از این مجموعه در پاسخ عمومی ظاهر نمی‌شود.
 */
export const PUBLIC_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  discountPercent: true,
  region: true,
  images: true,
  brand: true,
  category: { select: { name: true, slug: true, platform: true } },
} satisfies Prisma.ProductSelect;

/** فیلدهای عمومی جزئیات = فیلدهای لیست + description, portsCount, weight, createdAt, sku, genres, specs */
export const PUBLIC_DETAIL_SELECT = {
  ...PUBLIC_LIST_SELECT,
  description: true,
  portsCount: true,
  weight: true,
  createdAt: true,
  sku: true,
  genres: true,
  specs: true,
} satisfies Prisma.ProductSelect;

/**
 * برای نگاشت stock به inStock/lowStock به مقدار موجودی نیاز داریم؛ آن را فقط
 * برای محاسبه‌ی داخلی می‌خوانیم و در نگاشت حذف می‌کنیم تا خام برنگردد.
 */
const PUBLIC_LIST_QUERY_SELECT = {
  ...PUBLIC_LIST_SELECT,
  stock: true,
} satisfies Prisma.ProductSelect;

const PUBLIC_DETAIL_QUERY_SELECT = {
  ...PUBLIC_DETAIL_SELECT,
  stock: true,
} satisfies Prisma.ProductSelect;

/** همه‌ی فیلدهای مدیریتی (شامل موجودی خام) — فقط برای create/update روی مسیرهای ADMIN */
export const ADMIN_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAtPrice: true,
  discountPercent: true,
  stock: true,
  images: true,
  brand: true,
  portsCount: true,
  weight: true,
  categoryId: true,
  sku: true,
  region: true,
  genres: true,
  specs: true,
  isActive: true,
  isFeatured: true,
  soldCount: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true, slug: true, platform: true } },
} satisfies Prisma.ProductSelect;

/** سقف «موجودی کم» — فقط در بازه‌ی 1 تا 3 مقدار برمی‌گردد، وگرنه null */
export const LOW_STOCK_MAX = 3;

/** سقف خواندن مقادیر متمایز برای اندپوینت فیلترها (برند/ژانر/منطقه) */
export const FILTERS_MAX_PRODUCTS = 5_000;

export interface PublicProductStockInfo {
  inStock: boolean;
  lowStock: number | null;
}

type PublicListRow = Prisma.ProductGetPayload<{
  select: typeof PUBLIC_LIST_QUERY_SELECT;
}>;
type PublicDetailRow = Prisma.ProductGetPayload<{
  select: typeof PUBLIC_DETAIL_QUERY_SELECT;
}>;

export type PublicProductListItem = Omit<PublicListRow, 'stock'> &
  PublicProductStockInfo;
export type PublicProductDetail = Omit<PublicDetailRow, 'stock'> &
  PublicProductStockInfo;
export type AdminProductView = Prisma.ProductGetPayload<{
  select: typeof ADMIN_SELECT;
}>;

/** موجودی خام را حذف و به inStock/lowStock نگاشت می‌کند (موجودی هرگز برنمی‌گردد) */
function toPublicStock<T extends { stock: number }>(
  row: T,
): Omit<T, 'stock'> & PublicProductStockInfo {
  const { stock, ...rest } = row;
  return {
    ...rest,
    inStock: stock > 0,
    lowStock: stock >= 1 && stock <= LOW_STOCK_MAX ? stock : null,
  };
}

/**
 * نگاشت ثابت enum مرتب‌سازی به orderBy — هیچ‌گاه نام خام فیلد از کاربر گرفته
 * نمی‌شود؛ در هر حالت id به‌عنوان شمارنده‌ی قطع تساوی اضافه می‌شود تا
 * ترتیب ردیف‌های هم‌ارزش قطعی بماند.
 */
const PRODUCT_SORT_MAP: Record<
  ProductSort,
  Prisma.ProductOrderByWithRelationInput[]
> = {
  [ProductSort.NEWEST]: [{ createdAt: 'desc' }, { id: 'desc' }],
  [ProductSort.PRICE_ASC]: [{ price: 'asc' }, { id: 'asc' }],
  [ProductSort.PRICE_DESC]: [{ price: 'desc' }, { id: 'desc' }],
  [ProductSort.BEST_SELLING]: [{ soldCount: 'desc' }, { id: 'desc' }],
  [ProductSort.DISCOUNT]: [{ discountPercent: 'desc' }, { id: 'desc' }],
};

/**
 * نرمال‌سازی متن جست‌وجو: ارقام فارسی/عربی به لاتین و «ی/ک» عربی به فارسی
 * تا جست‌وجوی نام/برند/کد کالا بین چیدمان‌های کیبورد فارسی و عربی یکسان کار کند.
 */
export function normalizeSearchText(value: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let result = '';
  for (const char of value) {
    const persianIndex = persianDigits.indexOf(char);
    if (persianIndex >= 0) {
      result += String(persianIndex);
      continue;
    }
    const arabicIndex = arabicDigits.indexOf(char);
    if (arabicIndex >= 0) {
      result += String(arabicIndex);
      continue;
    }
    if (char === 'ي') {
      result += 'ی';
      continue;
    }
    if (char === 'ك') {
      result += 'ک';
      continue;
    }
    result += char;
  }
  return result;
}

/** درصد تخفیف همیشه سمت سرور محاسبه می‌شود؛ بدون قیمت قبل از تخفیف => 0 */
export function computeDiscountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number {
  if (compareAtPrice === null || compareAtPrice === undefined) {
    return 0;
  }
  return Math.floor(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** قیمت قبل از تخفیف باید واقعاً بیشتر از قیمت فروش باشد */
function assertValidCompareAtPrice(
  price: number,
  compareAtPrice: number,
): void {
  if (compareAtPrice <= price) {
    throw new BadRequestException(
      'قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد',
    );
  }
}

/**
 * اسلاگ محصول حذف‌نرم‌شده: پیشوند `deleted-{id}-` یکتایی را تضمین می‌کند و
 * اسلاگ اصلی برای استفاده‌ی مجدد آزاد می‌شود؛ نتیجه تا سقف 120 کاراکتر
 * بریده و از خط تیره‌ی انتهایی پاک می‌شود تا الگوی اسلاگ معتبر بماند.
 */
export function buildDeletedSlug(id: number, slug: string): string {
  return `deleted-${id}-${slug}`.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, '');
}

export interface PaginatedProducts {
  items: PublicProductListItem[];
  total: number;
  page: number;
  limit: number;
}

/** نتیجه‌ی GET /admin/products — نمای کامل مدیریتی بدون پنهان‌سازی فیلد */
export interface PaginatedAdminProducts {
  items: AdminProductView[];
  total: number;
  page: number;
  limit: number;
}

/** نتیجه‌ی GET /products/filters — مجموعه‌های متمایز موجود + بازه‌ی قیمت */
export interface ProductFiltersResult {
  brands: string[];
  genres: string[];
  regions: string[];
  price: { min: number | null; max: number | null };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** بازه‌ی قیمت نامعتبر => 400 — مشترک بین لیست عمومی و لیست ادمین */
  private assertValidPriceRange(query: QueryProductsDto): void {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('بازه‌ی قیمت نامعتبر است');
    }
  }

  /**
   * شرط‌های محتوایی مشترک لیست عمومی و ادمین (جست‌وجو، برند، ژانر، منطقه،
   * تخفیف، ویژه، بازه‌ی قیمت، موجودی) — بدون هیچ قید isActive تا هر مسیر
   * دامنه‌ی فعال بودن خودش را تعیین کند.
   */
  private buildContentFilters(
    query: QueryProductsDto,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    // جست‌وجوی نام/برند/کد کالا با نرمال‌سازی ارقام فارسی/عربی و «ی/ک» عربی
    if (query.q) {
      const needle = normalizeSearchText(query.q);
      where.AND = [
        {
          OR: [
            { name: { contains: needle, mode: 'insensitive' } },
            { brand: { contains: needle, mode: 'insensitive' } },
            { sku: { contains: needle, mode: 'insensitive' } },
          ],
        },
      ];
    }
    if (query.brand && query.brand.length > 0) {
      where.brand = { in: query.brand, mode: 'insensitive' };
    }
    if (query.genre && query.genre.length > 0) {
      where.genres = {
        hasSome: query.genre.map((genre) => normalizeSearchText(genre)),
      };
    }
    if (query.region) {
      where.region = { equals: query.region, mode: 'insensitive' };
    }
    if (query.onSale === 'true') {
      where.discountPercent = { gt: 0 };
    }
    if (query.featured === 'true') {
      where.isFeatured = true;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    if (query.inStock === 'true') {
      where.stock = { gt: 0 };
    } else if (query.inStock === 'false') {
      where.stock = { equals: 0 };
    }
    return where;
  }

  /** فیلتر دسته‌بندی بر اساس اسلاگ/پلتفرم — قید isActive با فراخوان تعیین می‌شود */
  private buildCategoryFilter(
    query: QueryProductsDto,
  ): Prisma.CategoryWhereInput {
    const categoryFilter: Prisma.CategoryWhereInput = {};
    if (query.categorySlug) categoryFilter.slug = query.categorySlug;
    if (query.platform) categoryFilter.platform = query.platform;
    return categoryFilter;
  }

  /** لیست/جست‌وجوی صفحه‌بندی‌شده‌ی محصولات؛ فقط محصولات فعالِ دسته‌بندی فعال */
  async findAll(query: QueryProductsDto): Promise<PaginatedProducts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;
    this.assertValidPriceRange(query);

    const where = this.buildContentFilters(query);
    // فقط محصولات فعالِ دسته‌بندی‌های فعال که حذف نرم نشده‌اند
    where.isActive = true;
    where.deletedAt = null;
    where.category = { ...this.buildCategoryFilter(query), isActive: true };

    const orderBy = PRODUCT_SORT_MAP[query.sort ?? ProductSort.NEWEST];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: PUBLIC_LIST_QUERY_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: items.map(toPublicStock), total, page, limit };
  }

  /**
   * GET /admin/products — لیست مدیریتی با همه‌ی فیلدها (بدون پنهان‌سازی).
   * isActive اختیاری است: 'true' فقط فعال‌ها، 'false' فقط غیرفعال‌ها،
   * بدون پارامتر => هر دو. دسته‌بندی‌ها (فعال/غیرفعال) همیشه دیده می‌شوند
   * و categorySlug/platform فقط روی خود دسته‌بندی اعمال می‌شود.
   */
  async findAllForAdmin(
    query: AdminQueryProductsDto,
  ): Promise<PaginatedAdminProducts> {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIST_LIMIT;
    this.assertValidPriceRange(query);

    const where = this.buildContentFilters(query);
    // محصولات حذف‌نرم‌شده هرگز در لیست ادمین هم دیده نمی‌شوند
    where.deletedAt = null;
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    where.category = this.buildCategoryFilter(query);

    const orderBy = PRODUCT_SORT_MAP[query.sort ?? ProductSort.NEWEST];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** یک محصول فعالِ حذف‌نشده از دسته‌بندی فعال بر اساس اسلاگ؛ در صورت نبود => 404 */
  async findBySlug(slug: string): Promise<PublicProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null,
        category: { isActive: true },
      },
      select: PUBLIC_DETAIL_QUERY_SELECT,
    });
    if (!product) {
      throw new NotFoundException('محصول یافت نشد');
    }
    return toPublicStock(product);
  }

  /**
   * GET /products/filters — گزینه‌های موجود فیلترها (برند/ژانر/منطقه + بازه‌ی قیمت)
   * روی همان محدوده‌ی لیست: فقط محصولات فعالِ حذف‌نشده‌ی دسته‌بندی‌های فعال.
   */
  async findFilters(
    query: ProductFiltersQueryDto,
  ): Promise<ProductFiltersResult> {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      category: {
        isActive: true,
        ...(query.categorySlug ? { slug: query.categorySlug } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
      },
    };

    const [aggregate, products] = await this.prisma.$transaction([
      this.prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true },
      }),
      this.prisma.product.findMany({
        where,
        select: { brand: true, genres: true, region: true },
        take: FILTERS_MAX_PRODUCTS,
      }),
    ]);

    const brands = new Set<string>();
    const genres = new Set<string>();
    const regions = new Set<string>();
    for (const product of products) {
      if (product.brand) {
        brands.add(product.brand);
      }
      for (const genre of product.genres) {
        genres.add(genre);
      }
      if (product.region) {
        regions.add(product.region);
      }
    }

    return {
      brands: [...brands].sort((a, b) => a.localeCompare(b, 'fa')),
      genres: [...genres].sort((a, b) => a.localeCompare(b, 'fa')),
      regions: [...regions].sort((a, b) => a.localeCompare(b, 'fa')),
      price: { min: aggregate._min.price, max: aggregate._max.price },
    };
  }

  /** ساخت محصول؛ اسلاگ تکراری => 409، دسته‌بندی نامعتبر => 400 */
  async create(dto: CreateProductDto): Promise<AdminProductView> {
    // درصد تخفیف همیشه سمت سرور از قیمت‌ها محاسبه می‌شود
    if (dto.compareAtPrice !== undefined) {
      assertValidCompareAtPrice(dto.price, dto.compareAtPrice);
    }

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          price: dto.price,
          stock: dto.stock,
          images: dto.images ?? [],
          brand: dto.brand,
          portsCount: dto.portsCount,
          weight: dto.weight,
          categoryId: dto.categoryId,
          sku: dto.sku,
          compareAtPrice: dto.compareAtPrice,
          discountPercent: computeDiscountPercent(
            dto.price,
            dto.compareAtPrice,
          ),
          region: dto.region,
          genres: dto.genres ?? [],
          specs: dto.specs,
          isActive: dto.isActive ?? true,
          isFeatured: dto.isFeatured ?? false,
        },
        select: ADMIN_SELECT,
      });
    } catch (error) {
      this.handlePrismaError(error, 'محصول');
    }
  }

  /**
   * ویرایش محصول؛ نبود رکورد یا حذف‌نرم‌شده بودن آن => 404، اسلاگ/کد کالای
   * تکراری => 409. خواندن وضعیت فعلی + نوشتن در یک تراکنش انجام می‌شود تا
   * درصد تخفیف همیشه هم‌ساز با قیمت‌های نهایی، فقط سمت سرور، از نو محاسبه شود.
   */
  async update(id: number, dto: UpdateProductDto): Promise<AdminProductView> {
    const data = this.buildUpdateData(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.product.findUnique({
          where: { id },
          select: { price: true, compareAtPrice: true, deletedAt: true },
        });
        // محصول حذف‌نرم‌شده مثل محصول ناموجود است => 404
        if (!current || current.deletedAt !== null) {
          throw new NotFoundException('محصول یافت نشد');
        }

        if (dto.price !== undefined || dto.compareAtPrice !== undefined) {
          const price = dto.price ?? current.price;
          const compareAtPrice =
            dto.compareAtPrice !== undefined
              ? dto.compareAtPrice
              : current.compareAtPrice;
          if (compareAtPrice !== null) {
            assertValidCompareAtPrice(price, compareAtPrice);
          }
          data.discountPercent = computeDiscountPercent(price, compareAtPrice);
        }

        return tx.product.update({
          // شرط deletedAt: null تضمین می‌کند حذف هم‌زمان، رکورد را برنگرداند
          where: { id, deletedAt: null },
          data,
          select: ADMIN_SELECT,
        });
      });
    } catch (error) {
      this.handlePrismaError(error, 'محصول');
    }
  }

  /** داده‌ی ویرایش را فقط از فیلدهای ارسال‌شده می‌سازد (PATCH واقعی) */
  private buildUpdateData(
    dto: UpdateProductDto,
  ): Prisma.ProductUncheckedUpdateInput {
    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.portsCount !== undefined) data.portsCount = dto.portsCount;
    if (dto.weight !== undefined) data.weight = dto.weight;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.compareAtPrice !== undefined) {
      data.compareAtPrice = dto.compareAtPrice;
    }
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.genres !== undefined) data.genres = dto.genres;
    if (dto.specs !== undefined) data.specs = dto.specs;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    return data;
  }

  /**
   * حذف نرم محصول: یک به‌روزرسانی که رکورد را از دید همه‌ی مسیرهای عمومی و
   * مدیریتی پنهان می‌کند. اسلاگ آزاد می‌شود (پیشوند یکتای `deleted-{id}-`) و
   * کد کالای یکتا null می‌شود. محصول ناموجود یا از قبل حذف‌شده => 404 عمومی.
   */
  async remove(id: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, deletedAt: true },
    });
    if (!product || product.deletedAt !== null) {
      throw new NotFoundException('محصول یافت نشد');
    }

    try {
      await this.prisma.product.update({
        // حذف هم‌زمان توسط درخواست دیگر => P2025 => 404
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          isActive: false,
          isFeatured: false,
          slug: buildDeletedSlug(id, product.slug),
          sku: null,
        },
        select: { id: true },
      });
    } catch (error) {
      this.handlePrismaError(error, 'محصول');
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
