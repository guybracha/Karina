import React, { useRef, useEffect, useState } from "react";
import ShieldShirts from "../compLanding/ShieldShirts";
import WorkShirts from "../compLanding/WorkShirts";
import "../style/Landing.css";
import AboutUs from "../compLanding/AboutUs";
import Products from "../compLanding/Products";
import Work from "../compLanding/Work";
import Shield from "../compLanding/Shield";
import Contact from "../compLanding/Contact";
import Footer from "../compLanding/Footer";
import logo from "../img/logo.png";
import Video from "../compLanding/Video";
import FacebookIcon from "../compLanding/FacebookIcon";
import Navbar from "../compLanding/Navbar";
import GifBanner from "../compLanding/GifBanner";
import ContactBanner from "../compLanding/ContactBanner";
import Banner from "../compLanding/Banner";
import A11yHUD from "../a11y/A11yHUD";
import A11yFab from "../a11y/A11yFab";
import A11yToolkit from "../a11y/A11yToolkit";
import ReadAloud from "../a11y/ReadAloud";

export default function LandingOne() {
  const shieldRef   = useRef(null);
  const workRef     = useRef(null);
  const aboutRef    = useRef(null);
  const productsRef = useRef(null);   // 👈 חדש
  const contactRef  = useRef(null);

  const [showBanner, setShowBanner] = useState(false);
  const [bannerShownOnce, setBannerShownOnce] = useState(false);

  const scrollToShield = () =>
    shieldRef.current?.scrollIntoView({ behavior: "smooth" });
  const scrollToWork = () =>
    workRef.current?.scrollIntoView({ behavior: "smooth" });

  const scrollToContact = () => contactRef.current?.scrollIntoView({ behavior: "smooth" }); // 👈 חדש

  // מציג את הבאנר כש-AboutUs או Products נכנסים לפריים
  useEffect(() => {
    if (bannerShownOnce) return;

    const sections = [aboutRef.current, productsRef.current].filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowBanner(true);
            setBannerShownOnce(true); // פעם אחת בלבד
            observer.disconnect();
          }
        });
      },
      { root: null, threshold: 0.5 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [bannerShownOnce]);

  return (
    <div className="container" id="top">
      {/* הבאנר נרנדר רק כשצריך */}
      {showBanner && (
        <GifBanner
          gifSrc={require("../img/bannerGif.gif")}
          alt="מבצע הדפסה מהיום למחר + משלוח חינם"
          ctaHref="#products"
          ctaTarget="_self"
          showEveryLoad={true}
          autoHideMs={0}
          navbarHeight={64}
        />
      )}

      <Navbar onGoWork={scrollToWork} onGoShield={scrollToShield} onGoContact={scrollToContact} />

      {/* HERO */}
      <header className="hero card-soft">
        <img
          src={logo}
          alt="Karina — חולצות מודפסות"
          className="hero-logo"
          loading="eager"
        />
        <h1 className="hero-title">הדפסה ייחודית שמבליטה את העסק</h1>
        <p className="hero-subtitle">
          חולצות עבודה, חולצות ממותגות לאירועים, ועיצובים מותאמים אישית.
        </p>
        <div className="hero-ctas">
          <a
            href="tel:0545042443"
            className="btn btn-primary"
            aria-label="התקשרו עכשיו"
          >
            התקשרו עכשיו
          </a>
          <button className="btn btn-primary" onClick={scrollToWork}>
            למוצרים שלנו
          </button>
        </div>
      </header>

      {/* AboutUs */}
      <section id="about" className="section card-soft" ref={aboutRef}>
        <AboutUs />
      </section>

      <Video />
      <section id="contact" ref={contactRef} className="section card-soft">
        <Contact />
      </section>

      <section className="row gap-24 section">
        <div className="col-sm work card-soft hc-on-white">
          <WorkShirts onScrollToWork={scrollToWork} />
        </div>
        <div className="col-sm shield card-soft hc-on-white">
          <ShieldShirts onScrollToShield={scrollToShield} />
        </div>
      </section>

      <section id="products" className="section">
        <div className="hc-on-white">
          <Products />
        </div>
      </section>


      <section ref={workRef} className="section card-soft">
        <Work />
      </section>

      <section ref={shieldRef} className="section card-soft">
        <Shield />
      </section>

      <Banner />  
      <section id="contact" ref={contactRef} className="section card-soft">
        <Contact />
      </section>

      <Footer />
      <A11yFab side="right" />
      <A11yToolkit mainId="main" />
      <ReadAloud targetSelector="#main" />

      {/* פעולות צפות */}
      <div className="fab-stack" aria-label="Quick actions">
        <FacebookIcon url="https://www.facebook.com/profile.php?id=61557693732178" />
      </div>
      <ContactBanner />
    </div>
  );
}
