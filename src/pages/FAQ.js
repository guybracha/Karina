// src/pages/FAQ.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";

const RAW_FAQS = [
  {
    q: "איזה קבצים כדאי לשלוח להדפסה על חולצות?",
    a: "מומלץ קבצי וקטור (PDF, SVG, AI) או PNG שקוף באיכות גבוהה (300dpi). צבעי CMYK להדפסה מלאה, או הגדרת Pantone אם נדרש התאמת צבע מדויקת."
  },
  { q: "מה זמן האספקה?", a: "בדרך-כלל 3–7 ימי עסקים מרגע אישור גרפי ותשלום. יש גם מסלולי אקספרס לפי זמינות. זמני משלוח משתנים לפי הכתובת והכמות." },
  { q: "מהי כמות מינימלית להזמנה?", a: "אין מינימום בהדפסה דיגיטלית (DTF/DTG). לסקרין מומלץ מ-20 יח׳ ומעלה כדי להגיע למחיר ליחידה משתלם." },
  { q: "איך בוחרים מידה וצבע?", a: "בדף המוצר יש טבלת מידות וקשת צבעים. מומלץ למדוד חולצה קיימת ולהשוות. אפשר להזמין דוגמת בגד לפני הדפסה." },
  { q: "האם אפשר לראות הדמיה לפני הדפסה?", a: "כן. ניתן להעלות לוגו ולקבל הדמיה באתר, וגם לקבל PDF לאישור סופי לפני יציאה לייצור." },
  { q: "אילו שיטות הדפסה זמינות?", a: "DTF/DTG, סקרין (הדפסת משי) ורקמה. נבחר יחד לפי כמות, סוג בד, מספר צבעים ועמידות נדרשת." },
  { q: "איך מטפלים בבגד אחרי הדפסה?", a: "כביסה עדינה עד 30° הפוך, בלי מייבש חם ובלי אקונומיקה. גיהוץ הפוך בלבד — לא ישירות על ההדפס." },
  { q: "אילו אפשרויות משלוח קיימות ומה העלות?", a: "שליח עד הבית/עסק, נקודת איסוף או איסוף עצמי. המחיר תלוי בכתובת ובמשקל ומוצג בקופה לפני תשלום." },
  { q: "האם ניתן להחזיר/להחליף מוצרים מודפסים?", a: "מוצרים בהתאמה אישית מודפסים לפי הזמנה ולכן אינם ניתנים להחזרה, אך נסייע בכל בעיה באיכות/מידה לפי מדיניות השירות." },
  { q: "אילו אמצעי תשלום מתקבלים?", a: "כרטיס אשראי, PayPal והעברה בנקאית. ללקוחות עסקיים — אפשרויות חיוב והצעת מחיר מרוכזת." }
];

export default function FAQ() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const loc = useLocation();

  const faqs = useMemo(() => {
    const idify = (s) =>
      s
        .toLowerCase()
        .replace(/[^\u0590-\u05FFa-z0-9 ]/gi, "")
        .replace(/\s+/g, "-");
    return RAW_FAQS.map((x, i) => ({ ...x, id: `q-${idify(x.q) || i}` }));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.trim().toLowerCase();
    return faqs.filter((x) => x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q));
  }, [faqs, query]);

  // פתיחה אוטומטית לפי hash בכתובת (גם בניווט פנימי)
  useEffect(() => {
    const hash = decodeURIComponent((loc.hash || "").replace("#", ""));
    if (!hash) return;
    const btn = document.querySelector(`button[data-target-id="${hash}"]`);
    if (btn && btn.getAttribute("aria-expanded") !== "true") {
      btn.click();
    }
  }, [loc.hash]);

  // JSON-LD ל-SEO (FAQPage)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  };

  return (
    <div className="container py-5">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <title>שאלות נפוצות | קארינה הדפסות</title>
        <meta
          name="description"
          content="תשובות קצרות וברורות לשאלות על קבצים להדפסה, זמני אספקה, משלוחים, תשלומים ועוד."
        />
      </Helmet>

      <header className="mb-4 text-center">
        <h1 className="display-6 fw-bold mb-2">שאלות נפוצות (FAQ)</h1>
        <p className="text-muted">
          אם לא מצאת תשובה — נשמח לעזור דרך&nbsp;
          <a href="/contact">צור קשר</a>.
        </p>

        {/* חיפוש */}
        <div className="faq-search mx-auto mt-3">
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white">
              <i className="bi bi-search" aria-hidden="true" />
            </span>
            <input
              type="search"
              className="form-control"
              placeholder="חיפוש שאלה…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="חיפוש ב-FAQ"
            />
            {query && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setQuery("")}
                aria-label="נקה חיפוש"
              >
                נקה
              </button>
            )}
          </div>
          <small className="text-muted d-block mt-2">נמצאו {filtered.length} תשובות</small>
        </div>
      </header>

      {/* אקורדיון מעודן */}
      <div className="accordion accordion-flush" id="faqAccordion">
        {filtered.map(({ q, a, id }, idx) => {
          const collapseId = `a-${id}`;
          const headingId = `h-${id}`;
          return (
            <div className="accordion-item rounded-3 mb-2 shadow-sm border-0" key={id} id={id}>
              <h2 className="accordion-header" id={headingId}>
                <button
                  className="accordion-button collapsed d-flex align-items-center gap-2"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#${collapseId}`}
                  aria-expanded="false"
                  aria-controls={collapseId}
                  data-target-id={id}
                  onClick={() => {
                    // עדכון ה-URL עם העוגן (ללא reload)
                    navigate(`${loc.pathname}${loc.search}#${id}`, { replace: true });
                  }}
                >
                  <span className="badge bg-light text-body-tertiary fw-normal">{idx + 1}</span>
                  <span className="flex-grow-1">{q}</span>
                  <i className="bi bi-chevron-down chev" aria-hidden="true" />
                </button>
              </h2>
              <div
                id={collapseId}
                className="accordion-collapse collapse"
                aria-labelledby={headingId}
                data-bs-parent="#faqAccordion"
              >
                <div className="accordion-body">
                  {a}
                  <div className="d-flex gap-2 mt-3">
                    <a
                      className="btn btn-sm btn-outline-primary"
                      href={`/contact?topic=${encodeURIComponent(q)}`}
                    >
                      <i className="bi bi-chat-dots me-1" /> צריך עוד עזרה
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={async () => {
                        try {
                          const origin = typeof window !== "undefined" ? window.location.origin : "";
                          const shareUrl = `${origin}${loc.pathname}${loc.search}#${id}`;
                          await navigator.clipboard.writeText(shareUrl);
                          // כאן אפשר לקרוא ל-toast אם יש
                        } catch {
                          // swallow
                        }
                      }}
                    >
                      <i className="bi bi-link-45deg me-1" /> העתק קישור לשאלה
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* קריאה לפעולה */}
      <div className="mt-5">
        <div className="p-4 p-md-5 rounded-4 border bg-gradient bg-white shadow-sm text-center">
          <h2 className="h4 mb-2">עדיין מתלבטים?</h2>
          <p className="text-muted mb-3">שולחים לוגו, אנחנו מחזירים הדמיה — ומהר.</p>
          <a className="btn btn-primary btn-lg px-4" href="/contact">
            צרו קשר
          </a>
        </div>
      </div>
    </div>
  );
}
