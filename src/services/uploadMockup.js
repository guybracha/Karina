import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { userOrderBaseDir } from "../utils/storagePaths";

/** מעלה הדמיה (front/back) לאותה תיקייה */
export async function uploadMockup({
  uid,
  displayName,
  orderId,
  productSlug,
  side,        // "front" | "back"
  blob,        // Blob/File
}) {
  if (!uid || !orderId || !productSlug || !side) {
    throw new Error("uploadMockup: uid/orderId/productSlug/side required");
  }

  const base = userOrderBaseDir({ uid, displayName, orderId });
  const objectRef = ref(storage, `${base}/mockups/${productSlug}/${side}.png`);

  const snap = await uploadBytes(objectRef, blob, {
    contentType: "image/png",
    customMetadata: {
      ownerUid: uid,
      ownerDisplayName: displayName || "",
      kind: "mockup",
      orderId,
      productSlug,
      side,
    },
  });
  const url = await getDownloadURL(snap.ref);
  return { path: snap.ref.fullPath, url };
}
