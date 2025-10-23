// src/lib/recaptcha.ts

declare global {
  interface Window { grecaptcha?: any }
}

const DEFAULT_MAX_WAIT_MS = 5000;

// ✅ תומך גם ב-Vite וגם ב-CRA, כולל alias מה-workflow (REACT_APP_APPCHECK_E_SITE_KEY)
const SITE_KEY: string =
  // Vite
  ((typeof import.meta !== "undefined" && (import.meta as any).env) &&
    ( (import.meta as any).env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
      (import.meta as any).env.VITE_RECAPTCHA_V3_SITE_KEY )) ||
  // CRA
  (typeof process !== "undefined" && (process as any).env &&
    ( (process as any).env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY ||
      (process as any).env.REACT_APP_RECAPTCHA_V3_SITE_KEY ||
      (process as any).env.REACT_APP_APPCHECK_E_SITE_KEY )) ||
  "";

// אופציונלי: לוג דיבאג חד־פעמי כדי לוודא שנקרא מפתח אמיתי
if (!SITE_KEY) {
  console.warn("[reCAPTCHA] Missing site key env var – falling back to empty key");
} else {
  console.log("[reCAPTCHA] Using site key:", SITE_KEY.slice(0, 8) + "…");
}

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
let loadingPromise: Promise<void> | null = null;

export function loadRecaptchaScript(opts?: { withRender?: boolean; siteKey?: string }): Promise<void> {
  if (!isBrowser) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const withRender = opts?.withRender ?? false;
  const siteKey = opts?.siteKey || SITE_KEY;

  loadingPromise = new Promise<void>((resolve, reject) => {
    if (window.grecaptcha?.enterprise?.execute) { resolve(); return; }

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

export async function waitForRecaptcha(maxWaitMs: number = DEFAULT_MAX_WAIT_MS): Promise<any> {
  if (!isBrowser) throw new Error("reCAPTCHA cannot run on server");
  const started = Date.now();

  if (!window.grecaptcha?.enterprise?.execute) {
    await loadRecaptchaScript({ withRender: false });
  }

  while (!(window.grecaptcha?.enterprise?.execute)) {
    if (Date.now() - started > maxWaitMs) throw new Error("reCAPTCHA failed to initialize in time");
    await new Promise((r) => setTimeout(r, 100));
  }
  return window.grecaptcha;
}

export async function getRecaptchaToken(action: string = "login", siteKey: string = SITE_KEY): Promise<string> {
  const grecaptcha = await waitForRecaptcha();
  const token = await grecaptcha.enterprise.execute(siteKey, { action: action || "general" });
  if (!token) throw new Error("Failed to obtain reCAPTCHA token");
  return token;
}
