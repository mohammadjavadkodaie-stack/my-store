import type { ApiFetcher } from "./request";

/**
 * Saved-address row returned by GET /addresses and by the write endpoints
 * (POST /addresses, PATCH /addresses/:id).
 *
 * `createdAt`/`updatedAt` are returned too but never rendered, so they are not
 * declared here. The backend never returns a phone or a user id — ownership
 * comes from the httpOnly cookie — so neither appears in this shape.
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

/** Max addresses per user — mirrors MAX_ADDRESSES_PER_USER on the backend. */
export const MAX_ADDRESSES_PER_USER = 3;

/**
 * Loads the signed-in visitor's saved addresses (GET /addresses, an array —
 * there is no GET-by-id endpoint, so a single address is always found inside
 * this list).
 *
 * Returns null for any failure — 401, 5xx, unreachable backend, or a payload
 * that fails validation — letting the caller show one generic Persian message.
 * Backend error text is neither rendered nor logged.
 */
export async function getAddresses(
  fetcher: ApiFetcher,
): Promise<Address[] | null> {
  try {
    const payload = await fetcher<unknown>("/addresses", { cache: "no-store" });
    return parseAddresses(payload);
  } catch {
    return null;
  }
}

/**
 * Reads the raw GET /addresses payload: a bare array (the documented shape) of
 * rows that all pass the runtime guard. Anything else — a different envelope or
 * a single malformed row — means the payload cannot be trusted, so it becomes
 * null instead of a partially rendered address book.
 */
function parseAddresses(payload: unknown): Address[] | null {
  if (!Array.isArray(payload)) {
    return null;
  }
  const addresses: Address[] = [];
  for (const row of payload) {
    if (!isAddress(row)) {
      return null;
    }
    addresses.push(row);
  }
  return addresses;
}

/** Runtime guard for one address row (the payload is untrusted). */
function isAddress(value: unknown): value is Address {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "number" &&
    Number.isInteger(raw.id) &&
    raw.id > 0 &&
    (raw.title === null || typeof raw.title === "string") &&
    typeof raw.recipientName === "string" &&
    typeof raw.province === "string" &&
    typeof raw.city === "string" &&
    typeof raw.addressLine === "string" &&
    typeof raw.postalCode === "string" &&
    typeof raw.isDefault === "boolean"
  );
}
