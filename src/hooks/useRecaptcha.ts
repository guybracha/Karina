// hooks/useRecaptcha.ts
import { useEffect, useState, useRef } from "react";

const V3_KEY = (window as any).__ENV__?.RECAPTCHA_V3_SITE_KEY || process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY || "";
const ENT_KEY =
  (window as any).__ENV__?.RECAPTCHA_ENTERPRISE_SITE_KEY ||
  process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  process.env.REACT_APP_APPCHECK_E_SITE_KEY || ""; // רק אם אתה מתעקש למחזר (לא חובה)

const SKIP =
  (window as any).__ENV__?.AUTH_SKIP_RECAPTCHA === "1" ||
  process.env.REACT_APP_AUTH_SKIP_RECAPTCHA === "1";

type Verdict = { passed: boolean; valid: boolean; token?: string; provider: "v3" | "enterprise" | "skipped" };

export function useRecaptcha() {
  const [ready, setReady] = useState(SKIP);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (SKIP || loaded.current) return;
    loaded.current = true;

    async function load() {
      try {
        // נטען קודם v3 (קל, לא מצריך allowlist בגוגל קלאוד)
        if (V3_KEY) {
          await inject(`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(V3_KEY)}`);
          setReady(true);
          return;
        }
        // fallback: enterprise רק אם יש מפתח
        if (ENT_KEY) {
          await inject("https://www.google.com/recaptcha/enterprise.js?render=" + encodeURIComponent(ENT_KEY));
          setReady(true);
          return;
        }
        setError("No reCAPTCHA key provided");
      } catch (e:any) {
        setError(e?.message || "Failed to load reCAPTCHA");
      }
    }
    load();
  }, []);

  async function verify(action = "submit"): Promise<Verdict> {
    if (SKIP) return { passed: true, valid: true, provider: "skipped" };

    // v3 קודם
    if ((window as any).grecaptcha?.execute && V3_KEY) {
      const gre = (window as any).grecaptcha;
      await gre.ready();
      try {
        const token = await gre.execute(V3_KEY, { action });
        return { passed: !!token, valid: !!token, token, provider: "v3" };
      } catch (e) {
        // ננסה Enterprise לפני שניכשל
      }
    }
    // fallback: Enterprise
    if ((window as any).grecaptcha?.enterprise?.execute && ENT_KEY) {
      const greE = (window as any).grecaptcha.enterprise;
      await greE.ready();
      try {
        const token = await greE.execute(ENT_KEY, { action });
        return { passed: !!token, valid: !!token, token, provider: "enterprise" };
      } catch (e:any) {
        // אם זו שגיאת 401 — זה בדיוק ה-case שלך (domain לא מאושר)
        setError("reCAPTCHA Enterprise failed (likely unauthorized domain).");
        return { passed: false, valid: false, provider: "enterprise" };
      }
    }
    setError("reCAPTCHA not initialized");
    return { passed: false, valid: false, provider: "v3" };
  }

  return { ready, error, verify };
}

function inject(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script load failed: " + src));
    document.head.appendChild(s);
  });
}
