// src/pages/About.jsx
import React from "react";

export default function About() {
  const address = "צבי הנחל 4, פארק תעשיות עמק חפר";
  const q = encodeURIComponent(address);

  // מפה עם סיכה אמיתית על הכתובת (ללא API Key)
  const mapEmbed = `https://www.google.com/maps?hl=he&q=${q}&z=17&t=m&output=embed`;
  const mapLink  = `https://www.google.com/maps/search/?api=1&query=${q}`;

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

    </div>
  );
}
