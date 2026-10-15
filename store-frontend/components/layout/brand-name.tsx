/**
 * Two-tone wordmark of the store name: "بازی" in the brand purple (--primary)
 * and "بازار" in red.
 *
 * The two spans are separated by an explicit {" "} so the name reads as two
 * words — only the color of the two halves differs. Kept in one place so the
 * header logo and the footer cannot drift apart.
 */
export function BrandName() {
  return (
    <>
      <span className="text-primary">بازی</span>{" "}
      <span className="text-red-600">بازار</span>
    </>
  );
}
