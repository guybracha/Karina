import React, { useState } from "react";
import { callTestSendEmail } from "../utils/callTestSendEmail";

export default function TestMailButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    setBusy(true);
    setMsg("");
    try {
      const data = await callTestSendEmail({
        to: "you@gmail.com", // אפשר להשאיר ריק כדי שיישלח רק לחברה
        subject: "Karina — בדיקה",
        text: "מייל בדיקה מהפונקציה testSendEmail"
      });
      setMsg(`נשלח ✅ אל: ${data.sentTo || "חברת קארינה"}`);
    } catch (e) {
      console.error(e);
      setMsg(`נכשל ❌ ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={send} disabled={busy} className="btn btn-outline-primary">
      {busy ? "שולח..." : "שלח מייל בדיקה"}
    </button>
  );
}
