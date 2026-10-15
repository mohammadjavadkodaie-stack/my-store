import type { Metadata } from "next";
import { CheckoutView } from "@/components/cart/checkout-view";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "تکمیل خرید",
  robots: { index: false, follow: false },
};

/**
 * /checkout — server-side guard first: an anonymous visitor is sent to
 * /login?next=/checkout (the cart page's "پرداخت" button does the same for a
 * guest), so the view itself only renders for a real session.
 */
export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <CheckoutView />;
}
