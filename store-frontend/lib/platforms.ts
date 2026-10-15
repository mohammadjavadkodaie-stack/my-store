import type { Platform } from "@/lib/api/types";

/**
 * Persian labels for every value of the backend `Platform` enum.
 *
 * The products page prints these (e.g. the list heading for a platform filter).
 * The platform tab bar renders its own Latin labels and does not use this map.
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  PS5: "پلی‌استیشن 5",
  PS4: "پلی‌استیشن 4",
  PS3: "پلی‌استیشن 3",
  PS2: "پلی‌استیشن 2",
  XBOX_SERIES: "ایکس باکس سری X|S",
  XBOX_ONE: "ایکس باکس وان",
  XBOX: "ایکس باکس",
  SWITCH: "نینتندو سوییچ",
  SWITCH_LITE: "نینتندو سوییچ لایت",
  PC: "کامپیوتر",
  STEAM_DECK: "استیم دک",
  PS_VR: "پلی‌استیشن VR",
  ACCESSORY: "لوازم جانبی",
  GIFT_CARD: "گیفت کارت و اشتراک",
};

/**
 * A Set (not `value in PLATFORM_LABELS`) so inherited `Object.prototype` keys
 * such as "constructor" or "toString" can never pass the guard.
 */
const PLATFORM_VALUES: ReadonlySet<string> = new Set(Object.keys(PLATFORM_LABELS));

/** Type guard: narrows an arbitrary query value to the backend `Platform` enum. */
export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && PLATFORM_VALUES.has(value);
}
