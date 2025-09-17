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
    alert("תודה! פנייתך התקבלה ואנו נחזור אליך בהקדם.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">צור קשר</h1>

      <div className="row g-4">
        {/* פרטי התקשרות + מפה */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4 h-100 d-flex flex-column">
            <h5 className="mb-3">פרטי החברה</h5>
            <p className="mb-1">📍 צבי הנחל 4, פארק תעשיות עמק חפר</p>
            <p className="mb-1">📞 054-5042443</p>
            <p className="mb-1">✉️ info@karina.co.il</p>
            <p className="mb-3">🕒 ימים א׳–ה׳, 9:00–17:00</p>

            {/* Google Maps */}
            <div className="ratio ratio-4x3 mt-auto">
            <iframe
              title="מפת גוגל - צבי הנחל 4, פארק תעשיות עמק חפר"
              src="https://maps.google.com/maps?q=צבי%20הנחל%204%20עמק%20חפר&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            </div>
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
