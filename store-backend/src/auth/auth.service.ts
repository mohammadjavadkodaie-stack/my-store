import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isOwnerPhone } from '../site-status/owner.util';
import { siteStoppedException } from '../site-status/site-stopped';
import { SiteStatusService } from '../site-status/site-status.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { durationToMs, getJwtExpiresIn } from './jwt.constants';

/** پیام عمومی تکراری‌بودن شماره — بدون هیچ جزئیاتی از دیتابیس */
const PHONE_ALREADY_REGISTERED = 'این شماره موبایل قبلاً ثبت شده';

/**
 * پیام عمومی ورود ناموفق — برای «کاربر ناموجود» و «کاربر ادمین» دقیقاً یکسان
 * است؛ پس پاسخ هیچ سرنخی درباره‌ی وجود یا نقش شماره نمی‌دهد.
 */
const INVALID_CREDENTIALS = 'شماره یا کد تأیید نادرست است';

/** پیام عمومی نبود سرویس پیامک — هیچ جزئیات داخلی فاش نمی‌شود */
const OTP_PROVIDER_UNAVAILABLE = 'سرویس ارسال کد تأیید در دسترس نیست';

/** فیلدهای امن کاربر — هیچ ستون حساسی از دیتابیس انتخاب نمی‌شود */
const SAFE_USER_SELECT = {
  id: true,
  phone: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

/** ردیف کاربر با فیلدهای امن (ورودی نگاشت به UserEntity) */
type SafeUserRow = Prisma.UserGetPayload<{ select: typeof SAFE_USER_SELECT }>;

/** خروجی جریان‌های ورود/ثبت‌نام: کاربر امن + توکن + عمر کوکی */
type AuthSession = {
  user: UserEntity;
  token: string;
  cookieMaxAgeMs: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly siteStatusService: SiteStatusService,
  ) {}

  /**
   * درخواست کد یکبارمصرف. تا زمان اتصال سرویس پیامک، هیچ پیامکی ارسال
   * نمی‌شود و فقط وضعیت «ثبت‌شده بودن» شماره برگردانده می‌شود.
   */
  async requestOtp(dto: RequestOtpDto): Promise<{ registered: boolean }> {
    // S4: در حالت خاموش (kill switch) فقط شماره‌ی مالک به این مسیر می‌رسد؛
    // بقیه‌ی شماره‌ها همان پاسخ عمومی 503 را می‌گیرند و هیچ کدی ارسال نمی‌شود.
    await this.assertAuthAllowed(dto.phone);
    // هنوز ارائه‌دهنده‌ی پیامک وجود ندارد؛ بیرون از حالت توسعه => 503 عمومی
    if (process.env.OTP_DEV_BYPASS !== 'true') {
      throw new ServiceUnavailableException(OTP_PROVIDER_UNAVAILABLE);
    }

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true },
    });

    return { registered: user !== null };
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    // اعتبارسنجی کد یکبارمصرف (در حالت توسعه: هر کد ۶ رقمیِ معتبر)
    await this.verifyCode(dto.phone, dto.code);

    // S5: شمارهی مالک هرگز از مسیر ثبتنام عمومی ساخته نمیشود. پاسخ دقیقاً
    // همان پیام «قبلاً ثبت شده» است تا وجود شمارهی مالک فاش نشود.
    if (isOwnerPhone(dto.phone)) {
      throw new ConflictException(PHONE_ALREADY_REGISTERED);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(PHONE_ALREADY_REGISTERED);
    }

    let createdUser: User;
    try {
      createdUser = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          // نقش همیشه ثابت است و هرگز از ورودی کلاینت گرفته نمی‌شود؛
          // ارتقا به ADMIN فقط دستی در دیتابیس یا توسط ادمین دیگر.
          role: Role.USER,
        },
      });
    } catch (error) {
      // اگر دو ثبت‌نام هم‌زمان از بررسی بالا رد شوند،
      // unique constraint شماره این رقابت را قطعی می‌کند (کد P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(PHONE_ALREADY_REGISTERED);
      }
      throw error;
    }

    // ثبت‌نام موفق = ورود خودکار (ست‌کردن همان کوکی httpOnly در کنترلر)
    return this.issueSession(createdUser);
  }

  /**
   * ورود کاربر با شماره موبایل و کد تأیید و صدور JWT برای کوکی httpOnly.
   *
   * نکات امنیتی:
   * - پیام خطا برای «کاربر ناموجود» و «کاربر ادمین» دقیقاً یکسان است.
   * - ادمین‌ها حتی در حالت توسعه هم بدون کد واقعی اجازه‌ی ورود ندارند.
   * - توکن هرگز در بدنه‌ی پاسخ برنمی‌گردد.
   */
  async login(dto: LoginDto): Promise<AuthSession> {
    // S4: در حالت خاموش فقط شمارهی مالک میتواند وارد شود (برای بازکردن سایت)
    await this.assertAuthAllowed(dto.phone);

    await this.verifyCode(dto.phone, dto.code);

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    // ادمین‌ها نمی‌توانند با bypass توسعه وارد شوند؛ پاسخ دقیقاً مثل ناموجود.
    // استثنا: شماره‌ی مالک — چون تنها راه بازکردن سایتِ خاموش، ورودِ مالک است و
    // اگر نقش مالک در دیتابیس ADMIN شود نباید برای همیشه از ورود محروم بماند
    // (هویت مالک از شماره تأییدشده می‌آید، نه از نقش).
    if (!user || (user.role === Role.ADMIN && !isOwnerPhone(user.phone))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueSession(user);
  }

  /**
   * ویرایش پروفایل کاربر جاری (PATCH /auth/profile).
   *
   * نکات امنیتی:
   * - شناسه‌ی کاربر فقط از توکن (پارامتر id) می‌آید؛ هرگز از بدنه/پارامتر URL.
   * - فقط firstName و lastName به‌روزرسانی می‌شوند؛ phone/role و هر فیلد دیگر
   *   حتی اگر در بدنه بیایند (whitelist + forbidNonWhitelisted) با 400 رد می‌شوند.
   * - خروجی دقیقاً همان شکل پاسخ login است.
   */
  async updateProfile(id: number, dto: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { firstName: dto.firstName, lastName: dto.lastName },
      select: SAFE_USER_SELECT,
    });

    return this.toUserEntity(user);
  }

  /**
   * بارگذاری امن کاربر بر اساس شناسه — توسط JwtStrategy در «هر» درخواست
   * فراخوانی می‌شود؛ بنابراین حذف حساب بلافاصله دسترسی را قطع می‌کند.
   */
  async findUserById(id: number): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toUserEntity(user) : null;
  }

  /**
   * TODO: replace with real OTP verification
   *
   * تا زمان اتصال سرویس پیامک، فقط در حالت توسعه (OTP_DEV_BYPASS=true) هر کد
   * ۶ رقمیِ معتبر پذیرفته می‌شود؛ در غیر این صورت 503 عمومی برگردانده می‌شود.
   */
  private async verifyCode(phone: string, code: string): Promise<void> {
    if (process.env.OTP_DEV_BYPASS === 'true') {
      return;
    }
    throw new ServiceUnavailableException(OTP_PROVIDER_UNAVAILABLE);
  }

  /**
   * S4 (لایه‌ی دوم حفاظت): در حالت خاموش فقط شماره‌ی مالک اجازه‌ی ورود/درخواست
   * کد دارد. گارد سراسری سایت پیش‌تر همین کار را می‌کند؛ این بررسی تضمین می‌کند
   * حتی اگر مسیری از گارد رد شود، برای غیرمالک «هیچ کدی ارسال» و «هیچ توکنی
   * صادر» نشود. پاسخ دقیقاً همان پاسخ عمومی گارد است.
   */
  private async assertAuthAllowed(phone: string): Promise<void> {
    if (await this.siteStatusService.isEnabled()) {
      return;
    }

    if (isOwnerPhone(phone)) {
      return;
    }

    throw siteStoppedException();
  }

  /** صدور توکن و ساخت پاسخ امن ورود/ثبت‌نام */
  private async issueSession(user: User): Promise<AuthSession> {
    // امضا با الگوریتم و اعتبار تعریف‌شده در JwtModule (HS256 قفل‌شده).
    // نقش در توکن اطلاعاتی است؛ نقشِ معتبر در هر درخواست از دیتابیس خوانده می‌شود.
    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    // maxAge کوکی دقیقاً برابر با اعتبار توکن است
    return {
      user: this.toUserEntity(user),
      token,
      cookieMaxAgeMs: durationToMs(getJwtExpiresIn()),
    };
  }

  /** نگاشت ردیف امن کاربر به موجودیت پاسخ API (فقط فیلدهای امن) */
  private toUserEntity(user: SafeUserRow): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.phone = user.phone;
    entity.firstName = user.firstName;
    entity.lastName = user.lastName;
    entity.role = user.role;
    // مالک‌بودن فقط سمت سرور و با مقایسه‌ی شماره‌ی همین ردیف با OWNER_PHONE
    // محاسبه می‌شود؛ شماره‌ی مالک هرگز در پاسخ فاش نمی‌شود.
    entity.isOwner = isOwnerPhone(user.phone);
    return entity;
  }
}
