import Link from "next/link";
import { DiscountBandSettingsCard } from "@/components/admin/discount-band-settings-card";
import { SlideRowActions } from "@/components/admin/slide-row-actions";
import { getAdminDiscountBand } from "@/lib/api/admin-discount-band";
import { getAdminSlides, type AdminSlide } from "@/lib/api/admin-slides";
import { serverFetch } from "@/lib/api/server";

/** Focus-ring + link styles copied from the product list. */
const RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LINK_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary " +
  RING;
const TH_CLASS = "px-3 py-2 text-start font-medium";
const TD_CLASS = "px-3 py-3 text-foreground/80";
const MESSAGE_CLASS =
  "mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70";

/** Table columns rendered from one list; the action cell is separate. */
const COLUMNS = ["تصویر", "عنوان", "دکمه و لینک", "وضعیت"] as const;

/** The backend refuses more than this many slides (admin/slides DTO). */
const MAX_SLIDES = 10;

const faNumber = new Intl.NumberFormat("fa-IR");

/**
 * Only http(s) and root-relative image URLs are rendered; any other value
 * (empty string, data:, javascript:, ...) falls back to the neutral placeholder
 * box instead of reaching the <img> src (same stance as the product card).
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
  );
}

/** Trimmed text of an optional field; blank values are treated as absent. */
function optionalText(value: string | null): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

/** Active/inactive pill; green for active, muted for inactive. */
function StatusBadge({ active }: { active: boolean }) {
  const tone = active
    ? "border-green-600/30 bg-green-600/10 text-green-700"
    : "border-border bg-foreground/5 text-foreground/60";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}
    >
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

/**
 * One row; every cell renders only runtime-guarded (untrusted) text, and the
 * thumbnail is shown only for a root-relative or https URL.
 */
function SlideRow({
  slide,
  ids,
  index,
}: {
  slide: AdminSlide;
  ids: readonly number[];
  index: number;
}) {
  const imageSrc = slide.imageUrl.trim();
  const title = optionalText(slide.title) ?? "بدون عنوان";
  const buttonLabel = optionalText(slide.buttonLabel);
  const linkPath = optionalText(slide.linkPath);

  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-3 py-3">
        {isRenderableImageSrc(imageSrc) ? (
          // eslint-disable-next-line @next/next/no-img-element -- slide images come from arbitrary backend hosts, so a plain img is used instead of next/image
          <img
            src={imageSrc}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-12 w-20 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded-md border border-border bg-foreground/5 text-xs text-foreground/40">
            بدون تصویر
          </div>
        )}
      </td>
      <td className="px-3 py-3 font-medium text-foreground">{title}</td>
      <td className={TD_CLASS}>
        {buttonLabel === null && linkPath === null ? (
          "—"
        ) : (
          <span className="flex flex-col gap-1">
            {buttonLabel !== null ? <span>{buttonLabel}</span> : null}
            {linkPath !== null ? (
              <span dir="ltr" className="font-mono text-xs text-foreground/70">
                {linkPath}
              </span>
            ) : null}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <StatusBadge active={slide.isActive} />
      </td>
      <td className="px-3 py-3">
        <SlideRowActions slide={slide} ids={ids} index={index} />
      </td>
    </tr>
  );
}

/**
 * Admin slide list: the home-page slides in display order, with a thumbnail,
 * title, button/link, status and the per-row actions.
 *
 * Server Component: the rows come from the backend's @Roles(ADMIN) endpoint
 * GET /admin/slides through serverFetch, so the call carries the admin's
 * cookie. The endpoint returns the rows already ordered, so they are rendered
 * as received — the id list handed to the row actions is that same order. Any
 * failure or untrusted payload collapses to one generic Persian message. The
 * create link is hidden once the backend's maximum of ten slides is reached.
 */
export default async function AdminSlidesPage() {
  const [slides, discountBand] = await Promise.all([
    getAdminSlides(serverFetch),
    getAdminDiscountBand(serverFetch),
  ]);
  const count = slides?.length ?? 0;
  const ids = slides?.map((slide) => slide.id) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <DiscountBandSettingsCard settings={discountBand} />

      <section className="rounded-lg border border-border bg-background p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              اسلایدهای صفحه اصلی
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              ترتیب نمایش از بالا به پایین است؛ حداکثر{" "}
              {faNumber.format(MAX_SLIDES)} اسلاید.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {slides === null ? null : (
              <span className="text-sm font-medium text-foreground/70">
                {faNumber.format(count)} از {faNumber.format(MAX_SLIDES)}
              </span>
            )}
            {count < MAX_SLIDES ? (
              <Link href="/admin/slides/new" className={LINK_CLASS}>
                افزودن اسلاید
              </Link>
            ) : null}
          </div>
        </div>

        {slides === null ? (
          <p className={MESSAGE_CLASS}>
            دریافت فهرست اسلایدها ممکن نشد؛ لطفاً دوباره تلاش کنید.
          </p>
        ) : slides.length === 0 ? (
          <p className={MESSAGE_CLASS}>اسلایدی ثبت نشده است.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-start text-foreground/60">
                  {COLUMNS.map((label) => (
                    <th key={label} scope="col" className={TH_CLASS}>
                      {label}
                    </th>
                  ))}
                  <th scope="col" className={TH_CLASS}>
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide, index) => (
                  <SlideRow
                    key={slide.id}
                    slide={slide}
                    ids={ids}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
