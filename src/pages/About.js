// src/pages/About.jsx
import React from "react";

export default function About() {
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
      <p className="mb-1">📍 צבי הנחל 4, פארק תעשיות עמק חפר</p>
      <p className="mb-1">📞 טלפון: 054-5042443</p>
      <p className="mb-1">✉️ דוא״ל: info@karina.co.il</p>
    </div>
  );
}
