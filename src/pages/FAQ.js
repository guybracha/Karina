// src/pages/FAQ.jsx
import React from "react";

export default function FAQ() {
  return (
    <div className="container py-5">
      <h1 className="mb-4">שאלות נפוצות (FAQ)</h1>
      <p className="text-muted mb-4">
        ריכזנו כאן תשובות לשאלות שהלקוחות שלנו שואלים הכי הרבה.
        אם לא מצאת תשובה — נשמח לעזור דרך עמוד <a href="/contact">צור קשר</a>.
      </p>

      <div className="accordion" id="faqAccordion">
        {/* 1 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q1">
            <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#a1" aria-expanded="true" aria-controls="a1">
              איזה קבצים כדאי לשלוח להדפסה על חולצות?
            </button>
          </h2>
          <div id="a1" className="accordion-collapse collapse show" aria-labelledby="q1" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              מומלץ קבצי וקטור (PDF, SVG, AI) או PNG שקוף באיכות גבוהה (300dpi). צבעי <strong>CMYK</strong> להדפסה מלאה, או הגדרת <strong>Pantone</strong> אם נדרש התאמת צבע מדויקת.
            </div>
          </div>
        </div>

        {/* 2 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q2">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a2" aria-expanded="false" aria-controls="a2">
              מה זמן האספקה?
            </button>
          </h2>
          <div id="a2" className="accordion-collapse collapse" aria-labelledby="q2" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              בדרך-כלל 3–7 ימי עסקים מרגע אישור גרפי ותשלום. יש גם מסלולי <strong>אקספרס</strong> לפי זמינות. זמני משלוח משתנים לפי הכתובת והכמות.
            </div>
          </div>
        </div>

        {/* 3 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q3">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a3" aria-expanded="false" aria-controls="a3">
              מהי כמות מינימלית להזמנה?
            </button>
          </h2>
          <div id="a3" className="accordion-collapse collapse" aria-labelledby="q3" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              אין מינימום הדפסה דיגיטלית (DTF/DTG) — אפשר גם יחידה אחת. להדפסת משי/סקרין מומלץ מ־20 יח׳ ומעלה כדי להגיע למחיר ליחידה משתלם.
            </div>
          </div>
        </div>

        {/* 4 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q4">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a4" aria-expanded="false" aria-controls="a4">
              איך בוחרים מידה וצבע?
            </button>
          </h2>
          <div id="a4" className="accordion-collapse collapse" aria-labelledby="q4" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              בדף המוצר תמצאו טבלת מידות וקשת צבעים. ההמלצה שלנו: למדוד חולצה קיימת ולהשוות למידות בטבלה. ניתן גם להזמין דוגמת בגד לפני הדפסה.
            </div>
          </div>
        </div>

        {/* 5 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q5">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a5" aria-expanded="false" aria-controls="a5">
              האם אפשר לראות הדמיה לפני הדפסה?
            </button>
          </h2>
          <div id="a5" className="accordion-collapse collapse" aria-labelledby="q5" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              כן. במוצר ניתן להעלות לוגו ולקבל הדמיה בחלון ייעודי. אפשר גם לקבל קובץ PDF לאישור סופי לפני יציאה לייצור.
            </div>
          </div>
        </div>

        {/* 6 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q6">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a6" aria-expanded="false" aria-controls="a6">
              אילו שיטות הדפסה זמינות?
            </button>
          </h2>
          <div id="a6" className="accordion-collapse collapse" aria-labelledby="q6" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              אנו מציעים DTF/DTG, הדפסת משי (סקרין), ורקמה. נבחר יחד את השיטה לפי כמות, סוג הבד, מספר צבעים ועמידות נדרשת.
            </div>
          </div>
        </div>

        {/* 7 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q7">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a7" aria-expanded="false" aria-controls="a7">
              איך מטפלים בבגד אחרי הדפסה?
            </button>
          </h2>
          <div id="a7" className="accordion-collapse collapse" aria-labelledby="q7" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              כביסה עדינה עד 30° הפוך, בלי מייבש חם, בלי אקונומיקה. גיהוץ הפוך בלבד — לא ישירות על ההדפס.
            </div>
          </div>
        </div>

        {/* 8 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q8">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a8" aria-expanded="false" aria-controls="a8">
              אילו אפשרויות משלוח קיימות ומה העלות?
            </button>
          </h2>
          <div id="a8" className="accordion-collapse collapse" aria-labelledby="q8" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              משלוח עד הבית/עסק עם שליח, נקודת איסוף, או איסוף עצמי. המחיר תלוי בכתובת ובמשקל; יוצג בקופה לפני תשלום.
            </div>
          </div>
        </div>

        {/* 9 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q9">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a9" aria-expanded="false" aria-controls="a9">
              האם ניתן להחזיר/להחליף מוצרים מודפסים?
            </button>
          </h2>
          <div id="a9" className="accordion-collapse collapse" aria-labelledby="q9" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              מוצרים בהתאמה אישית מודפסים לפי הזמנה ולכן אינם ניתנים להחזרה, אך נשמח לסייע בכל בעיה באיכות/מידה לפי מדיניות השירות שלנו.
            </div>
          </div>
        </div>

        {/* 10 */}
        <div className="accordion-item">
          <h2 className="accordion-header" id="q10">
            <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#a10" aria-expanded="false" aria-controls="a10">
              אילו אמצעי תשלום מתקבלים?
            </button>
          </h2>
          <div id="a10" className="accordion-collapse collapse" aria-labelledby="q10" data-bs-parent="#faqAccordion">
            <div className="accordion-body">
              כרטיס אשראי, PayPal, והעברה בנקאית. ללקוחות עסקיים — אפשרויות חיוב והצעת מחיר מרוכזת.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        עדיין מתלבטים?{" "}
        <a className="btn btn-outline-primary" href="/contact">
          צרו קשר
        </a>
      </div>
    </div>
  );
}
