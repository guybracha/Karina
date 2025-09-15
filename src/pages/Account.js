// src/pages/Account.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Account() {
  // כאן בעתיד תשלוף את פרטי המשתמש מה־Auth Context או Firebase
  const user = {
    name: "גיא ברכה",
    email: "guy@example.com",
    avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    joined: "2023-08-15",
  };

  const orders = [
    { id: "ORD123", date: "2025-09-01", total: 250, status: "נשלח" },
    { id: "ORD122", date: "2025-08-12", total: 120, status: "הושלם" },
  ];

  return (
    <div className="container py-5">
      <h1 className="mb-4">החשבון שלי</h1>

      {/* פרטי משתמש */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex align-items-center gap-3">
          <img
            src={user.avatar}
            alt={user.name}
            className="rounded-circle"
            style={{ width: 80, height: 80, objectFit: "cover" }}
          />
          <div>
            <h5 className="mb-1">{user.name}</h5>
            <p className="mb-1 text-muted">{user.email}</p>
            <small className="text-muted">משתמש מאז: {user.joined}</small>
          </div>
        </div>
      </div>

      {/* הזמנות אחרונות */}
      <h5 className="mb-3">הזמנות אחרונות</h5>
      {orders.length > 0 ? (
        <div className="table-responsive mb-4">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>מספר הזמנה</th>
                <th>תאריך</th>
                <th>סה״כ</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.date}</td>
                  <td>{o.total} ₪</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">לא נמצאו הזמנות.</p>
      )}

      {/* פעולות */}
      <div className="d-flex gap-2">
        <Link to="/catalog" className="btn btn-outline-primary">
          המשך בקניות
        </Link>
        <button className="btn btn-danger">התנתק</button>
      </div>
    </div>
  );
}
