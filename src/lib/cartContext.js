// src/context/CartContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const STORAGE_KEY = "karina_cart_v1";

// --- עזר: בניית מפתח ייחודי לפריט (למיזוג פריטים דומים) ---
function variantKey(it = {}) {
  return `${it.slug || ""}|${it.color || ""}|${it.size || ""}`;
}

// --- אחסון מקומי ---
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// --- Reducer ---
const initialState = {
  items: loadFromStorage(), // [{slug,name,price,qty,color?,size?,previewImage?,logoMeta?}]
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const { item, merge = true } = action.payload;
      const items = [...state.items];
      const key = variantKey(item);
      const idx = items.findIndex((it) => variantKey(it) === key);

      if (merge && idx > -1) {
        const prev = items[idx];
        items[idx] = { ...prev, qty: (prev.qty || 1) + (item.qty || 1) };
      } else {
        items.push({ ...item, qty: item.qty || 1 });
      }
      return { ...state, items };
    }
    case "UPDATE_QTY": {
      const { keyOrIndex, qty } = action.payload;
      const q = Math.max(1, Number(qty) || 1);
      const items = state.items.map((it, i) =>
        (typeof keyOrIndex === "number" ? i === keyOrIndex : variantKey(it) === keyOrIndex)
          ? { ...it, qty: q }
          : it
      );
      return { ...state, items };
    }
    case "REMOVE_ITEM": {
      const { keyOrIndex } = action.payload;
      const items = state.items.filter((it, i) =>
        typeof keyOrIndex === "number" ? i !== keyOrIndex : variantKey(it) !== keyOrIndex
      );
      return { ...state, items };
    }
    case "SET_ITEM_META": {
      const { keyOrIndex, meta } = action.payload; // למשל { previewImage, logoMeta }
      const items = state.items.map((it, i) =>
        (typeof keyOrIndex === "number" ? i === keyOrIndex : variantKey(it) === keyOrIndex)
          ? { ...it, ...meta }
          : it
      );
      return { ...state, items };
    }
    case "CLEAR":
      return { ...state, items: [] };
    default:
      return state;
  }
}

// --- Contexts ---
const CartStateCtx = createContext(null);
const CartActionsCtx = createContext(null);

// --- Provider ---
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // שמירה ל-localStorage בכל שינוי
  useEffect(() => {
    saveToStorage(state.items);
  }, [state.items]);

  // סכומים ונגזרות
  const { subtotal, itemCount } = useMemo(() => {
    const subtotal = state.items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);
    const itemCount = state.items.reduce((sum, it) => sum + (it.qty || 1), 0);
    return { subtotal, itemCount };
  }, [state.items]);

  // אפשר להוסיף כאן חישוב משלוח/מע״מ לפי לוגיקה עתידית
  const shipping = 0;
  const total = subtotal + shipping;

  const actions = useMemo(
    () => ({
      addItem: (item, opts) => dispatch({ type: "ADD_ITEM", payload: { item, ...(opts || {}) } }),
      updateQty: (keyOrIndex, qty) => dispatch({ type: "UPDATE_QTY", payload: { keyOrIndex, qty } }),
      removeItem: (keyOrIndex) => dispatch({ type: "REMOVE_ITEM", payload: { keyOrIndex } }),
      clear: () => dispatch({ type: "CLEAR" }),
      setItemMeta: (keyOrIndex, meta) => dispatch({ type: "SET_ITEM_META", payload: { keyOrIndex, meta } }),
      variantKey, // חשיפה לשימוש חיצוני
    }),
    []
  );

  const value = useMemo(
    () => ({
      items: state.items,
      subtotal,
      shipping,
      total,
      itemCount,
    }),
    [state.items, subtotal, shipping, total, itemCount]
  );

  return (
    <CartStateCtx.Provider value={value}>
      <CartActionsCtx.Provider value={actions}>{children}</CartActionsCtx.Provider>
    </CartStateCtx.Provider>
  );
}

// --- Hooks נוחים ---
export function useCart() {
  const ctx = useContext(CartStateCtx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
export function useCartActions() {
  const ctx = useContext(CartActionsCtx);
  if (!ctx) throw new Error("useCartActions must be used within <CartProvider>");
  return ctx;
}
