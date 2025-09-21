// CompressAndEmailLogo.jsx
import React, { useState } from "react";
import imageCompression from "browser-image-compression";

export default function CompressAndEmailLogo() {
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/svg+xml";

  async function handleSend() {
    if (!file) return;
    setSending(true); setMsg("");

    try {
      let workFile = file;

      // אם זה SVG – נמיר ל-PNG כדי לדחוס ולצרף כמספרה
      if (file.type === "image/svg+xml") {
        const svgText = await file.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const canvas = document.createElement("canvas");
        const maxDim = 2000;
        const scale = Math.min(1, maxDim / Math.max(img.width || 2000, img.height || 2000));
        canvas.width = Math.max(1, Math.floor((img.width || 2000) * scale));
        canvas.height = Math.max(1, Math.floor((img.height || 2000) * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngDataUrl = canvas.toDataURL("image/png");
        const bin = atob(pngDataUrl.split(",")[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        workFile = new File([arr], file.name.replace(/\.svg$/i, ".png"), { type: "image/png" });
        URL.revokeObjectURL(url);
      }

      // דחיסה איכותית
      const compressed = await imageCompression(workFile, {
        maxSizeMB: 1.5,          // יעד גודל
        maxWidthOrHeight: 2400,  // גודל מרבי
        useWebWorker: true,
        initialQuality: 0.85,
      });

      // ממירים ל-base64
      const toDataURL = (b) => new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b);
      });
      const dataUrl = await toDataURL(compressed);
      const base64 = dataUrl.split(",")[1];

      // שליחה לשרת (בחר אחד מהמסלולים למטה)
      // 1) Firebase Callable:
      // const { httpsCallable } = await import("firebase/functions");
      // const { functions } = await import("../firebase");
      // const emailLogoUpload = httpsCallable(functions, "emailLogoUpload");
      // const { data } = await emailLogoUpload({ base64, mime: compressed.type, filename: workFile.name });

      // 2) API מקומי (Express):
      const res = await fetch("/api/email-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mime: compressed.type, filename: workFile.name }),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "send failed");
      setMsg("✨ נשלח למייל בהצלחה (ללא אחסון בענן).");
    } catch (e) {
      console.error(e);
      setMsg("שגיאה בשליחה. נסה שוב.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card card-body">
      <h6 className="mb-2">העלאת לוגו ושליחה למייל (ללא אחסון)</h6>
      <input type="file" accept={ACCEPT} onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      <button className="btn btn-primary mt-2" disabled={!file||sending} onClick={handleSend}>
        {sending ? "שולח..." : "שלח"}
      </button>
      {msg && <div className="mt-2">{msg}</div>}
    </div>
  );
}
