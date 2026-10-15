import { Platform, PrismaClient, Role } from '@prisma/client';
import { normalizePhone } from '../src/auth/phone.util';

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = '/placeholder/product.svg';

type CategorySeed = {
  slug: string;
  name: string;
  platform: Platform;
};

const CATEGORIES: CategorySeed[] = [
  { slug: 'ps5-consoles', name: 'کنسول پلی استیشن 5', platform: Platform.PS5 },
  { slug: 'ps4-consoles', name: 'کنسول پلی استیشن 4', platform: Platform.PS4 },
  {
    slug: 'xbox-consoles',
    name: 'کنسول ایکس باکس',
    platform: Platform.XBOX_SERIES,
  },
  {
    slug: 'switch-consoles',
    name: 'کنسول نینتندو سوییچ',
    platform: Platform.SWITCH,
  },
  { slug: 'steam-deck', name: 'استیم دک', platform: Platform.STEAM_DECK },
  { slug: 'ps5-games', name: 'بازی پلی استیشن 5', platform: Platform.PS5 },
  {
    slug: 'switch-games',
    name: 'بازی نینتندو سوییچ',
    platform: Platform.SWITCH,
  },
  { slug: 'controllers', name: 'دسته و کنترلر', platform: Platform.ACCESSORY },
  { slug: 'headsets', name: 'هدست گیمینگ', platform: Platform.ACCESSORY },
  {
    slug: 'stands-and-docks',
    name: 'پایه شارژ و استند',
    platform: Platform.ACCESSORY,
  },
  { slug: 'cables', name: 'کابل HDMI', platform: Platform.ACCESSORY },
  { slug: 'ps-vr', name: 'واقعیت مجازی', platform: Platform.PS_VR },
  { slug: 'gift-cards', name: 'گیفت کارت', platform: Platform.GIFT_CARD },
  { slug: 'subscriptions', name: 'اشتراک', platform: Platform.GIFT_CARD },
];

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  compareAt?: number;
  stock: number;
  sold: number;
  brand?: string;
  isFeatured?: boolean;
  region?: string;
  genres?: string[];
};

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'ps5-slim-digital',
    name: 'کنسول پلی استیشن 5 اسلیم دیجیتال',
    description:
      'کنسول پلی استیشن ۵ نسخه اسلیم دیجیتال برای بازی‌های نسل جدید.',
    category: 'ps5-consoles',
    price: 44990000,
    compareAt: 47500000,
    stock: 8,
    sold: 120,
    brand: 'سونی',
    isFeatured: true,
  },
  {
    slug: 'ps5-slim-disc',
    name: 'کنسول پلی استیشن 5 اسلیم دیسک خور',
    description:
      'کنسول پلی استیشن ۵ اسلیم دیسک‌خور با امکان اجرای بازی‌های فیزیکی.',
    category: 'ps5-consoles',
    price: 47170000,
    stock: 5,
    sold: 95,
    brand: 'سونی',
    isFeatured: true,
  },
  {
    slug: 'ps5-pro',
    name: 'کنسول پلی استیشن 5 پرو',
    description:
      'قوی‌ترین کنسول پلی استیشن ۵ با پردازش گرافیکی ارتقایافته برای ۴K.',
    category: 'ps5-consoles',
    price: 62350000,
    compareAt: 65900000,
    stock: 3,
    sold: 40,
    brand: 'سونی',
    isFeatured: true,
  },
  {
    slug: 'ps4-slim-1tb',
    name: 'کنسول پلی استیشن 4 اسلیم 1 ترابایت',
    description:
      'کنسول پلی استیشن ۴ اسلیم با یک ترابایت حافظه و کتابخانه بزرگ بازی.',
    category: 'ps4-consoles',
    price: 39100000,
    stock: 6,
    sold: 210,
    brand: 'سونی',
  },
  {
    slug: 'xbox-series-s',
    name: 'کنسول ایکس باکس سری اس',
    description: 'کنسول ایکس باکس سری اس، گزینه اقتصادی گیمینگ نسل جدید.',
    category: 'xbox-consoles',
    price: 25900000,
    compareAt: 27500000,
    stock: 10,
    sold: 70,
    brand: 'مایکروسافت',
  },
  {
    slug: 'xbox-series-x',
    name: 'کنسول ایکس باکس سری ایکس',
    description: 'کنسول ایکس باکس سری ایکس با قدرت پردازش ۴K و درایو بلوری.',
    category: 'xbox-consoles',
    price: 42500000,
    stock: 0,
    sold: 55,
    brand: 'مایکروسافت',
  },
  {
    slug: 'switch-oled',
    name: 'نینتندو سوییچ OLED',
    description: 'نینتندو سوییچ مدل OLED با نمایشگر رنگی‌تر و پایه پهن‌تر.',
    category: 'switch-consoles',
    price: 22900000,
    compareAt: 24500000,
    stock: 12,
    sold: 160,
    brand: 'نینتندو',
    isFeatured: true,
  },
  {
    slug: 'steam-deck-oled-512',
    name: 'استیم دک OLED 512 گیگابایت',
    description: 'کنسول دستی استیم دک OLED با ۵۱۲ گیگابایت حافظه.',
    category: 'steam-deck',
    price: 41000000,
    stock: 2,
    sold: 12,
    brand: 'Valve',
  },
  {
    slug: 'dualsense-controller',
    name: 'دسته دوال سنس',
    description: 'دسته دوال سنس با لرزش لمسی و ماشه‌های تطبیقی.',
    category: 'controllers',
    price: 8240000,
    stock: 30,
    sold: 300,
    brand: 'سونی',
    isFeatured: true,
  },
  {
    slug: 'xbox-wireless-controller',
    name: 'دسته ایکس باکس بی‌سیم',
    description: 'دسته بی‌سیم ایکس باکس با طراحی ارگونومیک و اتصال بلوتوث.',
    category: 'controllers',
    price: 6200000,
    stock: 18,
    sold: 140,
    brand: 'مایکروسافت',
  },
  {
    slug: 'joy-con-pair',
    name: 'جوی کان نینتندو سوییچ',
    description: 'جفت جوی کان اصلی نینتندو سوییچ برای بازی دونفره.',
    category: 'controllers',
    price: 8400000,
    compareAt: 8900000,
    stock: 14,
    sold: 90,
    brand: 'نینتندو',
  },
  {
    slug: 'pulse-3d-headset',
    name: 'هدست بی‌سیم پالس ۳D',
    description: 'هدست بی‌سیم پالس ۳D با صدای فضایی سه‌بعدی.',
    category: 'headsets',
    price: 11500000,
    stock: 7,
    sold: 45,
    brand: 'سونی',
  },
  {
    slug: 'dualsense-charging-station',
    name: 'پایه شارژ دوال سنس',
    description: 'پایه شارژ دوال سنس برای شارژ هم‌زمان دو دسته.',
    category: 'stands-and-docks',
    price: 2900000,
    stock: 20,
    sold: 110,
    brand: 'سونی',
  },
  {
    slug: 'ps5-slim-stand',
    name: 'استند عمودی PS5 اسلیم',
    description: 'استند عمودی مخصوص کنسول پلی استیشن ۵ اسلیم.',
    category: 'stands-and-docks',
    price: 1200000,
    stock: 25,
    sold: 60,
    brand: 'سونی',
  },
  {
    slug: 'hdmi-2-1-cable-2m',
    name: 'کابل HDMI 2.1 دو متری',
    description: 'کابل HDMI 2.1 دو متری با پشتیبانی از ۴K و ۱۲۰ هرتز.',
    category: 'cables',
    price: 650000,
    stock: 50,
    sold: 200,
    brand: 'Ugreen',
  },
  {
    slug: 'ps-vr2',
    name: 'هدست واقعیت مجازی PS VR2',
    description: 'هدست واقعیت مجازی PS VR2 با نمایشگر OLED و ردیابی چشم.',
    category: 'ps-vr',
    price: 39000000,
    stock: 2,
    sold: 8,
    brand: 'سونی',
  },
  {
    slug: 'ac-black-flag-resynced',
    name: "Assassin's Creed Black Flag Resynced",
    description:
      'ماجراجویی دزدان دریایی در دنیای Assassin’s Creed با گرافیک بازسازی‌شده.',
    category: 'ps5-games',
    price: 3200000,
    stock: 15,
    sold: 30,
    brand: 'Ubisoft',
    region: 'ریجن ۲',
    genres: ['ماجراجویی', 'اکشن'],
  },
  {
    slug: 'ea-sports-ufc-6',
    name: 'EA Sports UFC 6',
    description: 'بازی EA Sports UFC 6، شبیه‌ساز مبارزات MMA.',
    category: 'ps5-games',
    price: 3400000,
    compareAt: 3700000,
    stock: 11,
    sold: 22,
    brand: 'EA',
    isFeatured: true,
    region: 'ریجن ۲',
    genres: ['ورزشی', 'اکشن'],
  },
  {
    slug: 'cod-black-ops',
    name: 'Call of Duty: Black Ops',
    description: 'بازی Call of Duty: Black Ops، شوتر اول‌شخص اکشن.',
    category: 'ps5-games',
    price: 3300000,
    stock: 0,
    sold: 75,
    brand: 'Activision',
    region: 'ریجن ۲',
    genres: ['اکشن'],
  },
  {
    slug: 'deer-and-boy',
    name: 'Deer & Boy',
    description: 'بازی Deer & Boy، ماجراجویی آرام و هنری برای نینتندو سوییچ.',
    category: 'switch-games',
    price: 1100000,
    stock: 9,
    sold: 5,
    region: 'ریجن ۲',
    genres: ['ماجراجویی'],
  },
  {
    slug: 'psn-gift-card-20-us',
    name: 'گیفت کارت پلی استیشن 20 دلاری آمریکا',
    description: 'گیفت کارت ۲۰ دلاری پلی استیشن برای حساب آمریکا.',
    category: 'gift-cards',
    price: 2800000,
    stock: 100,
    sold: 180,
    brand: 'سونی',
    region: 'آمریکا',
  },
  {
    slug: 'ps-plus-essential-3m',
    name: 'اشتراک پلی استیشن پلاس اسنشیال ۳ ماهه',
    description:
      'اشتراک سه ماهه پلی استیشن پلاس اسنشیال با بازی آنلاین و بازی ماهانه.',
    category: 'subscriptions',
    price: 3900000,
    stock: 100,
    sold: 260,
    brand: 'سونی',
    isFeatured: true,
    region: 'رجیستری',
  },
  {
    slug: 'xbox-game-pass-ultimate-3m',
    name: 'اشتراک ایکس باکس گیم پس اولتیمیت ۳ ماهه',
    description:
      'اشتراک سه ماهه ایکس باکس گیم پس اولتیمیت شامل کتابخانه بازی و EA Play.',
    category: 'subscriptions',
    price: 4600000,
    stock: 100,
    sold: 150,
    brand: 'مایکروسافت',
    region: 'رجیستری',
  },
];

function discountPercent(price: number, compareAtPrice: number | null): number {
  if (compareAtPrice === null || compareAtPrice <= price) {
    return 0;
  }

  return Math.floor(((compareAtPrice - price) / compareAtPrice) * 100);
}

async function seedCatalog(): Promise<void> {
  const categoryIds = new Map<string, number>();

  for (const [index, category] of CATEGORIES.entries()) {
    const data = {
      name: category.name,
      platform: category.platform,
      sortOrder: index,
    };

    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: data,
      create: { slug: category.slug, ...data },
      select: { id: true },
    });

    categoryIds.set(category.slug, saved.id);
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.category);

    if (categoryId === undefined) {
      throw new Error(
        `Unknown category slug in seed data: ${product.category}`,
      );
    }

    const compareAtPrice = product.compareAt ?? null;
    const data = {
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice,
      discountPercent: discountPercent(product.price, compareAtPrice),
      stock: product.stock,
      soldCount: product.sold,
      images: [PLACEHOLDER_IMAGE],
      brand: product.brand ?? null,
      region: product.region ?? null,
      genres: product.genres ?? [],
      isFeatured: product.isFeatured ?? false,
      categoryId,
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { slug: product.slug, ...data },
    });
  }

  console.log(
    `Seed: ${CATEGORIES.length} categories and ${PRODUCTS.length} products upserted.`,
  );
}

async function seedAdmin(): Promise<void> {
  const rawPhone = process.env.SEED_ADMIN_PHONE?.trim();

  if (!rawPhone) {
    return;
  }

  // شماره هرگز چاپ نمی‌شود؛ فقط نرمال‌سازی و درج/به‌روزرسانی می‌شود
  const phone = normalizePhone(rawPhone);

  await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      firstName: 'Admin',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  console.log('Seed: admin account upserted.');
}

/**
 * حساب مالک سایت (OWNER_PHONE) — همیشه باید موجود باشد تا شماره‌ی مالک از
 * مسیر ثبت‌نام عمومی قابل تصاحب نباشد (S5: مالکیت = شماره‌ی همین ردیف).
 * نقش عمداً USER است؛ حساب‌های ADMIN اجازه‌ی ورود ندارند و مالک باید بتواند
 * در حالت خاموش هم وارد شود. شماره هرگز چاپ نمی‌شود.
 */
async function seedOwner(): Promise<void> {
  const rawPhone = process.env.OWNER_PHONE?.trim();

  if (!rawPhone) {
    return;
  }

  const phone = normalizePhone(rawPhone);

  if (!/^09\d{9}$/.test(phone)) {
    throw new Error('OWNER_PHONE is invalid (expected an Iranian mobile number)');
  }

  await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      firstName: 'Owner',
      lastName: 'Owner',
      role: Role.USER,
    },
  });

  console.log('Seed: owner account upserted.');
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed: production environment, sample catalog skipped.');
  } else {
    await seedCatalog();
  }

  await seedAdmin();
  await seedOwner();
}

main()
  .catch((error: unknown) => {
    console.error(
      'Seed failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
