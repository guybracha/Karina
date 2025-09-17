// src/lib/searchService.js
import { PRODUCTS } from "./products";

export async function searchProducts(q) {
  const s = (q || "").toLowerCase();

  // מסנן לפי שם או צבע
  return PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(s) ||
      p.colors.some((c) => c.toLowerCase().includes(s))
  ).map((p) => ({
    id: p.slug,
    title: p.name,
    slug: p.slug,
    thumb: p.img,
    meta: `מ־${p.price}₪ · צבעים: ${p.colors.join("/")}`,
    type: "product",
  }));
}
