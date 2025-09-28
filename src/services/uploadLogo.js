import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { userOrderBaseDir } from "../utils/storagePaths";

/** מעלה את קובץ הלוגו לתיקייה המשותפת של ההזמנה */
export async function uploadUserLogo({ uid, displayName, orderId, file }) {
  if (!uid || !orderId) throw new Error("uploadUserLogo: uid/orderId required");

  const base = userOrderBaseDir({ uid, displayName, orderId });
  const objectRef = ref(storage, `${base}/logo/original.png`);

  const snap = await uploadBytes(objectRef, file, {
    contentType: file.type || "image/png",
    customMetadata: {
      ownerUid: uid,
      ownerDisplayName: displayName || "",
      kind: "logo",
      orderId,
    },
  });
  const url = await getDownloadURL(snap.ref);
  return { path: snap.ref.fullPath, url };
}
