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
  ReCaptchaEnterpriseProvider,   // Enterprise (מומלץ בפרוד)
  ReCaptchaV3Provider,          // v3 fallback
  onTokenChanged as onAppCheckTokenChanged,
  getToken as getAppCheckToken,
} from "firebase/app-check";

/* =========================
   Environment & Guards
   ========================= */
const g = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}));
const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

/** מאחד ENV בקומפילציה (process.env.REACT_APP_*) + ריצה (window.__ENV__) */
function fromEnv(key, runtimeKey) {
  const runtime = (isBrowser && window.__ENV__) || {};
  return (process.env[key] || runtime[runtimeKey] || "").toString().trim();
}

/* =========================
   Firebase Config
   ========================= */
function resolveFirebaseConfig() {
  const cfg = {
    apiKey:            fromEnv("REACT_APP_FB_API_KEY",            "FIREBASE_API_KEY"),
    authDomain:        fromEnv("REACT_APP_FB_AUTH_DOMAIN",        "FIREBASE_AUTH_DOMAIN"),
    projectId:         fromEnv("REACT_APP_FB_PROJECT_ID",         "FIREBASE_PROJECT_ID"),
    storageBucket:     fromEnv("REACT_APP_FB_STORAGE_BUCKET",     "FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: fromEnv("REACT_APP_FB_MESSAGING_SENDER_ID","FIREBASE_MESSAGING_SENDER_ID"),
    appId:             fromEnv("REACT_APP_FB_APP_ID",             "FIREBASE_APP_ID"),
    measurementId:     fromEnv("REACT_APP_FB_MEASUREMENT_ID",     "FIREBASE_MEASUREMENT_ID") || undefined,
  };

  if (isDev) {
    console.log("[Firebase] config (redacted):", {
      ...cfg,
      apiKey: cfg.apiKey ? "<set>" : "<missing>",
      appId:  cfg.appId  ? "<set>" : "<missing>",
      measurementId: cfg.measurementId ? "<set>" : "<missing>"
    });
    if (!cfg.projectId) console.warn("⚠️ Missing projectId. ודא .env.local / הגדרות CI.");
    if (cfg.storageBucket && !/\.(appspot\.com|firebasestorage\.app)$/i.test(cfg.storageBucket)) {
      console.warn("⚠️ storageBucket לא נראה תקין (צפה ל־ <project>.appspot.com או firebasestorage.app)");
    }
  }

  const must = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];
  const missing = must.filter(k => !cfg[k]);
  if (missing.length) throw new Error(`[Firebase config] חסרים משתנים: ${missing.join(", ")}`);

  return cfg;
}

const firebaseConfig = resolveFirebaseConfig();

/* =========================
   App (singleton)
   ========================= */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
if (isBrowser) { try { window.firebaseApp = app; } catch {} }

/* =========================
   Auth
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
   App Check
   ========================= */
export let appCheck = null;

// שליטה מאוחדת: הפעלת App Check + בחירת פרוביידר דרך ENV
const ENABLE_APPCHECK = (fromEnv("REACT_APP_ENABLE_APPCHECK", "ENABLE_APPCHECK") || "true").toLowerCase() === "true";
const ENTERPRISE_SITE_KEY = fromEnv("REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY", "RECAPTCHA_ENTERPRISE_SITE_KEY");
const V3_SITE_KEY         = fromEnv("REACT_APP_RECAPTCHA_V3_SITE_KEY",         "RECAPTCHA_V3_SITE_KEY");
const ENV_DEBUG_TOKEN     = fromEnv("REACT_APP_APPCHECK_DEBUG_TOKEN",          "APPCHECK_DEBUG_TOKEN");

// בלוקאל בלבד: תן ל-SDK לייצר debug token חדש אם לא סיפקת אחד (ימודפס לקונסול בפעם הראשונה)
if (isBrowser && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  if (!ENV_DEBUG_TOKEN) {
    // true => ה-SDK ינפיק טוקן חדש וידפיס "App Check debug token: <...>"
    g.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  } else {
    g.FIREBASE_APPCHECK_DEBUG_TOKEN = ENV_DEBUG_TOKEN;
  }
}

async function getAppCheckAttestation(forceRefresh = false) {
  try {
    if (!appCheck) return null;
    const tok = await getAppCheckToken(appCheck, forceRefresh);
    return tok?.token || null;
  } catch { return null; }
}

if (isBrowser && ENABLE_APPCHECK) {
  try {
    let provider = null;
    // בחירה חד-משמעית: Enterprise קודם; אם אין — ניפול ל-v3
    if (ENTERPRISE_SITE_KEY) {
      provider = new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY);
      if (isDev) console.log("[AppCheck] Provider: Enterprise");
    } else if (V3_SITE_KEY) {
      provider = new ReCaptchaV3Provider(V3_SITE_KEY);
      if (isDev) console.log("[AppCheck] Provider: v3");
    }

    if (!provider) {
      console.warn("[AppCheck] No SITE KEY (Enterprise/v3). Skipping App Check init.");
    } else {
      appCheck = initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });

      // חשיפה לכלי דיבאג/בדיקה בלי import דינמי
      try {
        window.appCheck = appCheck;
        window.getAppCheckToken = () => getAppCheckToken(appCheck, true);
        window.printAppCheckState = async () => {
          const t = await window.getAppCheckToken().catch(() => null);
          console.log("[AppCheck] token:", t?.token ? (t.token.slice(0, 12) + "…") : "(missing)");
        };
      } catch {}

      onAppCheckTokenChanged(appCheck, (tok) => {
        if (isDev) console.log("[AppCheck] token state:", tok ? "OK" : "MISSING");
      });

      // טריגר ראשוני (לא חובה, עוזר ללכוד שגיאות מוקדם)
      getAppCheckToken(appCheck, true).catch(e =>
        console.warn("[AppCheck] getToken failed:", e?.message || e)
      );
    }
  } catch (e) {
    console.error("[AppCheck] init failed:", e?.message || e);
  }
}

/* =========================
   Analytics (optional)
   ========================= */
export let analytics = null;
if (isBrowser) {
  try {
    analyticsSupported()
      .then(ok => { if (ok) { try { analytics = getAnalytics(app); } catch {} } })
      .catch(() => {});
  } catch {}
}

/* =========================
   Firestore (cache + multi-tab)
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

const FUNCTIONS_REGION = fromEnv("REACT_APP_FB_FUNCTIONS_REGION", "FB_FUNCTIONS_REGION") || "europe-west1";
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
const wantEmulators = (fromEnv("REACT_APP_USE_EMULATORS", "USE_EMULATORS") || "false").toLowerCase() === "true";
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

// App Check token (אם מאותחל)
async function getAppCheckTokenSafe() { return await getAppCheckAttestation(false); }

// התחזות כ-UID (Cloud Function adminImpersonate)
const IMPERSONATE_FN_NAME = fromEnv("REACT_APP_FN_IMPERSONATE", "FN_IMPERSONATE") || "adminImpersonate";
export async function impersonateUser(uid) {
  const appCheckToken = await getAppCheckTokenSafe(); // יכול להיות null; הפונקציה בענן צריכה לדעת לקבל null
  const call = httpsCallable(functions, IMPERSONATE_FN_NAME);
  const { data } = await call({ uid, appCheckToken });
  if (!data?.customToken) throw new Error("Impersonate failed: no customToken");
  const cred = await signInWithCustomToken(auth, data.customToken);
  return cred.user;
}

// QA לוג ב־DEV
if (isBrowser && isDev) {
  onAuthStateChanged(auth, (u) => {
    console.info("[Auth] state:", u ? { uid: u.uid, email: u.email } : "(signed out)");
  });
}
