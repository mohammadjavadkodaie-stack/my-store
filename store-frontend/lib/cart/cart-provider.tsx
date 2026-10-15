"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY } from "./constants";
import {
  addCartItem,
  clearServerCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./client";
import { cartErrorMessages } from "./errors";
import { clearGuestCart, readGuestCart, writeGuestCart } from "./guest-storage";
import type { Cart, GuestCartItem } from "./types";

/** Outcome of addToCart; the product page turns it into a visitor-safe text. */
export type AddToCartResult = "ok" | "limit" | "error";

interface CartContextValue {
  /** Mirrors the server session (layout passes it in). */
  authenticated: boolean;
  /** Server cart for a signed-in visitor; null while loading. */
  cart: Cart | null;
  /** Guest storage entries; [] for signed-in visitors. */
  guestItems: GuestCartItem[];
  /** True once the initial load (server or storage) has finished. */
  loaded: boolean;
  /** Badge count: total quantity across all lines. */
  itemCount: number;
  /** True while a cart mutation is in flight. */
  pending: boolean;
  /** Generic Persian message of the last failed operation (null otherwise). */
  error: string | null;
  addToCart(productId: number, slug: string, quantity?: number): Promise<AddToCartResult>;
  setQuantity(productId: number, quantity: number): Promise<boolean>;
  removeItem(productId: number): Promise<boolean>;
  clear(): Promise<boolean>;
  /** Re-reads the server cart / guest storage (after a failed order, etc.). */
  refresh(): Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const GUEST_CART_FULL_MESSAGE = "ظرفیت سبد خرید پر است.";
const GUEST_MAX_QUANTITY_MESSAGE =
  "حداکثر ۱۰ عدد از هر کالا می‌توانید سفارش دهید.";

export function CartProvider({
  authenticated,
  children,
}: {
  authenticated: boolean;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the active cart source whenever the session state changes: the
  // server cart for a signed-in visitor, guest storage otherwise. Guest
  // storage is only readable in the browser, so this runs in an effect.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoaded(false);
    if (authenticated) {
      setCart(null);
      setGuestItems([]);
      getCart()
        .then((value) => {
          if (!cancelled) {
            setCart(value);
            setLoaded(true);
          }
        })
        .catch(() => {
          // Badge/cart page fall back to "empty"; the error surfaces on the
          // next mutation as a generic Persian message.
          if (!cancelled) {
            setCart(null);
            setLoaded(true);
          }
        });
    } else {
      setCart(null);
      setGuestItems(readGuestCart());
      setLoaded(true);
    }
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  /** Runs one server cart call and mirrors its response into state. */
  const runServerMutation = useCallback(
    async (call: () => Promise<Cart>): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        setCart(await call());
        return true;
      } catch (cause) {
        setError(cartErrorMessages(cause)[0]);
        return false;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setError(null);
    if (authenticated) {
      try {
        setCart(await getCart());
      } catch {
        setCart(null); // Keep the UI usable; the error surfaces on the next call.
      }
      return;
    }
    setGuestItems(readGuestCart());
  }, [authenticated]);

  const addToCart = useCallback(
    async (
      productId: number,
      slug: string,
      quantity: number = 1,
    ): Promise<AddToCartResult> => {
      if (authenticated) {
        const ok = await runServerMutation(() =>
          addCartItem({ productId, quantity }),
        );
        return ok ? "ok" : "error";
      }
      const current = readGuestCart();
      const existing = current.find((item) => item.productId === productId);
      if (existing === undefined) {
        if (current.length >= MAX_CART_ITEMS) {
          setError(GUEST_CART_FULL_MESSAGE);
          return "limit";
        }
        const next: GuestCartItem[] = [
          ...current,
          { productId, slug, quantity: Math.min(quantity, MAX_ITEM_QUANTITY) },
        ];
        writeGuestCart(next);
        setGuestItems(next);
        setError(null);
        return "ok";
      }
      if (existing.quantity >= MAX_ITEM_QUANTITY) {
        setError(GUEST_MAX_QUANTITY_MESSAGE);
        return "limit";
      }
      const next = current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.min(item.quantity + quantity, MAX_ITEM_QUANTITY),
            }
          : item,
      );
      writeGuestCart(next);
      setGuestItems(next);
      setError(null);
      return "ok";
    },
    [authenticated, runServerMutation],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number): Promise<boolean> => {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
        return false;
      }
      if (authenticated) {
        return runServerMutation(() => updateCartItem(productId, quantity));
      }
      const current = readGuestCart();
      if (!current.some((item) => item.productId === productId)) {
        return false;
      }
      const next = current.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      );
      writeGuestCart(next);
      setGuestItems(next);
      setError(null);
      return true;
    },
    [authenticated, runServerMutation],
  );

  const removeItem = useCallback(
    async (productId: number): Promise<boolean> => {
      if (authenticated) {
        return runServerMutation(() => removeCartItem(productId));
      }
      const current = readGuestCart();
      const next = current.filter((item) => item.productId !== productId);
      writeGuestCart(next);
      setGuestItems(next);
      setError(null);
      return true;
    },
    [authenticated, runServerMutation],
  );

  const clear = useCallback(async (): Promise<boolean> => {
    if (authenticated) {
      return runServerMutation(() => clearServerCart());
    }
    clearGuestCart();
    setGuestItems([]);
    setError(null);
    return true;
  }, [authenticated, runServerMutation]);

  const value = useMemo<CartContextValue>(
    () => ({
      authenticated,
      cart,
      guestItems,
      loaded,
      itemCount: authenticated
        ? (cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
        : guestItems.reduce((sum, item) => sum + item.quantity, 0),
      pending,
      error,
      addToCart,
      setQuantity,
      removeItem,
      clear,
      refresh,
    }),
    [
      authenticated,
      cart,
      guestItems,
      loaded,
      pending,
      error,
      addToCart,
      setQuantity,
      removeItem,
      clear,
      refresh,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}
