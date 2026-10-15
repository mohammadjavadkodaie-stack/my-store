/** نام کوکیِ حامل توکن JWT — بین ست‌کردن (login) و خواندن (JwtStrategy) مشترک است */
export const AUTH_COOKIE_NAME = 'access_token';

/** اعتبار پیش‌فرض توکن در نبود JWT_EXPIRES_IN */
export const DEFAULT_JWT_EXPIRES_IN = '2h';

/**
 * الگوریتم JWT — هم در امضا (JwtModule) و هم در راستی‌آزمایی (JwtStrategy) قفل
 * می‌شود تا حمله‌ی «جعل/تغییر الگوریتم» (algorithm confusion) ممکن نباشد.
 */
export const JWT_ALGORITHM = 'HS256' as const;

/** حداقل طول مجاز JWT_SECRET (کاراکتر) — سرور در غیر این صورت اجرا نمی‌شود */
export const JWT_SECRET_MIN_LENGTH = 32;

/** مقدار JWT_EXPIRES_IN از متغیر محیطی با پیش‌فرض ۲ ساعت */
export function getJwtExpiresIn(): string {
  const value = process.env.JWT_EXPIRES_IN?.trim();
  return value ? value : DEFAULT_JWT_EXPIRES_IN;
}

/** میلی‌ثانیه‌ی هر واحد مدت زمان پشتیبانی‌شده */
const DURATION_UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * تبدیل مدت‌زمان متنی (مثل «2h»، «15m»، «30s»، «7d» یا ثانیه‌ی خام مثل «7200»)
 * به میلی‌ثانیه؛ برای هم‌تراز‌کردن maxAge کوکی با انقضای توکن استفاده می‌شود.
 * در صورت فرمت نامعتبر خطای واضح پرتاب می‌شود تا در راه‌اندازی شکست سریع رخ دهد.
 */
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd]?)$/.exec(value);
  if (!match) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN value ("${value}"); expected formats: 30s, 15m, 2h, 7d or plain seconds`,
    );
  }
  const amount = Number(match[1]);
  const unitMs = match[2] ? DURATION_UNIT_MS[match[2]] : 1_000;
  return amount * unitMs;
}
