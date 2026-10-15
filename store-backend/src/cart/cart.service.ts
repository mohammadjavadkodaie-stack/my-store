import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeDiscountPercent } from '../products/products.service';
import {
  AddCartItemDto,
  MAX_CART_ITEMS,
  MAX_CART_ITEM_QUANTITY,
} from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/**
 * فیلدهای لازم از محصول برای سبد خرید. stock و isActive/category.isActive و
 * deletedAt فقط برای محاسبه‌ی سمت سرور (پرچم‌ها و بررسی موجودی) خوانده می‌شوند؛
 * userId هرگز انتخاب نمی‌شود تا داده‌ی کاربر دیگری بیرون نرود.
 */
const CART_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  images: true,
  price: true,
  compareAtPrice: true,
  stock: true,
  isActive: true,
  deletedAt: true,
  category: { select: { isActive: true } },
} satisfies Prisma.ProductSelect;

/** نمای محصول در سبد: تصویر اول، قیمت مؤثر و تخفیف (هم‌منطق با سرویس محصولات) */
export interface CartProductView {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  stock: number;
}

/** یک ردیف سبد با جمع خط و پرچم‌های وضعیت (همه سمت سرور محاسبه می‌شوند) */
export interface CartItemView {
  productId: number;
  quantity: number;
  lineTotal: number;
  outOfStock: boolean;
  quantityExceedsStock: boolean;
  inactive: boolean;
  product: CartProductView;
}

/** پاسخ سبد خرید: ردیف‌ها + جمع کل (از قیمت‌های فعلی دیتابیس) */
export interface CartView {
  items: CartItemView[];
  total: number;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** سبد کاربر جاری — فقط ردیف‌های همین کاربر */
  async getCart(userId: number): Promise<CartView> {
    return this.buildCart(this.prisma, userId);
  }

  /**
   * افزودن یا افزایش یک کالا. محصول نبود/غیرفعال/حذف‌شده => 404 عمومی.
   * سقف 10 برای هر کالا و سقف 30 کالای متمایز؛ فراتر از موجودی => 400.
   */
  async addItem(userId: number, dto: AddCartItemDto): Promise<CartView> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: dto.productId,
          isActive: true,
          deletedAt: null,
          category: { isActive: true },
        },
        select: { stock: true },
      });
      if (!product) {
        throw new NotFoundException('محصول یافت نشد');
      }

      const existing = await tx.cartItem.findUnique({
        where: { userId_productId: { userId, productId: dto.productId } },
        select: { quantity: true },
      });

      const resultingQuantity = (existing?.quantity ?? 0) + dto.quantity;
      if (resultingQuantity > MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestException(
          `تعداد هر کالا حداکثر ${MAX_CART_ITEM_QUANTITY} است`,
        );
      }
      if (resultingQuantity > product.stock) {
        throw new BadRequestException('موجودی کافی نیست');
      }
      if (!existing) {
        const distinctCount = await tx.cartItem.count({ where: { userId } });
        if (distinctCount >= MAX_CART_ITEMS) {
          throw new BadRequestException(
            `سبد خرید حداکثر ${MAX_CART_ITEMS} کالای متمایز می‌پذیرد`,
          );
        }
      }

      await tx.cartItem.upsert({
        where: { userId_productId: { userId, productId: dto.productId } },
        create: {
          userId,
          productId: dto.productId,
          quantity: resultingQuantity,
        },
        update: { quantity: resultingQuantity },
      });

      return this.buildCart(tx, userId);
    });
  }

  /**
   * تغییر تعداد یک کالای موجود؛ نبود در سبد این کاربر => 404.
   * محصول حذف‌نرم‌شده در دسترس نیست => همان 404 عمومی.
   */
  async updateItem(
    userId: number,
    productId: number,
    dto: UpdateCartItemDto,
  ): Promise<CartView> {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { product: { select: { stock: true, deletedAt: true } } },
      });
      if (!item) {
        throw new NotFoundException('کالا در سبد خرید یافت نشد');
      }
      if (item.product.deletedAt !== null) {
        throw new NotFoundException('محصول یافت نشد');
      }
      if (dto.quantity > item.product.stock) {
        throw new BadRequestException('موجودی کافی نیست');
      }

      await tx.cartItem.update({
        where: { userId_productId: { userId, productId } },
        data: { quantity: dto.quantity },
      });

      return this.buildCart(tx, userId);
    });
  }

  /** حذف یک کالا — فقط ردیف همین کاربر (نبودن ردیف خطا نیست) */
  async removeItem(userId: number, productId: number): Promise<CartView> {
    await this.prisma.cartItem.deleteMany({ where: { userId, productId } });
    return this.buildCart(this.prisma, userId);
  }

  /** خالی‌کردن سبد — فقط ردیف‌های همین کاربر */
  async clear(userId: number): Promise<CartView> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return this.buildCart(this.prisma, userId);
  }

  /**
   * ساخت نمای سبد از قیمت‌های فعلی دیتابیس؛ جمع خط و جمع کل همیشه
   * سمت سرور محاسبه می‌شوند و هیچ قیمتی از کلاینت گرفته نمی‌شود.
   */
  private async buildCart(
    client: Prisma.TransactionClient,
    userId: number,
  ): Promise<CartView> {
    const rows = await client.cartItem.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      select: {
        productId: true,
        quantity: true,
        product: { select: CART_PRODUCT_SELECT },
      },
    });

    let total = 0;
    const items = rows.map((row) => {
      const product = row.product;
      const lineTotal = product.price * row.quantity;
      total += lineTotal;
      return {
        productId: row.productId,
        quantity: row.quantity,
        lineTotal,
        outOfStock: product.stock <= 0,
        quantityExceedsStock: row.quantity > product.stock,
        inactive:
          !product.isActive ||
          product.deletedAt !== null ||
          !product.category.isActive,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0] ?? null,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          discountPercent: computeDiscountPercent(
            product.price,
            product.compareAtPrice,
          ),
          stock: product.stock,
        },
      } satisfies CartItemView;
    });

    return { items, total };
  }
}
