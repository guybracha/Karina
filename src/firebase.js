// src/firebase.js
/* global globalThis */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  doc, getDoc, setDoc,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,            // Enterprise בלבד
  onTokenChanged as onAppCheckTokenChanged,
  getToken as getAppCheckToken,
} from "firebase/app-check";

/* =========================
   Config & Environment
   ========================= */
const g = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}));
const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

/** קונפיג מ-ENV + לוגים ב-DEV */
function resolveFirebaseConfig() {
  const RUNTIME = (typeof window !== "undefined" && window.__ENV__) || {};
  const cfg = {
    apiKey:             process.env.REACT_APP_FB_API_KEY             || RUNTIME.FIREBASE_API_KEY             || "",
    authDomain:         process.env.REACT_APP_FB_AUTH_DOMAIN         || RUNTIME.FIREBASE_AUTH_DOMAIN         || "",
    projectId:          process.env.REACT_APP_FB_PROJECT_ID          || RUNTIME.FIREBASE_PROJECT_ID          || "",
    storageBucket:      process.env.REACT_APP_FB_STORAGE_BUCKET      || RUNTIME.FIREBASE_STORAGE_BUCKET      || "",
    messagingSenderId:  process.env.REACT_APP_FB_MESSAGING_SENDER_ID || RUNTIME.FIREBASE_MESSAGING_SENDER_ID || "",
    appId:              process.env.REACT_APP_FB_APP_ID              || RUNTIME.FIREBASE_APP_ID              || "",
    measurementId:      process.env.REACT_APP_FB_MEASUREMENT_ID      || RUNTIME.FIREBASE_MEASUREMENT_ID      || undefined,
  };

  if (isDev) {
    console.log("[Firebase] config (redacted):", {
      ...cfg,
      apiKey: cfg.apiKey ? "<set>" : "<missing>",
      appId:  cfg.appId  ? "<set>" : "<missing>",
    });
    if (!cfg.projectId) console.warn("⚠️ Missing projectId. ודא .env.local");
    if (cfg.storageBucket && !/\.(appspot\.com|firebasestorage\.app)$/i.test(cfg.storageBucket)) {
      console.warn("⚠️ storageBucket לא נראה תקין (צפה ל- <project>.appspot.com או firebasestorage.app)");
    }
  }

  const missing = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"].filter(k => !cfg[k]);
  if (missing.length) throw new Error(`[Firebase config] חסרים משתנים: ${missing.join(", ")}`);
  return cfg;
}

const firebaseConfig = resolveFirebaseConfig();

/* =========================
   App (singleton)
   ========================= */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// חשיפה נוחה (גם בפרוד לדיבוג קצר)
if (isBrowser) { try { window.firebaseApp = app; } catch {} }

/* =========================
   Auth – popup + local persistence
   ========================= */
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
})();

/* =========================
   App Check – Enterprise בלבד
   ========================= */
export let appCheck = null;

// נדרש: REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY מה-Console של GCP (עם הדומיינים karina.co.il/www/localhost)
const ENTERPRISE_SITE_KEY = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
const ENABLE_APPCHECK = String(process.env.REACT_APP_ENABLE_APPCHECK || "true").toLowerCase() === "true";

async function getAppCheckAttestation(forceRefresh = false) {
  try {
    if (!appCheck) return null;
    const tok = await getAppCheckToken(appCheck, forceRefresh);
    return tok?.token || null;
  } catch { return null; }
}

if (isBrowser && ENABLE_APPCHECK) {
  try {
    if (!ENTERPRISE_SITE_KEY) {
      console.error("[AppCheck] Missing REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY");
    }
    // Debug token (אם הוגדר)
    const envDebug = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
    if (envDebug && !("FIREBASE_APPCHECK_DEBUG_TOKEN" in g)) {
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = envDebug;
      if (isDev) console.info("[AppCheck] Debug token set from env.");
    }

    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });

    // חשיפה לקונסול בכל מצב
    try { window.appCheck = appCheck; } catch {}

    onAppCheckTokenChanged(appCheck, (tok) => {
      console.log("AppCheck:", tok ? "OK" : "MISSING");
    });
    // טריגר מיידי לטוקן (יוציא לוג אם יש בעיה בדומיין/מפתח)
    getAppCheckToken(appCheck, true).catch(e =>
      console.warn("[AppCheck] getToken failed:", e?.message || e)
    );
  } catch (e) {
    console.error("[AppCheck] init failed:", e?.message || e);
  }
}

/* =========================
   Analytics (optional)
   ========================= */
export let analytics = null;
if (isBrowser) {
  try { analyticsSupported().then(ok => { if (ok) { try { analytics = getAnalytics(app); } catch {} } }).catch(() => {}); } catch {}
}

/* =========================
   Firestore (persistent cache + multi-tab)
   ========================= */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/* =========================
   Storage + Functions
   ========================= */
const bucket = (firebaseConfig.storageBucket || "").trim();
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
if (isDev) console.info("[Storage] using bucket:", bucket ? `gs://${bucket}` : "(default)");

const FUNCTIONS_REGION = process.env.REACT_APP_FB_FUNCTIONS_REGION || "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

/* =========================
   Online/Offline + DEV helpers
   ========================= */
if (isBrowser) {
  window.addEventListener("online",  () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) { disableNetwork(db).catch(() => {}); }

  if (isDev) {
    try {
      window.auth = auth;
      window.db = db;
      window.functions = functions;
      window.storage = storage;

      window.fsGet = async (path) => {
        const snap = await getDoc(doc(db, path));
        console.log("[fsGet]", path, "exists:", snap.exists(), "data:", snap.data());
        return snap;
      };
      window.fsSet = async (path, data, merge = true) => {
        await setDoc(doc(db, path), data, { merge });
        console.log("[fsSet] wrote", path, data, "(merge:", merge, ")");
      };

      window.signInEmail = async (email, password) => {
        const res = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth] signInEmail:", res.user?.uid);
        return res.user;
      };
      window.signOut = async () => { await signOut(auth); console.log("[Auth] signed out"); };
    } catch (e) {
      console.warn("Debug window attach failed (ignored):", e?.message || e);
    }
  }
}

/* =========================
   Emulators (optional)
   ========================= */
const wantEmulators = String(process.env.REACT_APP_USE_EMULATORS || "false").toLowerCase() === "true";
const isLocalHost = isBrowser && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

if (wantEmulators && isLocalHost) {
  try {
    console.log("🔌 Using Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (e) {
    console.warn("Emulator connection failed (ignored):", e?.message || e);
  }
}

/* =========================
   Helpers
   ========================= */
export async function ensureAuthTokenFresh() {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return await user.getIdToken(true);
}

// התחזות כ-UID (דוגמה)
const IMPERSONATE_FN_NAME = process.env.REACT_APP_FN_IMPERSONATE || "adminImpersonate";
async function getAppCheckTokenSafe() { return await getAppCheckAttestation(false); }

export async function impersonateUser(uid) {
  const appCheckToken = await getAppCheckTokenSafe();
  const call = httpsCallable(functions, IMPERSONATE_FN_NAME);
  const { data } = await call({ uid, appCheckToken });
  if (!data?.customToken) throw new Error("Impersonate failed: no customToken");
  const cred = await signInWithCustomToken(auth, data.customToken);
  return cred.user;
}

// QA לוג ב-DEV
if (isBrowser && isDev) {
  onAuthStateChanged(auth, (u) => {
    console.info("[Auth] state:", u ? { uid: u.uid, email: u.email } : "(signed out)");
  });
}
