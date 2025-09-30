// src/lib/persistLogo.ts
export const LS_LOGO_ID = (side: "front"|"back") => `karina:logoId:${side}`;
export const LS_PENDING_LOGOS = "karina:pendingLogos";

type PendingLogo = {
  id: string;
  originalDataUrl: string; // לשחזור אחרי רענון
  name?: string;
  type?: string; // mime
  ts: number;
};

function readPendingArray(): PendingLogo[] {
  try {
    const raw = localStorage.getItem(LS_PENDING_LOGOS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writePendingArray(arr: PendingLogo[]) {
  try { localStorage.setItem(LS_PENDING_LOGOS, JSON.stringify(arr)); } catch {}
}

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

/** נשמר עם מזהה והפניה לפי צד */
export async function persistLogoTemp(side: "front"|"back", id: string, file: File) {
  // 1) מזהה הלוגו לצד (front/back)
  try { localStorage.setItem(LS_LOGO_ID(side), id); } catch {}

  // 2) dataURL לטובת טעינה אחרי רענון
  const originalDataUrl = await fileToDataURL(file);
  const arr = readPendingArray();
  const idx = arr.findIndex(x => x.id === id);
  const rec: PendingLogo = {
    id, originalDataUrl, name: file.name, type: file.type, ts: Date.now()
  };
  if (idx >= 0) arr[idx] = rec; else arr.push(rec);
  writePendingArray(arr);
}

/** מחזיר dataURL לפי מזהה */
export function getPendingDataUrlById(id?: string|null): string|null {
  if (!id) return null;
  const arr = readPendingArray();
  return arr.find(x => x.id === id)?.originalDataUrl || null;
}

/** ניקוי (למשל אחרי העלאה/ביטול) */
export function clearLogo(side: "front"|"back", id?: string|null) {
  try { localStorage.removeItem(LS_LOGO_ID(side)); } catch {}
  if (!id) return;
  const arr = readPendingArray().filter(x => x.id !== id);
  writePendingArray(arr);
}
