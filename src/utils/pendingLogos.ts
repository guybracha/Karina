// src/utils/pendingLogos.ts
export type PendingLogo = {
  id: string;
  name: string;
  mime: string;              // של המקור אם שמור
  size: number;              // של המקור
  previewDataUrl: string;    // webp dataURL
  mockupDataUrl?: string;    // webp dataURL
  originalDataUrl?: string;  // dataURL של המקור (אם קטן מספיק)
  originalDeferred?: boolean;// true אם המקור לא נשמר ב-localStorage (גדול)
  createdAt: number;         // Date.now()
  product?: { slug: string; variantId?: string }; // אופציונלי – למעקב
};

const KEY = "karina.pendingLogos.v1";

export function loadPending(): PendingLogo[] {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function savePending(list: PendingLogo[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export function addPending(item: PendingLogo) {
  const list = loadPending();
  list.unshift(item);
  savePending(list);
}

export function removePending(id: string) {
  savePending(loadPending().filter(x => x.id !== id));
}

export function clearPending() {
  savePending([]);
}

// helpers
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "application/octet-stream";
  const binStr = atob(b64);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });
}
