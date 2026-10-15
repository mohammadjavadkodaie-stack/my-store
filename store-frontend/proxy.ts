import { NextResponse, type NextRequest } from "next/server";
import { OWNER_LOGIN_PATH } from "@/lib/site-status/constants";
import { MAINTENANCE_HTML } from "@/lib/site-status/maintenance";
import {
  getSiteStatusEnabled,
  isOwnerSessionCookie,
} from "@/lib/site-status/server";

/**
 * Server-side gate of the global site kill switch (security rules F2 + F3).
 *
 * Runs before every page route (Next 16 renamed the `middleware` file
 * convention to `proxy`; the Node.js runtime is the default and `runtime` must
 * not be configured here). The backend enforces the same rule on its own — this
 * gate only decides what a *visitor of the site* sees:
 *
 * 1. `/owner-login` is always let through: it is the unlinked route where the
 *    owner signs in while the site is stopped (rule F4) and it holds no links.
 * 2. Otherwise the backend's public GET /site-status is asked first. A `true`
 *    answer means business as usual.
 * 3. Stopped (or unreadable/unreachable, which fails closed): the visitor's
 *    cookie is verified *against the backend* — GET /auth/me, `isOwner: true` —
 *    and only then does the real site render for the owner.
 * 4. Everyone else gets the same static 503 maintenance document, with
 *    `Cache-Control: no-store` (a per-cookie answer must never be cached by a
 *    shared cache) and `X-Robots-Tag: noindex`.
 *
 * The owner phone, the owner check and the token never appear in this file: the
 * cookie is forwarded as an opaque header and the decision comes from the
 * backend. Nothing is logged.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1) The owner's unlinked sign-in route stays reachable in both states.
  if (
    pathname === OWNER_LOGIN_PATH ||
    pathname.startsWith(`${OWNER_LOGIN_PATH}/`)
  ) {
    return NextResponse.next();
  }

  // 2) Open site (or unreachable backend -> `false`): no gate at all.
  if (await getSiteStatusEnabled()) {
    return NextResponse.next();
  }

  // 3) Stopped: only a session the backend reports as the owner passes.
  if (await isOwnerSessionCookie(request.headers.get("cookie"))) {
    return NextResponse.next();
  }

  // 4) Maintenance response — identical bytes for every non-owner.
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      // The answer depends on the cookie, so caches must key on it.
      vary: "Cookie",
    },
  });
}

export const config = {
  /**
   * Every page route, except:
   * - `api/` — the backend answers those itself (its own 503 + JSON while
   *   stopped, its own 401/403), and the "/api" rewrite must stay untouched;
   * - `_next/` — build output, optimized images and the dev-server assets;
   * - the static files of `public/` and of `app/` (`logo.png`, `icon.png`,
   *   `icon.svg`, `icons/`, `placeholder/`, `favicon.ico`), which must never be
   *   answered with an HTML document.
   */
  matcher: [
    "/((?!api/|_next/|favicon.ico|logo.png|icon.png|icon.svg|icons/|placeholder/).*)",
  ],
};
