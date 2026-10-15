"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteAdminSlide,
  reorderAdminSlides,
  setAdminSlideActive,
  type AdminSlide,
} from "@/lib/api/admin-slides";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";

/** Button styles copied from the product row actions. */
const SECONDARY_BUTTON_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const DANGER_BUTTON_CLASS =
  "rounded-md border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

/** Small in-row action link, copied from the category list. */
const ROW_LINK_CLASS =
  "text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * One fixed Persian message per failure; the backend's own text is never
 * rendered — it may leak internal or user data.
 */
function describeApiError(error: unknown, notFound: string): string {
  const fallback = "خطایی رخ داد؛ لطفاً دوباره تلاش کنید.";
  if (!isApiError(error)) {
    return fallback;
  }
  if (error.status === 401) {
    return "اعتبار ورود منقضی شده است؛ لطفاً دوباره وارد شوید.";
  }
  if (error.status === 403) {
    return "شما به این بخش دسترسی ندارید.";
  }
  if (error.status === 404) {
    return notFound;
  }
  if (error.isNetworkError) {
    return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
  }
  return fallback;
}

/** The request a row is currently running, so every button can be disabled. */
type PendingAction = "up" | "down" | "toggle" | "delete";

interface SlideRowActionsProps {
  /** The row's guarded slide; only the id and status are needed here. */
  slide: Pick<AdminSlide, "id" | "isActive">;
  /** Every slide id in display order: the reorder endpoint needs the full list. */
  ids: readonly number[];
  /** This row's position inside `ids`; the ends cannot move any further. */
  index: number;
}

/**
 * Per-row order controls, status toggle and delete, both behind a fixed
 * confirmation step (no window.confirm). Reordering swaps this row with its
 * neighbour in the list the server already returned and posts the whole new
 * order, so the display order always comes from the backend. Every request ends
 * with `router.refresh()`, which re-renders the list from the server.
 */
export function SlideRowActions({ slide, ids, index }: SlideRowActionsProps) {
  const router = useRouter();
  const { id, isActive } = slide;

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null;

  const canMoveUp = index > 0;
  const canMoveDown = index < ids.length - 1;

  /** Moves this row one step up (-1) or down (+1) and saves the new order. */
  async function handleMove(direction: -1 | 1) {
    const target = index + direction;
    if (busy || target < 0 || target >= ids.length) {
      return;
    }
    setPending(direction === -1 ? "up" : "down");
    setConfirming(false);
    setError(null);
    try {
      const next = [...ids];
      next[index] = ids[target];
      next[target] = id;
      await reorderAdminSlides(next, apiFetch);
      router.refresh();
    } catch (cause) {
      setError(describeApiError(cause, "اسلاید مورد نظر پیدا نشد."));
    } finally {
      setPending(null);
    }
  }

  async function handleToggle() {
    if (busy) {
      return;
    }
    setPending("toggle");
    setConfirming(false);
    setError(null);
    try {
      await setAdminSlideActive(id, !isActive, apiFetch);
      router.refresh();
    } catch (cause) {
      setError(describeApiError(cause, "اسلاید مورد نظر پیدا نشد."));
    } finally {
      setPending(null);
    }
  }

  async function handleDelete() {
    if (busy) {
      return;
    }
    setPending("delete");
    setError(null);
    try {
      await deleteAdminSlide(id, apiFetch);
      router.refresh();
    } catch (cause) {
      setError(describeApiError(cause, "اسلاید مورد نظر پیدا نشد."));
    } finally {
      setPending(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => handleMove(-1)}
        disabled={busy || !canMoveUp}
        aria-label="انتقال به بالا"
        title="انتقال به بالا"
        className={SECONDARY_BUTTON_CLASS}
      >
        {pending === "up" ? "در حال ذخیره…" : "بالا"}
      </button>
      <button
        type="button"
        onClick={() => handleMove(1)}
        disabled={busy || !canMoveDown}
        aria-label="انتقال به پایین"
        title="انتقال به پایین"
        className={SECONDARY_BUTTON_CLASS}
      >
        {pending === "down" ? "در حال ذخیره…" : "پایین"}
      </button>

      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={SECONDARY_BUTTON_CLASS}
      >
        {pending === "toggle"
          ? "در حال تغییر وضعیت…"
          : isActive
            ? "غیرفعال کن"
            : "فعال کن"}
      </button>

      <Link href={`/admin/slides/${id}/edit`} className={ROW_LINK_CLASS}>
        ویرایش
      </Link>

      {confirming ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground/70">
            مطمئنی؟
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className={DANGER_BUTTON_CLASS}
          >
            {pending === "delete" ? "در حال حذف…" : "بله"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className={SECONDARY_BUTTON_CLASS}
          >
            انصراف
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className={DANGER_BUTTON_CLASS}
        >
          حذف
        </button>
      )}

      {error !== null ? (
        <p
          role="alert"
          className="w-full text-end text-xs font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
