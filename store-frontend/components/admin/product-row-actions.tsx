"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminProduct } from "@/lib/api/admin-products";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";

/** Button styles copied from the category form's shared classes. */
const SECONDARY_BUTTON_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const DANGER_BUTTON_CLASS =
  "rounded-md border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

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

interface ProductRowActionsProps {
  /** The row's guarded product; only the id and status are needed here. */
  product: Pick<AdminProduct, "id" | "isActive">;
}

/**
 * Per-row status toggle and delete, both behind a fixed confirmation step (no
 * window.confirm). Only PATCH/DELETE /products/:id are called — never a
 * state-changing GET — and the list is re-rendered with `router.refresh()`
 * afterwards, so the status badge always comes from the server.
 */
export function ProductRowActions({ product }: ProductRowActionsProps) {
  const router = useRouter();
  const { id, isActive } = product;

  const [pending, setPending] = useState<"toggle" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null;

  async function handleToggle() {
    if (busy) {
      return;
    }
    setPending("toggle");
    setConfirming(false);
    setError(null);
    try {
      await apiFetch<unknown>(`/products/${id}`, {
        method: "PATCH",
        body: { isActive: !isActive },
      });
      router.refresh();
    } catch (cause) {
      setError(describeApiError(cause, "محصول مورد نظر پیدا نشد."));
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
      await apiFetch<unknown>(`/products/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      setError(describeApiError(cause, "محصول مورد نظر پیدا نشد."));
    } finally {
      setPending(null);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={SECONDARY_BUTTON_CLASS}
      >
        {pending === "toggle" ? "در حال تغییر وضعیت…" : isActive ? "غیرفعال کن" : "فعال کن"}
      </button>

      {confirming ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground/70">مطمئنی؟</span>
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
        <p role="alert" className="w-full text-end text-xs font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
