import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "سبد خرید",
  robots: { index: false, follow: false },
};

/**
 * /cart — guest (localStorage) or signed-in (server) cart; the view picks the
 * flavor from the cart context, so the page itself stays a thin Server
 * Component.
 */
export default function CartPage() {
  return <CartView />;
}
