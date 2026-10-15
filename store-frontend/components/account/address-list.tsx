"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";

/**
 * Saved addresses of the signed-in visitor (GET/DELETE/PATCH /addresses).
 *
 * Every call goes through apiFetch, i.e. the "/api" rewrite with
 * credentials: "include" — the httpOnly cookie authenticates the request and the
 * token never reaches application code. The backend derives the owner from that
 * cookie, so no user id is ever sent.
 *
 * The list is state, never a full page reload: DELETE answers with the remaining
 * addresses (used as-is) and PATCH answers with the single updated row (merged
 * into the list). The create/edit pages are separate routes owned by a later
 * task — this component only links to them.
 */

/** Max addresses per user — mirrors MAX_ADDRESSES_PER_USER on the backend. */
const MAX_ADDRESSES = 3;

/**
 * Shape returned by GET /addresses and by the write endpoints' responses.
 * `createdAt`/`updatedAt` are returned too but never rendered, so they are not
 * declared here.
 */
export interface Address {
  id: number;
  title: string | null;
  recipientName: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Same primary link as the rest of the account pages. */
const PRIMARY_LINK_CLASS = `inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS_RING}`;

/** Same secondary/danger buttons as the admin row actions. */
const SECONDARY_BUTTON_CLASS = `rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

const DANGER_BUTTON_CLASS = `rounded-md border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

const DEFAULT_BADGE_CLASS =
  "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground";

const ERROR_TEXT_CLASS =
  "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700";

/**
 * Message shown for a failed /addresses call.
 *
 * The backend's own message is displayed as-is (the address endpoints answer in
 * Persian, e.g. "آدرس یافت نشد" or "حداکثر ۳ آدرس می‌توانید ثبت کنید."), with one
 * exception: a 401 from the JWT guard carries NestJS's untranslated
 * "Unauthorized", so that status gets a fixed Persian text. Anything that is not
 * an ApiError falls back to a generic text.
 */
function describeAddressError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.";
    }
    return error.message;
  }
  return "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
}

/**
 * Rebuilds the list after PATCH /addresses/:id { isDefault: true }.
 *
 * The response is the single updated row and the backend has already cleared the
 * previous default, so the old one is cleared here as well and the updated row
 * moves to the front — the order GET /addresses returns (default first, then
 * oldest first).
 */
function withNewDefault(addresses: Address[], updated: Address): Address[] {
  const others = addresses
    .filter((address) => address.id !== updated.id)
    .map((address) =>
      address.isDefault ? { ...address, isDefault: false } : address,
    );
  return [updated, ...others];
}

interface AddressListProps {
  /** Read-only account phone, read server-side by the page (one per account). */
  phone: string;
}

/** Which request is in flight for which row; `null` means nothing is pending. */
type PendingAction = { id: number; action: "default" | "delete" };

/** One address card plus its actions. */
function AddressCard({
  address,
  pendingAction,
  confirming,
  busy,
  onSetDefault,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  address: Address;
  pendingAction: PendingAction["action"] | null;
  confirming: boolean;
  busy: boolean;
  onSetDefault: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  // The title is optional on the backend, so an untitled address gets a label.
  const title = address.title?.trim();
  const label = title !== undefined && title.length > 0 ? title : "بدون عنوان";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-foreground">{label}</span>
          {address.isDefault && (
            <span className={DEFAULT_BADGE_CLASS}>پیش‌فرض</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/account/addresses/${address.id}/edit`}
            className={SECONDARY_BUTTON_CLASS}
          >
            ویرایش
          </Link>

          {/* Only a non-default address can be made the default: the backend
              only accepts isDefault: true, so the current default has nothing
              to do here. */}
          {!address.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              disabled={busy}
              className={SECONDARY_BUTTON_CLASS}
            >
              {pendingAction === "default" ? "در حال ثبت…" : "پیش‌فرض‌کردن"}
            </button>
          )}

          {/* Two-step delete: the first click only reveals the confirmation. */}
          {confirming ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-foreground/70">
                مطمئنی؟
              </span>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={busy}
                className={DANGER_BUTTON_CLASS}
              >
                {pendingAction === "delete" ? "در حال حذف…" : "تأیید"}
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                disabled={busy}
                className={SECONDARY_BUTTON_CLASS}
              >
                انصراف
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={onAskDelete}
              disabled={busy}
              className={DANGER_BUTTON_CLASS}
            >
              حذف
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-foreground/70">
        <p>
          گیرنده:{" "}
          <span className="font-medium text-foreground">
            {address.recipientName}
          </span>
        </p>
        <p>
          {address.province}، {address.city}
        </p>
        <p className="leading-6">{address.addressLine}</p>
        <p>
          کد پستی: <span dir="ltr">{address.postalCode}</span>
        </p>
      </div>
    </li>
  );
}

/**
 * The saved-address list of /account/addresses.
 *
 * GET /addresses is loaded on mount and never cached (the address book changes
 * on every mutation). "پیش‌فرض‌کردن" is the only PATCH this page sends
 * (isDefault: true — the backend DTO rejects false) and "حذف" always sits behind
 * a second, explicit confirmation step, so a stray click never deletes anything.
 * Every button is disabled while a request is in flight, and each response
 * updates the list in place — no full reload.
 */
export function AddressList({ phone }: AddressListProps) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const busy = pending !== null;

  useEffect(() => {
    let cancelled = false;
    apiFetch<Address[]>("/addresses", { cache: "no-store" })
      .then((rows) => {
        if (!cancelled) {
          setAddresses(rows);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(describeAddressError(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSetDefault(id: number): Promise<void> {
    if (busy) {
      return; // One request at a time.
    }
    setPending({ id, action: "default" });
    setConfirmingId(null);
    setActionError(null);
    try {
      const updated = await apiFetch<Address>(`/addresses/${id}`, {
        method: "PATCH",
        body: { isDefault: true },
        cache: "no-store",
      });
      setAddresses((current) =>
        current === null ? current : withNewDefault(current, updated),
      );
    } catch (cause) {
      setActionError(describeAddressError(cause));
    } finally {
      setPending(null);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    if (busy) {
      return;
    }
    setPending({ id, action: "delete" });
    setActionError(null);
    try {
      // DELETE /addresses/:id answers with the addresses that are left.
      const remaining = await apiFetch<Address[]>(`/addresses/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      setAddresses(remaining);
    } catch (cause) {
      setActionError(describeAddressError(cause));
    } finally {
      setPending(null);
      setConfirmingId(null);
    }
  }

  let body: ReactNode;
  if (loadError !== null) {
    body = (
      <p role="alert" className={ERROR_TEXT_CLASS}>
        {loadError}
      </p>
    );
  } else if (addresses === null) {
    body = (
      <p className="text-sm text-foreground/60">در حال دریافت آدرس‌ها...</p>
    );
  } else if (addresses.length === 0) {
    // Empty state: a short message plus the add link (the only one shown here,
    // see the top row below).
    body = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 p-8 text-center">
        <p className="text-sm font-bold leading-6 text-foreground">
          هنوز آدرسی ثبت نکرده‌اید.
        </p>
        <Link href="/account/addresses/new" className={PRIMARY_LINK_CLASS}>
          افزودن آدرس
        </Link>
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            pendingAction={pending?.id === address.id ? pending.action : null}
            confirming={confirmingId === address.id}
            busy={busy}
            onSetDefault={() => {
              void handleSetDefault(address.id);
            }}
            onAskDelete={() => {
              setConfirmingId(address.id);
              setActionError(null);
            }}
            onCancelDelete={() => {
              setConfirmingId(null);
            }}
            onConfirmDelete={() => {
              void handleDelete(address.id);
            }}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The phone belongs to the account, so it is shown once — never per
          address (the address endpoints do not even return it). */}
      <p className="text-sm text-foreground/70">
        شماره موبایل حساب:{" "}
        <span dir="ltr" className="font-medium text-foreground">
          {phone}
        </span>
      </p>

      {/* Adding is only offered below the backend's 3-address limit; at the
          limit the link is replaced by a short hint. Without a list the empty
          state above carries the add link instead. */}
      {addresses !== null && addresses.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {addresses.length < MAX_ADDRESSES ? (
            <Link href="/account/addresses/new" className={PRIMARY_LINK_CLASS}>
              افزودن آدرس
            </Link>
          ) : (
            <p className="text-xs text-foreground/50">حداکثر ۳ آدرس</p>
          )}
        </div>
      )}

      {actionError !== null && (
        <p role="alert" className={ERROR_TEXT_CLASS}>
          {actionError}
        </p>
      )}

      {body}
    </div>
  );
}

