// src/App.js
import "./App.css";
import LandingOne from "./pages/LandingOne";
import { Helmet, HelmetProvider } from "react-helmet-async";

// נגישות
import "./a11y/a11y.css";
import A11yToolkit from "./a11y/A11yToolkit";
import ReadAloud from "./a11y/ReadAloud";
import A11yFab from "./a11y/A11yFab"; // ⬅️ FAB נגישות

function App() {
  return (
    <HelmetProvider>
      <>
        <Helmet htmlAttributes={{ lang: "he", dir: "rtl" }}>
      <title>קארינה – הדפסה על חולצות לעסקים | משלוח בכל הארץ</title>
      <meta name="description" content="הדפסות על חולצות עבודה, בטיחות ומיתוג לחברות. גרפיקה מקצועית, זמני אספקה מהירים ושירות אישי." />
      <link rel="canonical" href="https://karina.co.il/" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="קארינה – הדפסה על חולצות לעסקים" />
      <meta property="og:description" content="איכות הדפסה גבוהה, גרפיקה מקצועית ומשלוח מהיר." />
      <meta property="og:url" content="https://karina.co.il/" />
      <meta property="og:image" content="img/logo.png" />
      <meta property="og:locale" content="he_IL" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="קארינה – הדפסה על חולצות" />
      <meta name="twitter:description" content="הדפסות באיכות גבוהה לכל צורך עסקי." />
      <meta name="twitter:image" content="img/logo.png" />

      {/* Preconnect לשיפור ביצועים (Core Web Vitals) */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SHQSKGKY2C"></script>
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SHQSKGKY2C');
          `}
        </script>
    </Helmet>


        <div className="App">
          <LandingOne />

          {/* ===== כלים לנגישות =====
             שמים אותם בתוך עטיפה עם dir="ltr" כדי שהמיקום וה-X לא יתהפכו ב-RTL */}
          <div dir="ltr" id="a11y-fixed-layer">
            <A11yToolkit />
            <ReadAloud />
            <A11yFab />
          </div>
        </div>
      </>
    </HelmetProvider>
  );
}

export default App;
