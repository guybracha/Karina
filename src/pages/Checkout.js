// src/pages/Checkout.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Checkout() {
  // פרטי טופס
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zip: "",
    payment: "credit",
  });

  // עגלת קניות לדוגמה – בהמשך תחבר ל־Cart Context
  const cartItems = [
    { id: 1, name: "קפוצ׳ון נייבי", price: 120, qty: 1 },
    { id: 2, name: "חולצת טריקו אפורה", price: 35, qty: 2 },
  ];
  const total = cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // כאן בעתיד: שלח את ההזמנה לשרת / Firebase
    alert("תודה! ההזמנה נקלטה בהצלחה.");
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">תשלום והזמנה</h1>
      <div className="row g-4">
        {/* טופס פרטים אישיים */}
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="card shadow-sm p-4">
            <h5 className="mb-3">פרטים אישיים ומשלוח</h5>

            <div className="mb-3">
              <label className="form-label">שם מלא</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">אימייל</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">טלפון</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">כתובת</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">עיר</label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">מיקוד</label>
                <input
                  type="text"
                  name="zip"
                  value={form.zip}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>

            <h5 className="mt-4 mb-3">שיטת תשלום</h5>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="credit"
                checked={form.payment === "credit"}
                onChange={handleChange}
                id="payCredit"
              />
              <label className="form-check-label" htmlFor="payCredit">
                כרטיס אשראי
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="paypal"
                checked={form.payment === "paypal"}
                onChange={handleChange}
                id="payPaypal"
              />
              <label className="form-check-label" htmlFor="payPaypal">
                PayPal
              </label>
            </div>
            <div className="form-check mb-4">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="cash"
                checked={form.payment === "cash"}
                onChange={handleChange}
                id="payCash"
              />
              <label className="form-check-label" htmlFor="payCash">
                מזומן בעת מסירה
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-lg">
              בצע הזמנה
            </button>
          </form>
        </div>

        {/* סיכום הזמנה */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4">
            <h5 className="mb-3">סיכום הזמנה</h5>
            <ul className="list-group list-group-flush mb-3">
              {cartItems.map((it) => (
                <li
                  key={it.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    {it.name} <small className="text-muted">x{it.qty}</small>
                  </div>
                  <div>{it.price * it.qty} ₪</div>
                </li>
              ))}
            </ul>
            <h5 className="text-end">סה״כ: {total} ₪</h5>
            <Link to="/cart" className="btn btn-outline-secondary mt-3 w-100">
              חזרה לעגלה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
