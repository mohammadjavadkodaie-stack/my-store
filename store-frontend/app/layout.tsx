import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader, { STORE_NAME } from "@/components/layout/site-header";
import { SiteStatusBanner } from "@/components/site-status/site-status-banner";
import { SupportWidget } from "@/components/support/support-widget";
import { CartProvider } from "@/lib/cart/cart-provider";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteStatusEnabled } from "@/lib/site-status/server";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: STORE_NAME,
    template: `%s | ${STORE_NAME}`,
  },
  description:
    "خرید بازی و کنسول؛ بازی‌های پلی‌استیشن، ایکس باکس و نینتندو سوییچ همراه با لوازم جانبی، گیفت کارت و اشتراک.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Same React-cached read the header performs: the result also tells the cart
  // context which cart source (server vs. guest storage) to load client-side.
  const user = await getCurrentUser();

  // Owner-only "the site is off for everybody else" banner. The extra
  // GET /site-status call is made *only* for the owner (`?.` short-circuits),
  // and only the owner can even reach this layout while the site is stopped —
  // everyone else is answered by proxy.ts with the maintenance page.
  const siteStoppedForOthers =
    user?.isOwner === true && !(await getSiteStatusEnabled());

  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} h-full antialiased`}
    >
      {/* pb-20 (mobile only) reserves the height of the fixed bottom nav so it
          never covers the footer or the last line of content; from `md` up the
          bar is gone and the padding is removed. */}
      <body className="flex min-h-screen flex-col bg-background pb-20 text-foreground md:pb-0">
        {/* Client boundary: the provider stores the cart state (server cart
            for a signed-in visitor, localStorage otherwise) for the header
            badge and every cart/checkout component below. */}
        <CartProvider authenticated={user !== null}>
          {/* First element of the page: while the site is stopped, the owner
              gets a one-line reminder plus the button that turns it back on. */}
          {siteStoppedForOthers && <SiteStatusBanner />}
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          {/* Storefront-only bottom navigation, mobile only. Rendered once,
              after the footer, with the server-resolved auth state. */}
          <MobileBottomNav isLoggedIn={user !== null} />
        </CartProvider>
        {/* Floating support launcher + chat popup, mounted once for the whole
            storefront; the client component hides itself under /admin. */}
        <SupportWidget />
      </body>
    </html>
  );
}
