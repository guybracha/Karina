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

            {/* כפתור וואטסאפ */}
            <a
              href="https://wa.me/972545042443"
              target="_blank"
              rel="noreferrer"
              className="btn btn-success mb-3"
            >
              <i className="bi bi-whatsapp me-2"></i>
              שלח הודעה בוואטסאפ
            </a>

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
      </div>
    </div>
  );
}
