// src/pages/HomePage.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="text-center py-5">
      {/* Hero Section */}
      <section className="mb-5">
        <h1 className="display-4 fw-bold mb-3">
          קארינה – הדפסה על חולצות לעסקים
        </h1>
        <p className="lead mb-4">
          חולצות ממותגות באיכות גבוהה, שירות אישי ומשלוחים מהירים לכל הארץ.
          מושלם לצוותים, אירועים וחברות.
        </p>
        <NavLink to="/catalog" className="btn btn-primary btn-lg">
          צפו בקטלוג
        </NavLink>
      </section>

      {/* Features */}
      <section className="container my-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">הדפסה מקצועית</h5>
                <p className="card-text">
                  טכנולוגיות מתקדמות להדפסה עמידה וברורה על מגוון בדים וצבעים.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">שירות אישי</h5>
                <p className="card-text">
                  ליווי צמוד משלב ההזמנה ועד קבלת המשלוח, כדי שתהיו מרוצים ב־100%.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h5 className="card-title fw-bold">משלוחים מהירים</h5>
                <p className="card-text">
                  זמני אספקה קצרים לכל חלקי הארץ – כדי שתספיקו לאירוע או לפרויקט שלכם.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary text-light py-5 mt-5">
        <div className="container">
          <h2 className="fw-bold mb-3">התחילו את ההזמנה כבר עכשיו</h2>
          <p className="mb-4">
            העלו לוגו, בחרו פריט וקבלו הצעת מחיר מותאמת אישית.
          </p>
          <NavLink to="/contact" className="btn btn-light btn-lg">
            צרו קשר
          </NavLink>
        </div>
      </section>
    </div>
  );
}
