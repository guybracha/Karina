// src/components/CreateDemoOrderButton.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createOrder } from "../services/orders";

export default function CreateDemoOrderButton() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleClick() {
    if (!user) { setMsg("אין משתמש מחובר"); return; }
    setBusy(true); setMsg("");
    try {
      const items = [
        { productId: "tee-navy-L", slug: "tee", name: "חולצת Karina", price: 149.9, qty: 2, color: "נייבי", size: "L" },
        { productId: "tee-gray-M", slug: "tee", name: "חולצת Karina", price: 129.9, qty: 1, color: "אפור", size: "M" },
      ];
      const orderId = await createOrder(user.uid, items, {
        shippingMethod: "איסוף מהמפעל",
        notes: "הזמנת דמו לצורכי בדיקה",
        phoneNumber: "052-5551234",
      });
      setMsg(`✅ נוצרה הזמנה: ${orderId}`);
    } catch (e) {
      console.error(e);
      setMsg("❌ יצירת דמו נכשלה: " + (e.message || "שגיאה"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex gap-2 align-items-center">
      <button className="btn btn-outline-secondary" onClick={handleClick} disabled={busy}>
        {busy ? "יוצר..." : "צור הזמנת דמו"}
      </button>
      {msg && <span className="small">{msg}</span>}
    </div>
  );
}
