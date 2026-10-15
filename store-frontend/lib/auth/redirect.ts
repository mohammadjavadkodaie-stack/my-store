/**
 * Sanitizes a `next` query value (the destination after login/register) into a
 * path that is safe to redirect or link to.
 *
 * The raw value comes straight from the URL, so it is attacker-controlled:
 * values like "//evil.example", "/\evil.example", "https://evil.example" or
 * crafted scheme strings must never become a redirect target. Only a plain
 * in-app path passes every check; everything else falls back to "/".
 */

/** Longest `next` value accepted — anything longer is treated as invalid. */
const MAX_NEXT_PATH_LENGTH = 200;

/** C0 control characters (0x00-0x1F) and DEL (0x7F). */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") {
    return "/";
  }
  if (raw.length === 0 || raw.length > MAX_NEXT_PATH_LENGTH) {
    return "/";
  }
  // An in-app path only: no absolute URL, no empty value.
  if (!raw.startsWith("/")) {
    return "/";
  }
  // "//host" and "/\host" are read as other origins by browsers.
  if (raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  // No backslash anywhere (path confusion / Windows-style separators).
  if (raw.includes("\\")) {
    return "/";
  }
  // Control characters could split headers or confuse parsers.
  if (CONTROL_CHARS.test(raw)) {
    return "/";
  }
  // ":" before the first "?" could form a scheme; inside the query it is harmless.
  const pathPart = raw.split("?")[0] ?? raw;
  if (pathPart.includes(":")) {
    return "/";
  }
  return raw;
}
