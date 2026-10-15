import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackToTop } from "./back-to-top";

/**
 * Static year constant: a `new Date()` call here would render a different value
 * on the server and on the client, which React reports as a hydration error.
 * Bump this number when the year changes.
 */
const COPYRIGHT_YEAR = 2026;

/** Shared keyboard-focus ring, identical to the header's focusable controls. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Line-art icon frame shared by the footer feature icons. lucide-react is not a
 * dependency of this project (and no new packages may be installed), so the few
 * icons the footer needs are drawn inline in the same 24x24 stroke style as the
 * header icons. The stroke is `currentColor`, so a path can switch to the
 * lighter purple accent simply by carrying the `text-primary/40` class.
 */
function Icon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** 1) Express delivery: a parcel with motion lines behind it. */
function ExpressDeliveryIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 6 21 10v6l-8 4-8-4v-6z" />
      <path d="m5 10 8 4 8-4" />
      <path d="M13 14v6" />
      <path className="text-primary/40" d="M2 9h2.5M1 12.5h3.5M2 16h2.5" />
    </Icon>
  );
}

/** 2) Pay at location: a map pin holding a bank card. */
function PayAtLocationIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 21.5c4.2-4 7-7.6 7-11.5a7 7 0 1 0-14 0c0 3.9 2.8 7.5 7 11.5z" />
      <rect x="8.5" y="7" width="7" height="5.5" rx="1.2" />
      <path className="text-primary/40" d="M8.5 9.2h7" />
    </Icon>
  );
}

/** 3) Round-the-clock support: a support headset with a mic boom. */
function SupportIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.6" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.6" />
      <path className="text-primary/40" d="M19.5 19v.4a2.6 2.6 0 0 1-2.6 2.6h-3" />
    </Icon>
  );
}

/** 4) Return guarantee: a parcel with a return arrow curving back over it. */
function ReturnGuaranteeIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 12 12 8l8 4v6l-8 4-8-4z" />
      <path d="m4 12 8 4 8-4" />
      <path d="M12 16v6" />
      <path className="text-primary/40" d="M18 9.5a6.5 6.5 0 0 0-12 0" />
      <path className="text-primary/40" d="m3.5 7 2.5 2.5L8.5 7" />
    </Icon>
  );
}

/** 5) Authenticity guarantee: a shield badge with a checkmark. */
function AuthenticityBadgeIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 2.5 20 6v6c0 4.4-3.2 7.9-8 9.5-4.8-1.6-8-5.1-8-9.5V6z" />
      <path className="text-primary/40" d="m8.6 11.8 2.4 2.4 4.5-4.9" />
    </Icon>
  );
}

/**
 * Feature strip of the footer, in reading order — which in the RTL document
 * lays them out from right to left exactly as listed here.
 */
const FEATURES: {
  FeatureIcon: (props: { className?: string }) => ReactNode;
  label: string;
}[] = [
  { FeatureIcon: ExpressDeliveryIcon, label: "امکان تحویل اکسپرس" },
  { FeatureIcon: PayAtLocationIcon, label: "امکان پرداخت در محل" },
  { FeatureIcon: SupportIcon, label: "۷ روز هفته، ۲۴ ساعته" },
  { FeatureIcon: ReturnGuaranteeIcon, label: "هفت روز ضمانت بازگشت کالا" },
  { FeatureIcon: AuthenticityBadgeIcon, label: "ضمانت اصل بودن کالا" },
];

/**
 * Site footer: the Digikala-style top strip — logo + back-to-top, the support
 * phone line, and the five trust features — followed by the copyright line.
 *
 * Server Component on purpose: only the back-to-top button needs the browser,
 * and it is the one client boundary rendered here.
 */
export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:py-10">
        {/* Row 1: logo on the right (flex-start in RTL), back-to-top on the
            left (flex-end). */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="بازی بازار — صفحه اصلی"
            className={`shrink-0 rounded-lg ${FOCUS_RING}`}
          >
            <Image
              src="/logo.png"
              alt="بازی بازار"
              width={1774}
              height={887}
              quality={100}
              className="h-10 w-auto object-contain"
            />
          </Link>

          <BackToTop />
        </div>

        {/* Row 2: support phone, right-aligned, split by a thin divider. The
            number alone is forced LTR so its digits never reorder in the RTL
            line. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/70">
          <span className="whitespace-nowrap">
            تلفن پشتیبانی:{" "}
            <a
              href="tel:09392258483"
              dir="ltr"
              className={`inline-block rounded text-foreground/80 transition-colors hover:text-primary ${FOCUS_RING}`}
            >
              09392258483
            </a>
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="whitespace-nowrap">
            ۷ روز هفته، ۲۴ ساعت پاسخگوی شما هستیم
          </span>
        </div>

        {/* Row 3: the five trust features, equal-width and spread evenly. They
            wrap to two columns on mobile, where the last one spans both. */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-5 sm:gap-x-2">
          {FEATURES.map(({ FeatureIcon, label }, index) => (
            <li
              key={label}
              className={`flex flex-col items-center gap-3 text-center ${
                index === FEATURES.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }`}
            >
              <FeatureIcon className="size-10 text-primary" />
              <span className="text-xs leading-5 text-foreground/70">
                {label}
              </span>
            </li>
          ))}
        </ul>

        {/* Bottom line: the pre-existing copyright sentence, restyled to fit. */}
        <p className="border-t border-border pt-6 text-center text-xs text-foreground/60">
          © {COPYRIGHT_YEAR}{" "}
          {/* Same brand mark as the header, only smaller so it sits inside the
              footer sentence. */}
          <Image
            src="/logo.png"
            alt="بازی بازار"
            width={1774}
            height={887}
            quality={100}
            className="inline-block h-5 w-auto object-contain align-middle"
          />{" "}
          — تمامی حقوق محفوظ است.
        </p>
      </div>
    </footer>
  );
}

