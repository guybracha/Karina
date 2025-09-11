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
          <title>קארינה - חולצות מודפסות</title>
          <meta
            name="description"
            content="קארינה מתמחה בהדפסות על חולצות עבודה, מוצרי בטיחות, ועיצובים אישיים."
          />
          <meta property="og:title" content="קארינה - חולצות מודפסות" />
          <meta
            property="og:description"
            content="הדפסות באיכות גבוהה, משלוח חינם, גרפיקה מקצועית."
          />

          {/* Google tag (gtag.js) */}
          <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-SHQSKGKY2C"
          ></script>
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
