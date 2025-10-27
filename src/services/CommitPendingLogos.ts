// src/services/commitPendingLogos.ts
import { auth, ensureAuthTokenFresh, storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { loadPending, clearPending, dataUrlToBlob, PendingLogo } from "../utils/pendingLogos";

async function uploadOne(path: string, blob: Blob, contentType: string, meta: Record<string,string> = {}) {
  await ensureAuthTokenFresh();
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, blob, { contentType, customMetadata: meta });
  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", undefined, reject, () => resolve());
  });
  const url = await getDownloadURL(task.snapshot.ref);
  return { path, url, bytes: task.snapshot.totalBytes, contentType };
}

/**
 * מעלה את כל הלוגואים הממתינים ל-Storage תחת users_prod/{uid}/orders_prod/{orderId}/logos/{logoId}/...
 * מחזיר מערך עם פרטי ההעלאה לשילוב במסמך ההזמנה ב-Firestore.
 */
export async function commitPendingLogos(orderId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not_authed");
  const items = loadPending();

  const results: Array<{
    id: string;
    preview?: { path: string; url: string };
    mockup?: { path: string; url: string };
    original?: { path: string; url: string };
    name: string;
    mime?: string;
    size?: number;
  }> = [];

  for (const it of items) {
    const basePath = `users_prod/${uid}/orders_prod/${orderId}/logos/${it.id}`;

    // preview
    let preview;
    if (it.previewDataUrl) {
      const b = dataUrlToBlob(it.previewDataUrl);
      preview = await uploadOne(`${basePath}/previews/preview.webp`, b, "image/webp", { kind: "preview" });
    }

    // mockup
    let mockup;
    if (it.mockupDataUrl) {
      const b = dataUrlToBlob(it.mockupDataUrl);
      mockup = await uploadOne(`${basePath}/mockups/mockup.webp`, b, "image/webp", { kind: "mockup" });
    }

    // original
    let original;
    if (it.originalDataUrl) {
      const b = dataUrlToBlob(it.originalDataUrl);
      original = await uploadOne(`${basePath}/original/original`, b, b.type || it.mime || "application/octet-stream",
        { kind: "original", originalName: it.name || "" });
    } else if (it.originalDeferred) {
      // המקור גדול ולא נשמר ב-localStorage: נסמן למעלה מסך התשלום שיאסוף את ה-File מה-Context ויעלה.
      // (ראה בדוגמה בקריאה משם)
    }

    results.push({ id: it.id, preview, mockup, original, name: it.name, mime: it.mime, size: it.size });
  }

  // אם הכל הצליח – ננקה את ה-pending
  clearPending();

  return results;
}
