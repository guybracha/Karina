// src/pages/Contact.jsx
import React, { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // בעתיד: שלח לשרת / Firebase / שירות אימייל
    alert("תודה! פנייתך התקבלה ואנו נחזור אליך בהקדם.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">צור קשר</h1>

      <div className="row g-4">
        {/* פרטי התקשרות */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4 h-100">
            <h5 className="mb-3">פרטי החברה</h5>
            <p className="mb-1">📍 תל אביב, ישראל</p>
            <p className="mb-1">📞 03-1234567</p>
            <p className="mb-1">✉️ info@karina.co.il</p>
            <p className="mb-0">🕒 ימים א׳–ה׳, 9:00–17:00</p>
          </div>
        </div>

        {/* טופס יצירת קשר */}
        <div className="col-lg-7">
          <div className="card shadow-sm p-4">
            <h5 className="mb-3">השאירו הודעה</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">שם מלא</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="mb-3">
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
              <div className="mb-3">
                <label className="form-label">הודעה</label>
                <textarea
                  name="message"
                  rows="4"
                  value={form.message}
                  onChange={handleChange}
                  className="form-control"
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary">
                שלח הודעה
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
