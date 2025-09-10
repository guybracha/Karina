// src/App.js
import './App.css';
import LandingOne from './pages/LandingOne';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// נגישות
import './a11y/a11y.css';
import A11yToolkit from './a11y/A11yToolkit';
import ReadAloud from './a11y/ReadAloud';
import A11yFab from './a11y/A11yFab';   // ⬅️ חדש

function App() {
  return (
    <HelmetProvider>
      <>
        <Helmet htmlAttributes={{ lang: 'he', dir: 'rtl' }}>
          <title>קארינה - חולצות מודפסות</title>
          <meta name="description" content="קארינה מתמחה בהדפסות על חולצות עבודה, מוצרי בטיחות, ועיצובים אישיים." />
          <meta property="og:title" content="קארינה - חולצות מודפסות" />
          <meta property="og:description" content="הדפסות באיכות גבוהה, משלוח חינם, גרפיקה מקצועית." />
        </Helmet>
        <div className="App">
          <LandingOne />
        </div>
      </>
    </HelmetProvider>
  );
}
export default App;
