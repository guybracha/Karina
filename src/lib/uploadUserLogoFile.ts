// src/lib/uploadUserLogoFile.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../firebase";

// side: "front" | "back"
export async function uploadUserLogoFile(file: File, side: "front" | "back", slug?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // ודא שהסיומת/Content-Type תקינים
  const contentType = file.type || "application/octet-stream";
  const ext = (file.name.split(".").pop() || "").toLowerCase() || "bin";

  // 🔴 חשוב: תואם ל-Rules — נתיב תחת users/{uid}/logos/...
  const ts = Date.now();
  const safeSlug = (slug || "general").replace(/[^\w-]+/g, "-");
  const path = `users/${user.uid}/logos/${ts}-${safeSlug}-${side}.${ext}`;

  const storage = getStorage();
  const storageRef = ref(storage, path);

  // העלאה של קובץ המקור
  await uploadBytes(storageRef, file, { contentType });

  // קבלת URL לצפייה
  const url = await getDownloadURL(storageRef);

  return {
    path,
    url,
    name: file.name,
    size: file.size,
    contentType,
    uploadedAt: new Date().toISOString(),
  };
}
