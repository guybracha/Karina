// src/lib/recaptcha.ts
// ───────────────────────────────────────────────────────────────
// טעינה עצלה של ספריית reCAPTCHA Enterprise + הפקת טוקן מאובטחת
// עובד גם עם SSR, כולל debounce על טעינה, ו-timeoutים ברורים.
// ───────────────────────────────────────────────────────────────

declare global {
  interface Window {
    grecaptcha?: any;
  }
}

const DEFAULT_MAX_WAIT_MS = 5000;

const SITE_KEY: string =
  (import.meta as any)?.env?.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  "YOUR_SITE_KEY";

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

let loadingPromise: Promise<void> | null = null;

/** טוען את סקריפט reCAPTCHA פעם אחת (עם או בלי ?render=SITE_KEY). */
export function loadRecaptchaScript(opts?: {withRender?: boolean; siteKey?: string}): Promise<void> {
  if (!isBrowser) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const withRender = opts?.withRender ?? false;
  const siteKey = opts?.siteKey || SITE_KEY;

  loadingPromise = new Promise<void>((resolve, reject) => {
    // אם כבר נטען:
    if (window.grecaptcha?.enterprise?.execute) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = withRender
      ? `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`
      : `https://www.google.com/recaptcha/enterprise.js`;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

/** ממתין עד שה־API זמין, עם timeout סביר. */
export async function waitForRecaptcha(maxWaitMs: number = DEFAULT_MAX_WAIT_MS): Promise<any> {
  if (!isBrowser) throw new Error("reCAPTCHA cannot run on server");
  const started = Date.now();

  // אם הסקריפט טרם נטען — נטען אותו ללא ?render (או עם — לבחירתך)
  if (!window.grecaptcha?.enterprise?.execute) {
    try {
      await loadRecaptchaScript({ withRender: false }); // אפשר לשנות ל-true אם מתאים לך
    } catch (e) {
      throw e;
    }
  }

  while (!(window.grecaptcha?.enterprise?.execute)) {
    if (Date.now() - started > maxWaitMs) {
      throw new Error("reCAPTCHA failed to initialize in time");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.grecaptcha;
}

/** מחזיר token עבור action נתון (למשל "login" / "checkout" / "contact"). */
export async function getRecaptchaToken(action: string = "login", siteKey: string = SITE_KEY): Promise<string> {
  if (!action) action = "general";
  const grecaptcha = await waitForRecaptcha();
  const token = await grecaptcha.enterprise.execute(siteKey, { action });
  if (!token) throw new Error("Failed to obtain reCAPTCHA token");
  return token;
}
