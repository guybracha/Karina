// src/utils/callTestSendEmail.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; // ה־initializeApp שלך

export async function callTestSendEmail({
  to = "",          // אופציונלי – אם ריק, יישלח למייל החברה
  subject = "בדיקת מייל",
  text = "שלום! זה מייל בדיקה מ-Karina."
} = {}) {
  const functions = getFunctions(app, "europe-west1");
  const fn = httpsCallable(functions, "testSendEmail");
  const res = await fn({ to, subject, text });
  // res.data => { ok:true, sentTo: "..."} במקרה מוצלח
  return res.data;
}
