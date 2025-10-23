// src/services/recaptcha.ts
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import { getRecaptchaToken } from "../lib/recaptcha";

export type VerifyRecaptchaResult = {
  ok: boolean;
  valid: boolean;
  action: string;
  expectedAction: string;
  score: number;
  reasons: string[];
  invalidReason?: string | null;
  passed: boolean;
};

/** מפיק token מהדפדפן ושולח ל-verifyRecaptcha (Cloud Function) לקבלת score/decision. */
export async function checkCaptcha(action: string = "login"): Promise<VerifyRecaptchaResult> {
  const token = await getRecaptchaToken(action);
  const functions = getFunctions(app);
  const verify = httpsCallable(functions, "verifyRecaptcha");
  const res = await verify({ token, action });
  return res.data as VerifyRecaptchaResult;
}
