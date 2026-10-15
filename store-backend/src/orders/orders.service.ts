import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_ORDERS_LIMIT,
  DEFAULT_ORDERS_PAGE,
  ListOrdersDto,
  MAX_ORDERS_LIMIT,
} from './dto/list-orders.dto';

/**
 * اقلام سبد برای ثبت سفارش؛ مرتب‌شده بر اساس productId تا هنگام کسر موجودی
 * ردیف‌ها همیشه به ترتیبی یکسان قفل شوند و deadlock رخ ندهد.
 */
const CART_ITEMS_FOR_ORDER_SELECT = {
  productId: true,
  quantity: true,
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      isActive: true,
      deletedAt: true,
      category: { select: { isActive: true } },
    },
  },
} satisfies Prisma.CartItemSelect;

/** فیلدهای لیست سفارش‌ها: بدون اقلام، فقط شمارش اقلام هر سفارش */
const ORDER_LIST_SELECT = {
  id: true,
  status: true,
  paymentStatus: true,
  total: true,
  createdAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

/** فیلدهای جزئیات سفارش: اقلام با اسنپ‌شات نام و قیمت لحظه‌ی خرید */
const ORDER_DETAIL_SELECT = {
  id: true,
  status: true,
  paymentStatus: true,
  total: true,
  createdAt: true,
  items: {
    select: {
      productId: true,
      productName: true,
      price: true,
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

type OrderListRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_LIST_SELECT;
}>;
type OrderDetailRow = Prisma.OrderGetPayload<{
  select: typeof ORDER_DETAIL_SELECT;
}>;

/** یک قلم سفارش در پاسخ: قیمت واحد = قیمت لحظه‌ی خرید؛ جمع خط سمت سرور */
export interface OrderItemView {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** نمای جزئیات سفارش — پاسخ POST /orders و GET /orders/:id */
export interface OrderDetailView {
  id: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: Date;
  items: OrderItemView[];
}

/** هر سفارش در لیست — بدون اقلام، فقط شمارش آن‌ها */
export interface OrderSummaryView {
  id: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
}

/** نتیجه‌ی GET /orders — هم‌شکل صفحه‌بندی محصولات */
export interface PaginatedOrders {
  items: OrderSummaryView[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ثبت سفارش از سبد خرید کاربر جاری — همه‌چیز در «یک» تراکنش:
   * خواندن سبد از دیتابیس، رد سبد خالی/کالای غیرفعال، کسر اتمی موجودی،
   * ساخت سفارش با قیمت لحظه‌ی خرید و اسنپ‌شات نام محصول، و خالی‌کردن سبد.
   * هیچ قیمت/جمع/وضعیت/شناسه‌ای از کلاینت نمی‌آید و بدنه‌ای وجود ندارد.
   */
  async createFromCart(userId: number): Promise<OrderDetailView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cartItems = await tx.cartItem.findMany({
          where: { userId },
          orderBy: { productId: 'asc' },
          select: CART_ITEMS_FOR_ORDER_SELECT,
        });

        // سبد خالی => سفارشی ساخته نمی‌شود
        if (cartItems.length === 0) {
          throw new BadRequestException('سبد خرید خالی است');
        }

        // پاک‌کردن اولیه‌ی سبد همین کاربر: ردیف‌ها قفل می‌شوند تا درخواست
        // هم‌زمان دوم پس از آزادشدن قفل صفر ردیف ببیند و همین‌جا شکست بخورد.
        const cleared = await tx.cartItem.deleteMany({ where: { userId } });
        if (cleared.count !== cartItems.length) {
          throw new BadRequestException('سبد خرید تغییر کرده است');
        }

        // محصول یا دسته‌ی غیرفعال یا محصول حذف‌نرم‌شده => پیام عمومی، بدون ساخت سفارش
        for (const item of cartItems) {
          if (
            !item.product.isActive ||
            item.product.deletedAt !== null ||
            !item.product.category.isActive
          ) {
            throw new BadRequestException(
              'یکی از کالاهای سبد خرید در دسترس نیست',
            );
          }
        }

        // کسر اتمی موجودی: هر ردیف با «یک» UPDATE شرطی کسر می‌شود؛ اگر ردیفی
        // 0 بار به‌روزرسانی شد یعنی موجودی کافی نیست (یا کالا دیگر فعال/در
        // دسترس نیست) و کل تراکنش rollback می‌شود. چون خواندنِ جدا و سپس نوشتن
        // وجود ندارد، دو سفارش هم‌زمان روی آخرین واحد هرگز بیش‌فروشی نمی‌کنند.
        // ردیف‌ها بالاتر بر اساس productId مرتب شده‌اند تا ترتیب قفل‌گیری ثابت
        // بماند و deadlock رخ ندهد. قیمت واحد = همان قیمت مؤثری که سبد خرید با
        // آن جمع می‌زند و جمع کل همیشه سمت سرور محاسبه می‌شود.
        let total = 0;
        const items: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
        for (const item of cartItems) {
          const decrement = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
              isActive: true,
              deletedAt: null,
              category: { isActive: true },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (decrement.count === 0) {
            // موجودی کافی نیست؛ کل تراکنش rollback می‌شود (نه سفارش، نه کسر جزئی)
            throw new ConflictException('موجودی کالا کافی نیست');
          }
          const unitPrice = item.product.price;
          total += unitPrice * item.quantity;
          if (total > 2147483647) {
            throw new BadRequestException('مجموع سفارش بیش از حد مجاز است');
          }
          items.push({
            productId: item.productId,
            productName: item.product.name,
            price: unitPrice,
            quantity: item.quantity,
          });
        }

        const order = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.pending,
            total,
            items: { create: items },
          },
          select: ORDER_DETAIL_SELECT,
        });

        return this.toOrderDetailView(order);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /** سفارش‌های کاربر جاری — جدیدترین اول، صفحه‌بندی‌شده؛ فقط خواندن */
  async findAll(
    userId: number,
    query: ListOrdersDto,
  ): Promise<PaginatedOrders> {
    const page = this.toPositiveInt(query.page) ?? DEFAULT_ORDERS_PAGE;
    const limit = Math.min(
      this.toPositiveInt(query.limit) ?? DEFAULT_ORDERS_LIMIT,
      MAX_ORDERS_LIMIT,
    );

    try {
      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: { userId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: ORDER_LIST_SELECT,
        }),
        this.prisma.order.count({ where: { userId } }),
      ]);

      return {
        items: orders.map((order) => this.toOrderSummaryView(order)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * جزئیات سفارش مالک: findFirst با { id, userId } — نبودن سفارش یا مالِ
   * نبودن آن هر دو به یک 404 عمومی ختم می‌شوند؛ فقط خواندن.
   */
  async findOne(userId: number, id: number): Promise<OrderDetailView> {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id, userId },
        select: ORDER_DETAIL_SELECT,
      });
      if (!order) {
        throw new NotFoundException('سفارش یافت نشد');
      }
      return this.toOrderDetailView(order);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /** نگاشت ردیف جزئیات به پاسخ؛ قیمت واحد و جمع خط سمت سرور محاسبه می‌شوند */
  private toOrderDetailView(order: OrderDetailRow): OrderDetailView {
    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.price,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
      })),
    };
  }

  private toOrderSummaryView(order: OrderListRow): OrderSummaryView {
    return {
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
      itemCount: order._count.items,
    };
  }

  /** صفحه/سقف کوئری به عدد مثبت؛ نبود مقدار معتبر => پیش‌فرض */
  private toPositiveInt(
    value: number | string | undefined,
  ): number | undefined {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
  }

  /** نگاشت خطاهای Prisma به پاسخ‌های عمومی HTTP (بدون لو دادن جزئیات) */
  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException('ارجاع نامعتبر است');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('سفارش یافت نشد');
      }
    }
    throw error;
  }
}
