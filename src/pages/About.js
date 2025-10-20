// src/pages/About.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

export default function About() {
  const brandName = "קארינה הדפסות";
  const address = "צבי הנחל 4, פארק תעשיות עמק חפר";
  const phone = "054-5042443";
  const email = "info@karina.co.il";
  const q = encodeURIComponent(address);

  // URLs דינמיים ל-SEO
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/about`;
  const ogImage = `${origin}/img/logo.png`; // אם יש לוגו פיזי בתקייה – ישמש כתמונת שיתוף

  // מפה עם סיכה אדומה אמיתית על הכתובת (ללא API Key)
  const mapEmbed = `https://maps.google.com/maps?q=${q}&t=&z=16&ie=UTF8&iwloc=B&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${q}`;

  const pageTitle = `אודות ${brandName}`;
  const pageDesc =
    "קארינה מתמחה בהדפסה על חולצות וביגוד עבודה ממותג לעסקים, צוותים ואירועים — עם שירות אישי, גרפיקה מקצועית וזמני אספקה מהירים לכל הארץ.";

  // JSON-LD — LocalBusiness + Breadcrumbs
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: brandName,
    url: canonical,
    telephone: phone,
    email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "צבי הנחל 4",
      addressLocality: "פארק תעשיות עמק חפר",
      addressCountry: "IL",
    },
    sameAs: [
      // הוסף כאן קישורי רשתות אם יש (Facebook/Instagram/TikTok וכו')
    ],
    image: [ogImage],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "אודות", item: canonical },
    ],
  };

  return (
    <div className="container py-5">
      <Helmet prioritizeSeoTags>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index,follow,max-image-preview:large" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Karina" />
        <meta property="og:locale" content="he_IL" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={ogImage} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(localBusinessJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

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
      <p className="mb-1">📞 טלפון: {phone}</p>
      <p className="mb-3">✉️ דוא״ל: {email}</p>

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
