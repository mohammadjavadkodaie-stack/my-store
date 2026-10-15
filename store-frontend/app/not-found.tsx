import type { Metadata } from "next";
import Link from "next/link";

/** The root layout template appends the store name to this title. */
export const metadata: Metadata = {
  title: "صفحه پیدا نشد",
};

/** App-wide 404 page: rendered for notFound() calls and unmatched routes. */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-4 py-16 text-center sm:py-24">
      <p className="text-5xl font-black text-primary">۴۰۴</p>
      <h1 className="text-xl font-black leading-8 text-foreground sm:text-2xl">
        صفحه‌ای که دنبالش بودید پیدا نشد
      </h1>
      <p className="max-w-md text-sm leading-7 text-foreground/70">
        ممکن است نشانی تغییر کرده باشد یا محصول مورد نظر حذف شده باشد.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          بازگشت به خانه
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-sm font-extrabold text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          مشاهده محصولات
        </Link>
      </div>
    </div>
  );
}
