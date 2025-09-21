// src/lib/cartStorage.js
export const LS_CART_KEY = "karina:cart";

function isValidItem(x) {
  return x && typeof x === "object" &&
    "id" in x && "name" in x &&
    "qty" in x && !Number.isNaN(Number(x.qty)) &&
    "price" in x && !Number.isNaN(Number(x.price));
}
function normalize(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isValidItem)
    .map(it => ({
      ...it,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Number(it.price) || 0,
      color: it.color || "",
      size: it.size || ""
    }));
}

export function getCart() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    return normalize(raw ? JSON.parse(raw) : []);
  } catch { return []; }
}

export function setCart(next) {
  try {
    const normalized = normalize(next);
    localStorage.setItem(LS_CART_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event("karina:cartUpdated"));
  } catch {}
}

export function addToCart(item) {
  const list = getCart();
  const key = x => `${x.id}|${x.color||""}|${x.size||""}`;
  const idx = list.findIndex(x => key(x) === key(item));
  if (idx >= 0) {
    list[idx].qty = Math.max(1, Number(list[idx].qty||1) + Number(item.qty||1));
  } else {
    list.push({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: Number(item.price) || 0,
      qty: Math.max(1, Number(item.qty) || 1),
      color: item.color || "",
      size: item.size || ""
    });
  }
  setCart(list);
}

export function removeFromCart(id) {
  setCart(getCart().filter(it => it.id !== id));
}

export function clearCart() {
  setCart([]);
}
