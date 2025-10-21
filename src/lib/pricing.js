/**
 * Tiered discount: starts at 10 units, ends at 100 units.
 * Every additional 5 units adds an extra ~2.39% off.
 *  1–9 units:   0%
 *  10–14 units: 2.39%
 *  15–19 units: 4.78%
 *  ...
 *  100+ units:  45%
 */

export const DISCOUNT_RULE = {
  startQty: 10,     // discount begins here
  endQty: 100,      // full discount reached
  stepQty: 5,       // every 5 units = next tier
  stepPct: 0.0239,  // ≈2.39% per step
  maxPct: 0.4545,   // cap at 45.45%
};

export function getDiscountPct(qty, rule = DISCOUNT_RULE) {
  const n = Math.max(1, Number(qty || 1));

  if (n < rule.startQty) return 0; // no discount before 10 units

  const steps = Math.floor((n - rule.startQty) / rule.stepQty) + 1;
  const pct = Math.min(rule.maxPct, steps * rule.stepPct);

  return Number(pct.toFixed(4));
}

export function findProduct(products, slug) {
  return (products || []).find(p => p.slug === slug) || null;
}

export function priceForItem({ slug, qty = 1 }, products) {
  const p = findProduct(products, slug);
  if (!p) throw new Error(`Unknown product slug: ${slug}`);

  const base = Number(p.price || 0);
  const n = Math.max(1, Number(qty || 1));
  const d = getDiscountPct(n);
  const unitAfter = base * (1 - d);
  const lineTotal = unitAfter * n;

  return {
    slug,
    qty: n,
    baseUnit: base,
    discountPct: d,
    unitAfter: Math.round(unitAfter * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
  };
}

export function priceCart(items, products) {
  const rows = (items || []).map(it => priceForItem(it, products));
  const merchandiseTotal = rows.reduce((s, r) => s + r.lineTotal, 0);

  return {
    rows,
    merchandiseTotal: Math.round(merchandiseTotal * 100) / 100
  };
}
