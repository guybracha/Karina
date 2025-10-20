// src/pages/Contact.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";

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

  // ---- SEO ----
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/contact`;
  const pageTitle = "צור קשר | קארינה הדפסות";
  const pageDesc =
    "צרו קשר עם קארינה להדפסה על חולצות וביגוד עבודה — ייעוץ, הצעת מחיר והדמיה. זמינים בוואטסאפ, אימייל וטלפון.";
  const ogImage = `${origin}/img/logo.png`; // עדיף להחליף לתמונה ייעודית אם קיימת

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "קארינה הדפסות",
    url: origin,
    logo: ogImage,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+972-54-504-2443",
        contactType: "customer service",
        areaServed: "IL",
        availableLanguage: ["he", "en"],
        email: "karina.offical.israel@gmail.com",
      },
    ],
  };

  const contactPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "צור קשר",
    description: pageDesc,
    url: canonical,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "צור קשר", item: canonical },
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
        <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(contactPageJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <h1 className="mb-4">צור קשר</h1>

      <div className="row g-4">
        {/* פרטי התקשרות + מפה */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4 h-100 d-flex flex-column">
            <h5 className="mb-3">פרטי החברה</h5>
            <p className="mb-1">📍 צבי הנחל 4, פארק תעשיות עמק חפר</p>
            <p className="mb-1">📞 054-5042443</p>
            <p className="mb-1">✉️ karina.offical.israel@gmail.com</p>
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
                src="https://maps.google.com/maps?q=%D7%A6%D7%91%D7%99%20%D7%94%D7%A0%D7%97%D7%9C%204%20%D7%A2%D7%9E%D7%A7%20%D7%97%D7%A4%D7%A8&t=&z=16&ie=UTF8&iwloc=&output=embed"
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
          <div className="card shadow-sm p-4 h-100">
            <h5 className="mb-3">שלחו לנו הודעה</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">שם מלא</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">אימייל</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">הודעה</label>
                <textarea
                  name="message"
                  className="form-control"
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary">
                שליחה
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
