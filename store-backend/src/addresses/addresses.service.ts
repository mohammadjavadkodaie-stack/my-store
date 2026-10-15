import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAddressDto,
  MAX_ADDRESSES_PER_USER,
} from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * فیلدهای قابل‌بازگشت آدرس. userId عمداً انتخاب نمی‌شود تا هیچ داده‌ی
 * مرتبط با مالکیت به کلاینت نشت نکند.
 */
const ADDRESS_SELECT = {
  id: true,
  title: true,
  recipientName: true,
  province: true,
  city: true,
  addressLine: true,
  postalCode: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AddressSelect;

type AddressRow = Prisma.AddressGetPayload<{ select: typeof ADDRESS_SELECT }>;

/** نمای آدرس در پاسخ API (بدون userId) */
export interface AddressView {
  id: number;
  title: string | null;
  recipientName: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** پیام یکسان برای «نبود آدرس» و «مالِ کاربر دیگری بودن» — بدون نشت مالکیت */
const ADDRESS_NOT_FOUND_MESSAGE = 'آدرس یافت نشد';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * آدرس‌های کاربر جاری: پیش‌فرض اول، سپس به ترتیب زمان ساخت (قدیمی‌تر اول).
   * فقط خواندن و فقط ردیف‌های همین کاربر.
   */
  async findAll(userId: number): Promise<AddressView[]> {
    return this.listAddresses(this.prisma, userId);
  }

  /**
   * ساخت آدرس جدید — همه‌چیز در یک تراکنش:
   * 1) قفل ردیف کاربر (SELECT ... FOR UPDATE) تا شمارش و درج آدرس‌ها بین
   *    درخواست‌های هم‌زمان سریالی شود و سقف ۳ آدرس هرگز دور زده نشود.
   * 2) شمارش آدرس‌های کاربر؛ ۳ یا بیشتر => 400.
   * 3) اولین آدرس همیشه پیش‌فرض است.
   * 4) اگر isDefault=true درخواست شود، پیش‌فرض‌های قبلی خاموش می‌شوند.
   * userId/phone هرگز از بدنه گرفته نمی‌شود.
   */
  async create(userId: number, dto: CreateAddressDto): Promise<AddressView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockUser(tx, userId);

        const count = await tx.address.count({ where: { userId } });
        if (count >= MAX_ADDRESSES_PER_USER) {
          throw new BadRequestException('حداکثر ۳ آدرس می‌توانید ثبت کنید.');
        }

        const isFirst = count === 0;
        const isDefault = isFirst || dto.isDefault === true;

        if (isDefault && !isFirst) {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const address = await tx.address.create({
          data: {
            userId,
            title: dto.title ?? null,
            recipientName: dto.recipientName,
            province: dto.province,
            city: dto.city,
            addressLine: dto.addressLine,
            postalCode: dto.postalCode,
            isDefault,
          },
          select: ADDRESS_SELECT,
        });

        return this.toAddressView(address);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * ویرایش آدرس مالک — در یک تراکنش. نبود آدرس یا مالِ کاربر دیگری بودن هر دو
   * یک 404 عمومی می‌دهند. همه‌ی نوشتن‌ها با شرط { id, userId } انجام می‌شود.
   * isDefault=true ابتدا پیش‌فرض‌های دیگر را خاموش می‌کند، سپس این یکی را.
   */
  async update(
    userId: number,
    id: number,
    dto: UpdateAddressDto,
  ): Promise<AddressView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockUser(tx, userId);

        const existing = await tx.address.findFirst({
          where: { id, userId },
          select: { id: true, isDefault: true },
        });
        if (!existing) {
          throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
        }

        const data: Prisma.AddressUpdateManyMutationInput = {};
        if (dto.title !== undefined) {
          data.title = dto.title;
        }
        if (dto.recipientName !== undefined) {
          data.recipientName = dto.recipientName;
        }
        if (dto.province !== undefined) {
          data.province = dto.province;
        }
        if (dto.city !== undefined) {
          data.city = dto.city;
        }
        if (dto.addressLine !== undefined) {
          data.addressLine = dto.addressLine;
        }
        if (dto.postalCode !== undefined) {
          data.postalCode = dto.postalCode;
        }

        if (dto.isDefault === true && !existing.isDefault) {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
          data.isDefault = true;
        }

        const updated = await tx.address.updateMany({
          where: { id, userId },
          data,
        });
        if (updated.count === 0) {
          throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
        }

        const address = await tx.address.findFirst({
          where: { id, userId },
          select: ADDRESS_SELECT,
        });
        if (!address) {
          throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
        }
        return this.toAddressView(address);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * حذف آدرس مالک — در یک تراکنش و با شرط { id, userId }. اگر آدرس حذف‌شده
   * پیش‌فرض بوده و آدرس دیگری باقی مانده باشد، قدیمی‌ترین آدرس باقی‌مانده
   * پیش‌فرض می‌شود. پاسخ: فهرست آدرس‌های باقی‌مانده‌ی کاربر.
   */
  async remove(userId: number, id: number): Promise<AddressView[]> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockUser(tx, userId);

        const existing = await tx.address.findFirst({
          where: { id, userId },
          select: { id: true, isDefault: true },
        });
        if (!existing) {
          throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
        }

        const deleted = await tx.address.deleteMany({ where: { id, userId } });
        if (deleted.count === 0) {
          throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
        }

        if (existing.isDefault) {
          const next = await tx.address.findFirst({
            where: { userId },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { id: true },
          });
          if (next) {
            await tx.address.update({
              where: { id: next.id },
              data: { isDefault: true },
            });
          }
        }

        return this.listAddresses(tx, userId);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  /**
   * قفل ردیف کاربر در تراکنش جاری (SELECT ... FOR UPDATE) تا عملیات
   * نوشتن آدرس‌های یک کاربر بین درخواست‌های هم‌زمان سریالی شود.
   */
  private async lockUser(
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  }

  /** فهرست آدرس‌های کاربر: پیش‌فرض اول، سپس قدیمی‌ترها اول */
  private async listAddresses(
    client: Prisma.TransactionClient,
    userId: number,
  ): Promise<AddressView[]> {
    const rows = await client.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: ADDRESS_SELECT,
    });
    return rows.map((row) => this.toAddressView(row));
  }

  private toAddressView(address: AddressRow): AddressView {
    return {
      id: address.id,
      title: address.title,
      recipientName: address.recipientName,
      province: address.province,
      city: address.city,
      addressLine: address.addressLine,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /** نگاشت خطاهای Prisma به پاسخ‌های عمومی HTTP (بدون لو دادن جزئیات) */
  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('اطلاعات تکراری است');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException('ارجاع نامعتبر است');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(ADDRESS_NOT_FOUND_MESSAGE);
      }
    }
    throw error;
  }
}
