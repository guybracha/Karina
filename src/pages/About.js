// src/pages/About.jsx
import React from "react";

export default function About() {
  const address = "צבי הנחל 4, פארק תעשיות עמק חפר";
  const q = encodeURIComponent(address);

  // מפה עם סיכה אדומה אמיתית על הכתובת (ללא API Key)
  const mapEmbed = `https://maps.google.com/maps?q=${q}&t=&z=16&ie=UTF8&iwloc=B&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${q}`;

  return (
    <div className="container py-5">
      <h1 className="mb-4">אודות קארינה</h1>

      <p className="lead">
        קארינה מתמחה בהדפסה על חולצות וביגוד עבודה ממותג לעסקים, צוותים
        ואירועים. עם ניסיון רב שנים בתחום, אנו מספקים שירות אישי, גרפיקה
        מקצועית וזמני אספקה מהירים לכל חלקי הארץ.
      </p>

      <h5 className="mt-5 mb-3">מה אנחנו מציעים?</h5>
      <ul className="list-unstyled">
        <li>✔️ הדפסות באיכות גבוהה על מגוון רחב של בדים</li>
        <li>✔️ עיצוב גרפי מותאם אישית</li>
        <li>✔️ פתרונות מיתוג מלאים לעסקים וצוותים</li>
        <li>✔️ משלוחים לכל רחבי הארץ</li>
      </ul>

      <h5 className="mt-5 mb-3">פרטי קשר</h5>
      <p className="mb-1">📍 {address}</p>
      <p className="mb-1">📞 טלפון: 054-5042443</p>
      <p className="mb-3">✉️ דוא״ל: info@karina.co.il</p>

      {/* כפתור וואטסאפ */}
      <a
        href="https://wa.me/972545042443"
        target="_blank"
        rel="noreferrer"
        className="btn btn-success mb-4"
      >
        <i className="bi bi-whatsapp me-2"></i>
        צור קשר בוואטסאפ
      </a>

      {/* מפת גוגל עם סיכה */}
      <div className="ratio ratio-16x9">
        <iframe
          title="מפת גוגל - קארינה"
          src={mapEmbed}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* קישור ישיר לפתיחה במפות */}
      <p className="mt-2">
        <a href={mapLink} target="_blank" rel="noreferrer">
          פתח במפות גוגל
        </a>
      </p>
    </div>
  );
}
