// אותם מפתחות כמו ב-Cart.jsx
export const LS_LOGO_ID = (side: "front"|"back") => `karina:logoId:${side}`;
export const LS_PENDING_LOGOS = "karina:pendingLogos";

// שמירת dataURL לגיבוי (כדי לשרוד רענון דף)
export function savePendingLogo(logoId: string, originalDataUrl: string) {
  try {
    const raw = localStorage.getItem(LS_PENDING_LOGOS);
    const arr = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(arr) ? arr.filter((x: any) => x?.id !== logoId) : [];
    filtered.push({ id: logoId, originalDataUrl, createdAt: Date.now() });
    localStorage.setItem(LS_PENDING_LOGOS, JSON.stringify(filtered));
  } catch {}
}

export function setActiveLogoForSide(side: "front"|"back", logoId: string) {
  try { localStorage.setItem(LS_LOGO_ID(side), logoId); } catch {}
}

// כלי קטן: File -> dataURL (לגיבוי בלבד)
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}
