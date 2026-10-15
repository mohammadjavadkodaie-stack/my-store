/**
 * The 31 provinces of Iran — copied verbatim (same strings, same order) from the
 * backend's single source of truth: store-backend/src/addresses/provinces.ts.
 *
 * `province` is the only address field with a fixed value set: the backend DTOs
 * check it with `@IsIn(PROVINCES)` and answer 400 for anything else, so the
 * province <select> of the address form must offer exactly these strings.
 * Never invent a province here — the backend list is the authority.
 */
export const PROVINCES: readonly string[] = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];

/** Type guard for a province value; safe on untrusted (typed) input. */
export function isProvince(value: unknown): value is string {
  return typeof value === "string" && PROVINCES.includes(value);
}
