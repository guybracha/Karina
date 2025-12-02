// src/lib/salesTrainingData.js
// Training snippets from real-style human sales conversations so the bot can mimic a salesperson.

const STOP_WORDS = new Set([
  "אני", "אתה", "את", "אנחנו", "על", "עם", "של", "שלי", "שלך", "אם", "או", "זה", "זהו",
  "יש", "אין", "גם", "עוד", "אז", "מה", "איך", "כמה", "צריך", "אפשר", "רק", "כן", "לא",
  "היי", "שלום", "הייי", "תודה", "תודה!", "תודה רבה", "יאללה", "טוב", "סבבה",
]);

export const SALES_CONVERSATIONS = [
  {
    id: "bulk_team_order",
    scenario: "חולצות צוות בכמות",
    tags: ["כמות", "צוות", "חולצות", "לוגו", "דדליין", "הנחה"],
    followUps: [
      { text: "כמה יחידות ומידות יש לכם?", query: "יש לי צוות של __ אנשים עם מידות שונות" },
      { text: "לצרף לוגו לבדיקה", query: "מצרף לוגו לבדיקת התאמה" },
      { text: "מחיר דוגמה לכמות 50", query: "כמה יעלה להזמין 50 יחידות?" },
    ],
    transcript: [
      { role: "customer", text: "היי, אני צריך חולצות עם לוגו לצוות של בערך 25 אנשים." },
      { role: "agent", text: "היי! בכיף. איזה צבע וגזרת חולצה אתם רוצים? ואם יש דדליין קרוב נסגור מחיר והדפסה שמתאימה." },
      { role: "customer", text: "האירוע עוד שבועיים, צבע שחור, הדפסה צבעונית." },
      { role: "agent", text: "על 25 יחידות אפשר לתת כ~7% הנחה ולהדפיס DTF צבעוני חד. אכוון את הייצור ל-7‑10 ימי עסקים, אז כדאי לסגור היום." },
      { role: "customer", text: "נשמע טוב. מה עם מידות?" },
      { role: "agent", text: "תשלחו לי רשימת מידות (S‑XXL) ואני מכניסה להזמנה כדי שלא יפספסו אף אחד." },
    ],
  },
  {
    id: "logo_preparation",
    scenario: "הכנת לוגו להדפסה",
    tags: ["לוגו", "קובץ", "הדפסה", "dtf", "png", "ai", "הכנה"],
    followUps: [
      { text: "איך לייצא קובץ חד", query: "איך לייצא לוגו חד להדפסה?" },
      { text: "בדיקת צבעים", query: "מה לגבי התאמת צבעים ללוגו?" },
    ],
    transcript: [
      { role: "customer", text: "יש לי לוגו רק ב-PNG, זה מספיק?" },
      { role: "agent", text: "אם יש PDF/AI זה מעולה. אם לא, שלחו PNG ב-300DPI על רקע שקוף ונחדד לפני הדפסה." },
      { role: "customer", text: "אפשר להדפיס על שני צדדים?" },
      { role: "agent", text: "בטח. חזית + גב אפשריים. אוסיף לך מחיר צד נוסף ונראה אם זה נכנס בתקציב." },
    ],
  },
  {
    id: "event_urgency",
    scenario: "דחיפות לפני אירוע",
    tags: ["דחוף", "תאריך", "הספקה", "אירוע", "מהר", "אקספרס"],
    followUps: [
      { text: "תאריך יעד מדויק", query: "התאריך האחרון הוא __" },
      { text: "שילוח מהיר", query: "יש אופציה למשלוח אקספרס?" },
    ],
    transcript: [
      { role: "customer", text: "האירוע שלי כבר ביום חמישי, זה ריאלי?" },
      { role: "agent", text: "נבדוק. יש לך מידה וכמות? בייצור אקספרס אנחנו סוגרים עיצוב באותו יום ושולחים שליח מהיר." },
      { role: "customer", text: "זה 15 חולצות, עיצוב קיים." },
      { role: "agent", text: "15 יחידות אפשר לזרז. אאשר לך לוח זמנים ונדאג ששליח מגיע לפני חמישי." },
    ],
  },
  {
    id: "price_negotiation",
    scenario: "התמקחות מחיר חכמה",
    tags: ["מחיר", "הנחה", "תקציב", "עלות", "הצעה"],
    followUps: [
      { text: "חישוב מחיר לכמות", query: "תעשה לי הצעת מחיר ל-30 חולצות" },
      { text: "הנחה לכמויות", query: "יש הנחה אם אני עולה לכמות גדולה יותר?" },
    ],
    transcript: [
      { role: "customer", text: "יש לי תקציב הדוק, מה אפשר לעשות?" },
      { role: "agent", text: "אבדוק הנחה לפי כמות. אם תעבור מ-20 ל-30 יחידות נקפוץ למדרגת הנחה טובה יותר ונוריד עלות ליחידה." },
      { role: "customer", text: "אני לא בטוח על 30, אולי 22." },
      { role: "agent", text: "ב-22 כבר מקבלים 7% הנחה. אם תסגור 30 אוסיף משלוח חינם וזה יוריד עלות כוללת." },
    ],
  },
  {
    id: "product_recommendation",
    scenario: "המלצה לפי שימוש",
    tags: ["המלצה", "חולצות", "ספורט", "צוות", "איכות", "בדים"],
    followUps: [
      { text: "הבד המומלץ לריצה", query: "איזה בד מתאים לאימון/ריצה?" },
      { text: "הדפסה מחזיקה כביסה", query: "כמה זמן ההדפסה מחזיקה אחרי כביסות?" },
    ],
    transcript: [
      { role: "customer", text: "אני מחפש חולצות טובות לריצה עם לוגו קטן." },
      { role: "agent", text: "יש לנו בד Dry-Fit שמנדף זיעה, מתאים לספורט. נמליץ על לוגו קטן בחזה כדי שלא יפריע בתנועה." },
      { role: "customer", text: "מחפש גם משהו שישרוד הרבה כביסות." },
      { role: "agent", text: "הדפסות DTF עמידות, במיוחד על בד פוליאסטר. אצרף הוראות כביסה כדי לשמור על הצבע." },
    ],
  },
];

export const SALES_TRAINING_PAIRS = buildSalesTrainingPairs(SALES_CONVERSATIONS);

export function buildSalesTrainingPairs(conversations = []) {
  const pairs = [];
  conversations.forEach((conv) => {
    const sharedTags = new Set(conv.tags || []);
    conv.transcript.forEach((turn, idx) => {
      const next = conv.transcript[idx + 1];
      if (!next) return;
      if (turn.role !== "customer" || next.role !== "agent") return;

      const normalizedPrompt = normalize(turn.text);
      pairs.push({
        id: `${conv.id}_${idx}`,
        scenario: conv.scenario,
        prompt: turn.text,
        normalizedPrompt,
        response: next.text,
        tags: [...sharedTags],
        followUps: conv.followUps || [],
        tokens: tokenize(normalizedPrompt),
      });
    });
  });
  return pairs;
}

export function findSalesConversationReply(message, options = {}) {
  const { pairs = SALES_TRAINING_PAIRS, context = [] } = options;
  if (!message) return null;

  const normalizedMsg = normalize(message);
  const msgTokens = tokenize(normalizedMsg);
  let best = null;

  for (const pair of pairs) {
    const overlap = jaccard(msgTokens, pair.tokens);
    let score = overlap;

    // Boost when message explicitly mentions tagged topics.
    if (pair.tags.some((tag) => normalizedMsg.includes(tag))) {
      score += 0.08;
    }

    // Light boost when recent context touches similar words.
    if (Array.isArray(context) && context.length) {
      const contextHit = context.some(
        (ctx) => jaccard(msgTokens, tokenize(normalize(ctx))) > 0.2
      );
      if (contextHit) score += 0.05;
    }

    // Encourage answers that address price/quantity urgency.
    if (normalizedMsg.includes("מחיר") && pair.tags.includes("מחיר")) score += 0.05;
    if (normalizedMsg.includes("דחוף") && pair.tags.includes("דחוף")) score += 0.05;

    if (!best || score > best.score) {
      best = { ...pair, score };
    }
  }

  if (!best || best.score < 0.25) return null;

  return {
    text: best.response,
    score: best.score,
    scenario: best.scenario,
    followUps: best.followUps || [],
  };
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[.,!?()"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w && w.length > 1 && !STOP_WORDS.has(w))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}
