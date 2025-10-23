// src/hooks/useRecaptcha.ts
import { useCallback, useEffect, useState } from "react";
import { loadRecaptchaScript } from "../lib/recaptcha";
import { checkCaptcha, VerifyRecaptchaResult } from "../services/recaptcha";

export function useRecaptcha() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null as string | null);

  // טען את הסקריפט ברקע כשמונט
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadRecaptchaScript({ withRender: false });
        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load reCAPTCHA");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const verify = useCallback(async (action: string = "login"): Promise<VerifyRecaptchaResult> => {
    return await checkCaptcha(action);
  }, []);

  return { ready, error, verify };
}
