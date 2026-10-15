import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import {
  getAdminCategories,
  type AdminCategory,
} from "@/lib/api/admin-categories";
import {
  getAdminProductById,
  type AdminProductDetail,
} from "@/lib/api/admin-products";
import { serverFetch } from "@/lib/api/server";

interface EditProductPageProps {
  /** Next 16: route params are a Promise. */
  params: Promise<{ id: string }>;
}

/** The backend's product id is a 32-bit signed int (ParseIntPipe). */
const MAX_ID = 2_147_483_647;

const BACK_LINK_CLASS =
  "mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Admin edit-product page. The backend exposes no single-item admin endpoint,
 * so the product is located by paging GET /admin/products inside
 * getAdminProductById (which also returns the fields the list guard strips),
 * and the shared client ProductForm PATCHes /products/:id. The category options
 * of the select come from the admin categories loader.
 */
export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

  // Mirror the backend's ParseIntPipe: only a positive integer id is valid.
  const productId = /^\d+$/.test(id) && Number(id) <= MAX_ID ? Number(id) : null;

  let categories: AdminCategory[] | null = null;
  let product: AdminProductDetail | null = null;

  if (productId !== null) {
    [categories, product] = await Promise.all([
      getAdminCategories(serverFetch),
      getAdminProductById(productId),
    ]);
  }

  // Unknown, non-numeric, out-of-range or missing id => 404, like the backend.
  if (productId === null || product === null) {
    notFound();
  }

  if (categories === null) {
    return (
      <section className="rounded-lg border border-border bg-background p-8">
        <h1 className="text-xl font-extrabold text-foreground">
          ویرایش محصول
        </h1>
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت فهرست دسته‌بندی‌ها ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
        <Link href="/admin/products" className={BACK_LINK_CLASS}>
          بازگشت به فهرست محصولات
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">
        ویرایش محصول
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        مشخصات محصول «{product.name}» را ویرایش کنید.
      </p>

      <div className="mt-6">
        <ProductForm mode="edit" product={product} categories={categories} />
      </div>

      <Link href="/admin/products" className={BACK_LINK_CLASS}>
        بازگشت به فهرست محصولات
      </Link>
    </section>
  );
}