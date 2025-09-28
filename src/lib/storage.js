// src/lib/storage.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

// צור מזהה פשוט ללוגו
const newId = () => Math.random().toString(36).slice(2, 10);

export async function uploadUserLogo({ uid, file }) {
  if (!uid || !file) throw new Error("uid/file missing");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const logoId = newId();

  const path = `users/${uid}/logos/${logoId}/original.${ext}`;
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, file, {
    contentType: file.type || "image/png",
    customMetadata: {
      originalName: file.name || "",
      source: "user-upload",
    },
  });

  await new Promise((res, rej) => {
    task.on("state_changed", null, rej, res);
  });

  const url = await getDownloadURL(task.snapshot.ref);

  return { logoId, path, url, contentType: file.type || "image/png" };
}
