import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ORDERS_LS_KEY = "karina:orders";

const DEMO_ORDERS = [
  {
    id: "ORD123",
    date: "2025-09-01T09:15:00Z",
    status: "נשלח",
    total: 250,
    items: [
      { name: "קפוצ׳ון נייבי", qty: 1, price: 120 },
      { name: "חולצת טריקו אפורה", qty: 2, price: 65 },
    ],
  },
  {
    id: "ORD122",
    date: "2025-08-12T13:40:00Z",
    status: "הושלם",
    total: 120,
    items: [{ name: "קסדת בטיחות", qty: 1, price: 120 }],
  },
];

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem(ORDERS_LS_KEY);
      if (!raw) return DEMO_ORDERS;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : DEMO_ORDERS;
    } catch {
      return DEMO_ORDERS;
    }
  });

  // שמירה ל-localStorage
  useEffect(() => {
    try { localStorage.setItem(ORDERS_LS_KEY, JSON.stringify(orders)); } catch {}
  }, [orders]);

  const api = useMemo(() => ({
    orders,
    setOrders,
    addOrder: (order) => setOrders((prev) => [order, ...prev]),
    updateOrder: (id, patch) =>
      setOrders((prev) => prev.map(o => o.id === id ? { ...o, ...patch } : o)),
    getOrderById: (id) => orders.find(o => String(o.id) === String(id)),
  }), [orders]);

  return <OrdersContext.Provider value={api}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
