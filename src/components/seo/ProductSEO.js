// src/components/seo/ProductSEO.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * ProductSEO
 * מאחד תגיות מטא, OpenGraph/Twitter, ו-JSON-LD עבור דף מוצר.
 *
 * props:
 * - product:      אובייקט המוצר (name, slug, price, img, backImg, colors, sizes, rating, reviews, ...).
 * - canonical:    כתובת קנונית מלאה (string).
 * - origin:       מקור האתר (https://example.com).
 * - description:  תיאור SEO לדף.
 * - shownImage:   ה-URL של התמונה שמוצגת (ל-og/twitter).
 * - canUploadLogo:boolean (האם מותר לוגו).
 * - displayAvg:   דירוג ממוצע לתצוגה (number).
 * - displayCount: מס' ביקורות לתצוגה (number).
 * - breadcrumb:   [{name, item}] נתיבי פירורים (אופציונלי; כבר נבנה אצלך).
 * - faq:          [{q, a}]  שאלות נפוצות למוצר (אופציונלי).
 */
export default function ProductSEO({
  product,
  canonical,
  origin,
  description,
  shownImage,
  canUploadLogo,
  displayAvg,
  displayCount,
  breadcrumb = [
    { name: "דף הבית", item: `${origin}/` },
    { name: "קטלוג",   item: `${origin}/catalog` },
    { name: product?.name || "מוצר", item: canonical },
  ],
  faq = [] // אפשר להזין ממקור אחר בעתיד
}) {
  if (!product) return null;

  const title = `${product.name} | קארינה - הדפסה על חולצות`;
  const ogTitle = `${product.name} | קארינה`;
  const price = String(product.price ?? "");
  const images = shownImage ? [shownImage] : (product.img ? [product.img] : []);
  const sku = product.slug || "";
  const availability = "https://schema.org/InStock";

  // Product JSON-LD
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    image: images,
    sku,
    brand: { "@type": "Brand", name: "Karina" },
    ...(displayCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
ratingValue: Number((displayAvg?.toFixed?.(2) ?? displayAvg) || 0),        reviewCount: Number(displayCount),
        bestRating: 5,
        worstRating: 1
      }
    }),
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "ILS",
      price,
      availability
    },
    // מאפיינים נוספים שימושיים
    additionalProperty: [
      { "@type": "PropertyValue", name: "logoAllowed", value: String(canUploadLogo) },
      ...(Array.isArray(product.colors) && product.colors.length
        ? [{ "@type": "PropertyValue", name: "colors", value: product.colors.join(", ") }]
        : []),
      ...(Array.isArray(product.sizes) && product.sizes.length
        ? [{ "@type": "PropertyValue", name: "sizes", value: product.sizes.join(", ") }]
        : []),
    ]
  };

  // Breadcrumbs JSON-LD
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumb.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item
    }))
  };

  // FAQ JSON-LD (אופציונלי – רק אם סופק)
  const faqJsonLd =
    Array.isArray(faq) && faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a }
          }))
        }
      : null;

  return (
    <Helmet prioritizeSeoTags>
      {/* בסיס */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content="index,follow,max-image-preview:large" />

      {/* Open Graph */}
      <meta property="og:type" content="product" />
      <meta property="og:site_name" content="Karina" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      {shownImage && <meta property="og:image" content={shownImage} />}
      {shownImage && <meta property="og:image:alt" content={product.name} />}

      {/* Product OG extras */}
      <meta property="product:price:amount" content={price} />
      <meta property="product:price:currency" content="ILS" />
      {/* אפשר גם: product:availability, product:brand */}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={description} />
      {shownImage && <meta name="twitter:image" content={shownImage} />}
      {shownImage && <meta name="twitter:image:alt" content={product.name} />}

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      {faqJsonLd && <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>}
    </Helmet>
  );
}
