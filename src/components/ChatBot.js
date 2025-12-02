// src/components/ChatBot.js
import React, { useState, useRef, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { PRODUCTS } from "../lib/products";
import { priceForItem, getDiscountPct } from "../lib/pricing";
import { saveChatMessage, findSimilarQuestions } from "../lib/chatbotAnalytics";
import "./ChatBot.css";

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    text: "שלום! 👋 אני עוזר הווירטואלי של קארינה. איך אוכל לעזור לך היום?\n\n💡 טיפים מהירים:\n• כתוב 'חפש חולצה' למציאת מוצרים\n• כתוב 'חשב מחיר טריקו כמות 20' לחישוב מחיר\n• בחר באחת מהאפשרויות למטה",
    timestamp: new Date(),
  },
];

const QUICK_REPLIES = [
  { id: "pricing", text: "💰 הצעת מחיר", query: "אשמח לקבל הצעת מחיר" },
  { id: "search", text: "🔍 חיפוש מוצר", query: "אני מחפש מוצר" },
  { id: "sizes", text: "📏 טבלת מידות", query: "איפה טבלת המידות?" },
  { id: "logo", text: "🎨 העלאת לוגו", query: "איך מעלים לוגו?" },
  { id: "shipping", text: "🚚 משלוחים", query: "מה זמני המשלוח?" },
  { id: "contact", text: "📞 יצירת קשר", query: "איך יוצרים קשר?" },
  { id: "popular", text: "🔥 מוצרים פופולריים", query: "מה המוצרים הפופולריים?" },
  { id: "compare", text: "⚖️ השוואת מוצרים", query: "תעזור לי להשוות" },
  { id: "packages", text: "📦 חבילות מומלצות", query: "מה החבילות המומלצות?" },
];

const KNOWLEDGE_BASE = {
  pricing: {
    keywords: ["מחיר", "עולה", "עלות", "הצעת מחיר", "כמה", "תמחור", "מחירים", "מחירון", "price"],
    synonyms: ["כסף", "לשלם", "תשלום", "עלות", "תקציב"],
    response: `💰 **מחירון קארינה**

המחיר משתנה בהתאם ל:
• סוג המוצר (חולצה, סווטשירט, מעיל וכו')
• כמות היחידות
• שיטת ההדפסה (DTF/רקמה/סובלימציה)
• גודל ומיקום ההדפסה

**קבלת הצעת מחיר:**
1. בחרו מוצר מהקטלוג
2. העלו את הלוגו שלכם
3. בחרו כמות ומידות
4. המערכת תחשב מחיר מדויק

או צרו קשר ישירות: 055-721-2443`,
  },

  sizes: {
    keywords: ["מידה", "מידות", "טבלת מידות", "size", "גדלים"],
    response: `📏 **טבלת מידות**

טבלת המידות מופיעה בכל דף מוצר, בטאב "מידות".

**טיפ חשוב:** מדדו חולצה קיימת שנוחה לכם והשוו למידות בטבלה.

**מידות זמינות:**
• XS - 2XL (סטנדרט)
• 3XL - 5XL (במוצרים נבחרים)
• מידות ילדים

📞 צריכים עזרה? התקשרו: 055-721-2443`,
  },

  logo: {
    keywords: ["לוגו", "העלאה", "קובץ", "הדמיה", "עיצוב", "גרפיקה"],
    response: `🎨 **העלאת לוגו והדמיה**

**קבצים מומלצים:**
• PDF, AI, SVG (וקטור - איכות מושלמת)
• PNG שקוף ברזולוציה גבוהה (300 DPI)
• JPG באיכות גבוהה

**תהליך ההעלאה:**
1. היכנסו לדף המוצר
2. לחצו על "העלאת לוגו"
3. גררו את הקובץ או בחרו מהמחשב
4. תקבלו הדמיה מיידית!

**לא בטוחים?** שלחו לנו את הלוגו בוואטסאפ והצוות שלנו יטפל בזה: 055-721-2443`,
  },

  shipping: {
    keywords: ["משלוח", "זמן אספקה", "delivery", "הובלה", "שליח"],
    response: `🚚 **משלוחים ואספקה**

**זמני אספקה:**
• 7-10 ימי עסקים מאישור ההדמיה
• משלוח מהיר זמין (תוספת תשלום)

**עלויות משלוח:**
• משלוח רגיל: ₪35
• איסוף עצמי: חינם (צבי הנחל 4, עמק חפר)

**מעקב משלוח:**
תקבלו SMS + מייל עם מספר מעקב ברגע שהחבילה יוצאת למשלוח.

📦 משלוחים לכל הארץ!`,
  },

  contact: {
    keywords: ["קשר", "טלפון", "ווטסאפ", "whatsapp", "מייל", "email"],
    response: `📞 **יצירת קשר**

**טלפון/WhatsApp:**
055-721-2443

**אימייל:**
karina.offical.israel@gmail.com

**כתובת:**
צבי הנחל 4, אזור תעשייה עמק חפר

**שעות פעילות:**
א׳-ה׳: 9:00-17:00
ו׳: סגור

🌐 או שלחו הודעה כאן ונחזור אליכם!`,
  },

  process: {
    keywords: ["תהליך", "איך זה עובד", "שלבים", "הזמנה"],
    response: `⚙️ **תהליך ההזמנה**

**4 שלבים פשוטים:**

1️⃣ **בחירת מוצר**
   עיינו בקטלוג ובחרו את המוצר המתאים

2️⃣ **העלאת לוגו**
   העלו את הלוגו שלכם וקבלו הדמיה מיידית

3️⃣ **אישור והזמנה**
   בחרו כמויות, מידות ואשרו את ההדמיה

4️⃣ **ייצור ומשלוח**
   אנחנו מדפיסים, בודקים ושולחים תוך 7-10 ימים

💡 בכל שלב אפשר לפנות אלינו לשאלות!`,
  },

  quality: {
    keywords: ["איכות", "בד", "הדפסה", "עמידות", "כביסה"],
    response: `✨ **איכות ועמידות**

**טכנולוגיות הדפסה:**
• DTF - הדפסה ישירה בחום, עמידה מאוד
• רקמה - מראה פרימיום, עמיד לנצח
• סובלימציה - לבדים פוליאסטר, צבעים חיים

**עמידות:**
✓ עמיד לעשרות כביסות
✓ לא מתקלף או דוהה
✓ ניתן לגיהוץ (על הצד השני)

**בדים איכוטיים:**
• כותנה 100% / תערובת פוליאסטר
• משקל בד: 180-220 גרם
• תקן אירופאי

🏆 אחריות מלאה על איכות ההדפסה!`,
  },

  payment: {
    keywords: ["תשלום", "אשראי", "העברה", "מזומן", "payment"],
    response: `💳 **אפשרויות תשלום**

**תשלום מאובטח:**
• כרטיס אשראי (דרך Credit2000)
• העברה בנקאית
• מזומן באיסוף עצמי

**תשלום מפוצל:**
עד 12 תשלומים ללא ריבית (בכפוף לאישור)

🔒 כל התשלומים מוצפנים ומאובטחים`,
  },

  returns: {
    keywords: ["החזרה", "החזר", "ביטול", "return", "זיכוי"],
    response: `🔄 **מדיניות החזרות**

**לפני ייצור:**
ניתן לבטל/לשנות הזמנה עד לאישור ההדמיה הסופי

**אחרי ייצור:**
מוצרים מותאמים אישית לא ניתנים להחזרה, אלא אם:
• יש פגם בהדפסה
• טעות מצידנו בהזמנה

**פגם/טעות?**
נתקן בחינם או נחזיר כסף מלא!

📞 055-721-2443`,
  },

  catalog: {
    keywords: ["קטלוג", "מוצרים", "סוגים", "חולצות", "מה יש", "מה יש לכם"],
    response: () => {
      const categories = {
        workwear: "ביגוד עבודה",
        safety: "ביגוד בטיחות",
      };

      const productsByCategory = PRODUCTS.reduce((acc, product) => {
        if (!product.isBlocked) {
          if (!acc[product.category]) {
            acc[product.category] = [];
          }
          acc[product.category].push(product);
        }
        return acc;
      }, {});

      let response = "🛍️ **הקטלוג שלנו**\n\n";

      Object.entries(productsByCategory).forEach(([category, products]) => {
        response += `**${categories[category] || category}:**\n`;
        products.forEach((product) => {
          response += `• ${product.name} - ₪${product.price}\n`;
        });
        response += "\n";
      });

      response += "👉 לקטלוג המלא היכנסו לאתר!";
      return response;
    },
  },

  search: {
    keywords: ["חיפוש", "מחפש", "אני רוצה", "יש לכם", "תראה לי", "חפש"],
    response: (userMessage) => {
      const msg = userMessage.toLowerCase();
      
      // Extract search terms - remove common words
      const commonWords = ["אני", "רוצה", "לקנות", "להזמין", "יש", "לכם", "מחפש", "חיפוש", "תראה", "לי"];
      const searchTerms = msg.split(/\s+/).filter(word => 
        word.length > 2 && !commonWords.includes(word)
      );
      
      const matches = PRODUCTS.filter(p => {
        if (p.isBlocked) return false;
        
        const productTerms = [
          p.name.toLowerCase(),
          p.category.toLowerCase(),
          ...(p.colors || []).map(c => c.toLowerCase()),
          p.season?.toLowerCase() || "",
          p.type?.toLowerCase() || "",
        ];
        
        // Check if any search term matches any product term
        return searchTerms.some(searchTerm => 
          productTerms.some(productTerm => 
            productTerm.includes(searchTerm) || 
            searchTerm.includes(productTerm) ||
            // Fuzzy match for typos
            (searchTerm.length > 3 && productTerm.length > 3 && 
             levenshteinDistance(searchTerm, productTerm) <= 2)
          )
        );
      });

      if (matches.length === 0) {
        return `🔍 לא מצאתי מוצרים מתאימים לחיפוש.\n\n💡 נסה לחפש:\n• **לפי סוג:** חולצה, טריקו, מעיל, אפוד, קפוצ'ון\n• **לפי עונה:** קיץ, חורף\n• **לפי קטגוריה:** עבודה, בטיחות\n\nאו כתוב **"קטלוג"** לראות את כל המוצרים`;
      }

      let response = `🔍 **מצאתי ${matches.length} מוצרים מתאימים:**\n\n`;
      
      matches.slice(0, 5).forEach(product => {
        response += `📦 **${product.name}**\n`;
        response += `💰 מחיר בסיס: ₪${product.price} ליחידה\n`;
        if (product.colors?.length) {
          response += `🎨 צבעים זמינים: ${product.colors.join(", ")}\n`;
        }
        if (product.sizes?.length) {
          response += `📏 מידות: ${product.sizes.slice(0, 4).join(", ")}${product.sizes.length > 4 ? "..." : ""}\n`;
        }
        response += `\n`;
      });

      if (matches.length > 5) {
        response += `\n...ועוד **${matches.length - 5}** מוצרים נוספים\n`;
      }

      response += `\n💡 **רוצה לחשב מחיר מדויק?**\nכתוב: "חשב מחיר [שם מוצר] כמות [מספר]"`;
      
      return response;
    },
  },

  calculator: {
    keywords: ["מחשבון", "חשב מחיר", "כמה עולה", "מחיר ל"],
    response: () => {
      return `🧮 **מחשבון מחירים אינטראקטיבי**

אני יכול לעזור לך לחשב מחיר מדויק כולל הנחות כמות!

**📝 איך להשתמש:**
כתוב בפורמט: **"חשב מחיר [שם מוצר] כמות [מספר]"**

**✨ דוגמאות:**
• "חשב מחיר טריקו ארוך כמות 20"
• "חשב מחיר אפוד זוהר כמות 50"
• "חשב מחיר קפוצ'ון כמות 100"

**🎁 מדרגות הנחה:**
┌─────────────┬──────────────┐
│  כמות      │    הנחה      │
├─────────────┼──────────────┤
│  1-9        │    0%        │
│  10-14      │    2.39%     │
│  15-19      │    4.78%     │
│  20-24      │    7.17%     │
│  50-54      │   21.54%     │
│  100+       │   עד 45%!    │
└─────────────┴──────────────┘

💡 **טיפ:** ככל שתזמין יותר, המחיר ליחידה יורד משמעותית!`;
    },
  },

  popular: {
    keywords: ["פופולרי", "פופולריים", "נמכר", "מבוקש", "מומלץ", "הכי", "טוב"],
    response: () => {
      const popularProducts = [
        { name: "טריקו ארוך", reason: "הכי נמכר - איכות מעולה במחיר שווה" },
        { name: "אפוד זוהר", reason: "חובה לעבודות בטיחות" },
        { name: "קפוצ'ון", reason: "מושלם לחורף - חם ונוח" },
        { name: "פולו קצר", reason: "קלאסי ואלגנטי" },
      ];

      let response = `🔥 **המוצרים הפופולריים שלנו**\n\n`;
      response += `בהתבסס על הזמנות אחרונות:\n\n`;

      popularProducts.forEach((p, idx) => {
        const product = PRODUCTS.find(prod => prod.name.includes(p.name.split(' ')[0]));
        if (product) {
          response += `**${idx + 1}. ${product.name}**\n`;
          response += `   ${p.reason}\n`;
          response += `   💰 החל מ-₪${product.price}\n\n`;
        }
      });

      response += `💡 רוצה לחשב מחיר? כתוב:\n"חשב מחיר [שם מוצר] כמות [מספר]"`;
      return response;
    },
  },

  compare: {
    keywords: ["השוואה", "השווה", "הבדל", "לבחור", "עדיף", "טוב יותר", "מה ההבדל"],
    response: () => {
      return `⚖️ **השוואת מוצרים**\n\n**טריקו ארוך vs פולו:**\n• **טריקו** - כותנה 100%, נושם, מחיר משתלם\n• **פולו** - מראה מקצועי יותר, צווארון\n\n**סווטשירט vs קפוצ'ון:**\n• **סווטשירט** - קל יותר, מחיר נמוך\n• **קפוצ'ון** - חם יותר, כיס קנגורו\n\n**DTF vs רקמה:**\n• **DTF** - צבעוני, מפורט, זול יותר\n• **רקמה** - פרימיום, עמיד מאוד, מגביה מחיר\n\n💡 **צריך עזרה בבחירה?**\nספר לי מה המטרה והתקציב!`;
    },
  },

  packages: {
    keywords: ["חבילה", "חבילות", "סט", "מארז", "קומבו", "package"],
    response: () => {
      return `📦 **חבילות מומלצות לעסקים**\n\n**🏢 חבילת Start-Up (10-20 עובדים)**\n• 15 טריקו ארוך\n• הדפסת לוגו DTF\n• 💰 החל מ-₪${(15 * 60 * 0.95).toFixed(0)} (כולל הנחה!)\n\n**🏭 חבילת Professional (20-50 עובדים)**\n• 30 פולו + 20 טריקו\n• רקמת לוגו פרימיום\n• 💰 מחיר מיוחד - צור קשר\n\n**⚡ חבילת Enterprise (50+ עובדים)**\n• מבחר מוצרים מותאם אישית\n• ייעוץ מקצועי\n• הנחות עד 45%!\n\n**🦺 חבילת Safety**\n• 20 אפודים זוהרים\n• 10 וסטים\n• לוגו רפלקטיבי\n\n📞 **מעוניין?** חייג: 055-721-2443`;
    },
  },

  recommendations: {
    keywords: ["תמליץ", "המלץ", "המלצה", "מה לקחת", "מה כדאי", "recommend"],
    response: (userMessage) => {
      const msg = userMessage.toLowerCase();
      
      if (msg.includes("קיץ") || msg.includes("חם")) {
        return `☀️ **המלצות לקיץ**\n\n1. **טריקו קצר** - קליל ונושם\n2. **פולו קצר** - מקצועי וקליל\n3. **גופייה** - לימים חמים במיוחד\n\n💡 כולם מכותנה 100% נושמת!`;
      }
      
      if (msg.includes("חורף") || msg.includes("קר")) {
        return `❄️ **המלצות לחורף**\n\n1. **קפוצ'ון** - חם ונוח\n2. **סווטשירט** - שכבה מעולה\n3. **מעיל פליז** - חימום מקסימלי\n\n💡 ניתן לשלב שכבות!`;
      }
      
      if (msg.includes("בטיחות") || msg.includes("עבודה")) {
        return `🦺 **המלצות לבטיחות בעבודה**\n\n1. **אפוד זוהר** - חובה באתרי בניה\n2. **וסט רפלקטיבי** - נראות גבוהה\n3. **מכנסי עבודה** - עמידות מקסימלית\n\n⚠️ עומדים בתקני ISO!`;
      }

      return `💡 **המלצות כלליות**\n\n**למשרד/מכירות:**\n• פולו - מראה מקצועי\n\n**לעובדים בשטח:**\n• טריקו - נוח ועמיד\n\n**לאירועים:**\n• סווטשירט/קפוצ'ון - זכירות גבוהה\n\n**לבטיחות:**\n• אפוד זוהר - חובה בתקן\n\n🔍 ספר לי יותר על השימוש ואמליץ בדיוק!`;
    },
  },

  tips: {
    keywords: ["טיפ", "טיפים", "עצה", "עצות", "לדעת", "חשוב", "tip"],
    response: () => {
      return `💡 **טיפים חשובים**\n\n**📸 לוגו איכותי = תוצאה מושלמת**\n• העלו קובץ ברזולוציה גבוהה\n• PDF/AI = איכות הכי טובה\n• PNG שקוף = אפשרויות גמישות\n\n**📏 בחירת מידות**\n• מדדו חולצה קיימת\n• השאירו מרווח לנוחות\n• ילדים? קחו מידה גדולה יותר\n\n**💰 חסכו כסף**\n• הזמינו בכמויות - הנחות עד 45%!\n• שלבו מספר עובדים בהזמנה אחת\n• הדפסה חד-צדדית זולה יותר\n\n**🎨 עיצוב מנצח**\n• לוגו פשוט = קריא יותר\n• ניגודיות גבוהה (כהה על בהיר)\n• גודל סביר - לא קטן מדי\n\n**⏱️ תזמון**\n• הזמינו 10-14 ימים לפני האירוע\n• אשרו הדמיה מהר = ייצור מהר\n\n📞 שאלות? 055-721-2443`;
    },
  },

  discounts: {
    keywords: ["הנחה", "הנחות", "discount", "מבצע", "מבצעים"],
    response: () => {
      return `🎁 **מערכת ההנחות שלנו**

אנחנו מעניקים הנחות כמות אוטומטיות - ככל שתזמין יותר, המחיר יורד!

**📊 טבלת הנחות:**

**10-14 יחידות:** 2.39% הנחה
**15-19 יחידות:** 4.78% הנחה
**20-24 יחידות:** 7.17% הנחה
**25-29 יחידות:** 9.56% הנחה
**30-39 יחידות:** 11.95% הנחה
**40-49 יחידות:** 16.73% הנחה
**50-59 יחידות:** 21.54% הנחה
**60-69 יחידות:** 26.31% הנחה
**70-79 יחידות:** 31.08% הנחה
**80-89 יחידות:** 35.89% הנחה
**90-99 יחידות:** 40.66% הנחה
**100+ יחידות:** עד 45.45% הנחה! 🌟

**💡 דוגמה מעשית:**
טריקו ארוך במחיר בסיס ₪60:
• 5 יחידות = ₪300 (₪60 ליחידה)
• 20 יחידות = ₪1,114 (₪55.7 ליחידה) 💰
• 100 יחידות = ₪3,273 (₪32.7 ליחידה) 🔥

📞 רוצה לחשב? כתוב "מחשבון מחיר"`;
    },
  },
};

// Helper functions for interactive features
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function searchProducts(query) {
  const msg = query.toLowerCase();
  return PRODUCTS.filter(p => {
    if (p.isBlocked) return false;
    
    const searchTerms = [
      p.name.toLowerCase(),
      p.slug.toLowerCase(),
      ...(p.colors || []).map(c => c.toLowerCase()),
    ];
    
    return searchTerms.some(term => msg.includes(term));
  });
}

function calculatePrice(productName, quantity) {
  const product = PRODUCTS.find(p => 
    p.name.toLowerCase().includes(productName.toLowerCase()) ||
    productName.toLowerCase().includes(p.name.toLowerCase())
  );

  if (!product) {
    return null;
  }

  const qty = parseInt(quantity) || 1;
  const pricing = priceForItem({ slug: product.slug, qty }, PRODUCTS);
  const discount = getDiscountPct(qty);

  let response = `💰 **חישוב מחיר מפורט - ${product.name}**\n\n`;
  response += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  response += `📦 **כמות:** ${qty} יחידות\n`;
  response += `💵 **מחיר בסיס:** ₪${pricing.baseUnit} ליחידה\n`;
  
  if (discount > 0) {
    response += `\n🎁 **הנחת כמות:** ${(discount * 100).toFixed(2)}%\n`;
    response += `✨ **מחיר מוזל:** ₪${pricing.unitAfter} ליחידה\n`;
    response += `💰 **חיסכון:** ₪${((pricing.baseUnit - pricing.unitAfter) * qty).toFixed(2)}\n`;
  }
  
  response += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  response += `🏷️ **סה"כ לתשלום: ₪${pricing.lineTotal}**\n`;
  response += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  // Add smart recommendations
  if (qty < 10) {
    const next = 10;
    const nextPricing = priceForItem({ slug: product.slug, qty: next }, PRODUCTS);
    response += `\n💡 **המלצה חכמה:**\n`;
    response += `בהזמנה של ${next} יחידות:\n`;
    response += `• מחיר ליחידה: ₪${nextPricing.unitAfter}\n`;
    response += `• סה"כ: ₪${nextPricing.lineTotal}\n`;
    response += `• תתחיל לקבל הנחה! 🎉\n`;
  } else if (qty < 100) {
    // Find next discount tier
    const nextTiers = [20, 30, 40, 50, 60, 70, 80, 90, 100];
    const nextTier = nextTiers.find(t => t > qty) || 100;
    const nextPricing = priceForItem({ slug: product.slug, qty: nextTier }, PRODUCTS);
    const nextDiscount = getDiscountPct(nextTier);
    
    response += `\n💡 **שדרג את ההזמנה:**\n`;
    response += `בהזמנה של ${nextTier} יחידות:\n`;
    response += `• הנחה: ${(nextDiscount * 100).toFixed(2)}%\n`;
    response += `• מחיר ליחידה: ₪${nextPricing.unitAfter}\n`;
    response += `• סה"כ: ₪${nextPricing.lineTotal}\n`;
  } else {
    response += `\n🌟 **כל הכבוד!** קיבלת את ההנחה המקסימלית!\n`;
  }

  response += `\n📞 **רוצה להזמין?** צור קשר: 055-721-2443`;

  return response;
}

function findBestMatch(userMessage) {
  const msg = userMessage.toLowerCase();
  let bestMatch = null;
  let maxScore = 0;
  
  // Normalize common variations and typos
  const normalizedMsg = msg
    .replace(/[?!.,]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Check for price calculation request
  const priceMatch = msg.match(/חשב\s+מחיר\s+(.+?)\s+כמות\s+(\d+)/);
  if (priceMatch) {
    const [, productName, quantity] = priceMatch;
    const result = calculatePrice(productName, quantity);
    if (result) return result;
  }

  // Check for product-specific questions (e.g., "כמה עולה טריקו ארוך?")
  const productQuery = msg.match(/כמה\s+עולה\s+(.+?)(\?|$)/);
  if (productQuery) {
    const [, productName] = productQuery;
    const product = PRODUCTS.find(p => 
      !p.isBlocked && (
        p.name.toLowerCase().includes(productName.trim()) ||
        productName.includes(p.name.toLowerCase())
      )
    );
    
    if (product) {
      let response = `📦 **${product.name}**\n\n`;
      response += `💰 מחיר בסיס: ₪${product.price} ליחידה\n`;
      if (product.colors?.length) {
        response += `🎨 צבעים: ${product.colors.join(", ")}\n`;
      }
      if (product.sizes?.length) {
        response += `📏 מידות: ${product.sizes.join(", ")}\n`;
      }
      response += `\n💡 **רוצה לחשב מחיר עם הנחה?**\n`;
      response += `כתוב: "חשב מחיר ${product.name} כמות [מספר]"`;
      return response;
    }
  }

  // Check for general calculation request with quantity
  const quantityMatch = msg.match(/(\d+)\s+(יחידות|חולצות|מוצרים)/);
  if (quantityMatch && (msg.includes("מחיר") || msg.includes("עולה"))) {
    const qty = parseInt(quantityMatch[1]);
    const discount = getDiscountPct(qty);
    let response = `🧮 **חישוב הנחה לכמות ${qty} יחידות**\n\n`;
    
    if (discount > 0) {
      response += `🎁 הנחת כמות: ${(discount * 100).toFixed(2)}%\n\n`;
    } else {
      response += `ℹ️ אין הנחה לכמות קטנה מ-10 יחידות\n\n`;
    }
    
    response += `💡 לחישוב מדויק, כתוב:\n"חשב מחיר [שם מוצר] כמות ${qty}"\n\n**דוגמה:** "חשב מחיר טריקו ארוך כמות ${qty}"`;
    return response;
  }

  for (const [category, data] of Object.entries(KNOWLEDGE_BASE)) {
    let score = 0;
    
    // Check main keywords
    for (const keyword of data.keywords) {
      if (normalizedMsg.includes(keyword.toLowerCase())) {
        score += keyword.length * 2; // Higher weight for main keywords
      }
    }
    
    // Check synonyms if available
    if (data.synonyms) {
      for (const synonym of data.synonyms) {
        if (normalizedMsg.includes(synonym.toLowerCase())) {
          score += synonym.length; // Lower weight for synonyms
        }
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = typeof data.response === "function" ? data.response(userMessage) : data.response;
    }
  }

  return bestMatch;
}

// Format message text with simple markdown-like formatting
function formatMessage(text) {
  if (!text) return text;
  
  // Bold text (**text**)
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Preserve line breaks
  formatted = formatted.split('\n').map(line => {
    // Add emoji spacing
    if (line.match(/^[🔍💰📦🎨🚚📞⚙️✨💳🔄🛍️🧮💡🎁🏷️ℹ️📏]/)) {
      return `<div style="margin: 8px 0;">${line}</div>`;
    }
    return line;
  }).join('\n');
  
  return formatted;
}

// Extract keywords from message for analytics
function extractKeywords(message) {
  const allKeywords = Object.values(KNOWLEDGE_BASE).flatMap(kb => kb.keywords);
  const msg = message.toLowerCase();
  return allKeywords.filter(keyword => msg.includes(keyword.toLowerCase()));
}

// Share conversation to WhatsApp
function shareToWhatsApp(product, quantity, price) {
  const phone = "972557212443"; // קארינה
  const message = `שלום, אני מעוניין להזמין:\n${product}\nכמות: ${quantity}\nמחיר משוער: ₪${price}\n\nהגעתי מהאתר דרך הצ'אט בוט 🤖`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

export default function ChatBot({ initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
      
      // מניעת גלילה במובייל כשהצ'אט פתוח
      if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      // החזרת גלילה כשהצ'אט נסגר
      document.body.style.overflow = '';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const addMessage = (role, text) => {
    const newMessage = {
      id: Date.now().toString(),
      role,
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    if (role === "assistant" && !isOpen) {
      setUnreadCount((prev) => prev + 1);
    }

    return newMessage;
  };

  const handleQuickReply = (query) => {
    setInput("");
    handleSend(query);
  };

  const handleSend = async (messageText = input.trim()) => {
    if (!messageText) return;

    // הוסף הודעת משתמש
    addMessage("user", messageText);
    setInput("");
    setIsTyping(true);
    setSuggestedActions([]); // Clear suggestions on new message

    let responseText = "";
    let matchCategory = "general";

    try {
      // Try to find similar questions from history first
      const similarQuestions = await findSimilarQuestions(messageText, 3);
      
      // חפש בבסיס הידע המקומי
      const localMatch = findBestMatch(messageText);

      if (localMatch) {
        // סימולציה של "מקליד..."
        await new Promise((resolve) => setTimeout(resolve, 800));
        responseText = localMatch;
        addMessage("assistant", responseText);
        
        // Determine category
        const msg = messageText.toLowerCase();
        if (msg.includes("מחיר") || msg.includes("עולה")) matchCategory = "pricing";
        else if (msg.includes("חיפוש") || msg.includes("מחפש")) matchCategory = "search";
        else if (msg.includes("משלוח")) matchCategory = "shipping";
        else if (msg.includes("לוגו")) matchCategory = "logo";
        else if (msg.includes("מידות")) matchCategory = "sizes";
        
        // Add suggested actions based on context
        if (msg.includes("חיפוש") || msg.includes("מחפש")) {
          // Suggest quick price calculations for found products
          const matches = searchProducts(messageText);
          if (matches.length > 0 && matches.length <= 3) {
            setSuggestedActions(
              matches.map(p => ({
                text: `חשב מחיר ${p.name}`,
                query: `חשב מחיר ${p.name} כמות 10`
              }))
            );
          }
        } else if (msg.includes("מחשבון") || msg.includes("מחיר")) {
          // Suggest popular products for calculation
          const popular = PRODUCTS.filter(p => !p.isBlocked).slice(0, 3);
          setSuggestedActions(
            popular.map(p => ({
              text: `${p.name} - ₪${p.price}`,
              query: `חשב מחיר ${p.name} כמות 20`
            }))
          );
        }
      } else if (similarQuestions.length > 0 && similarQuestions[0].similarity > 0.5) {
        // Use answer from similar question
        responseText = similarQuestions[0].answer;
        addMessage("assistant", responseText);
        matchCategory = "history_match";
      } else {
        // אם אין התאמה מקומית, נסה AI
        try {
          const chatWithAI = httpsCallable(functions, "chatWithAssistant");
          const result = await chatWithAI({ message: messageText });
          
          if (result.data?.response) {
            responseText = result.data.response;
            addMessage("assistant", responseText);
            matchCategory = "ai";
          } else {
            throw new Error("No response from AI");
          }
        } catch (aiError) {
          console.error("AI error:", aiError);
          // Fallback
          responseText = `קיבלתי את השאלה שלך: "${messageText}"\n\nאני כרגע לא יכול לתת תשובה מדויקת, אבל הצוות שלנו ישמח לעזור!\n\n📞 חייגו: 055-721-2443\n✉️ כתבו: karina.offical.israel@gmail.com\n\nאו השתמשו בתפריט המהיר למטה 👇`;
          addMessage("assistant", responseText);
          matchCategory = "fallback";
        }
      }

      // Save chat to Firebase for analytics
      try {
        await saveChatMessage(messageText, responseText, {
          category: matchCategory,
          sessionId: sessionId,
          matchedKeywords: extractKeywords(messageText),
        });
      } catch (saveError) {
        console.error("Error saving chat log:", saveError);
        // Don't interrupt user experience if logging fails
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const rateResponse = async (messageId, isHelpful) => {
    // Update message locally
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, rated: isHelpful } : msg
    ));

    // Save to Firebase
    try {
      const message = messages.find(m => m.id === messageId);
      if (message && message.role === "assistant") {
        await saveChatMessage(
          messages[messages.indexOf(message) - 1]?.text || "",
          message.text,
          {
            wasHelpful: isHelpful,
            sessionId: sessionId,
          }
        );
      }
    } catch (error) {
      console.error("Error rating message:", error);
    }
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const resetChat = () => {
    if (window.confirm("האם אתה בטוח שברצונך לאפס את השיחה?")) {
      setMessages(INITIAL_MESSAGES);
      setInput("");
      setIsTyping(false);
      setSuggestedActions([]);
    }
  };

  return (
    <>
      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-content">
            <div className="chatbot-avatar">
              <i className="bi bi-robot"></i>
            </div>
            <div className="chatbot-title">
              <h3>שירות לקוחות קארינה</h3>
              <span className="chatbot-status">
                <span className="status-dot"></span>
                זמין עכשיו
              </span>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-reset"
              onClick={resetChat}
              aria-label="אפס שיחה"
              title="התחל שיחה חדשה"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <button
              className="chatbot-close"
              onClick={toggleChat}
              aria-label="סגור צ'אט"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.role === "assistant" && (
                <div className="message-avatar">
                  <i className="bi bi-robot"></i>
                </div>
              )}
              <div className="message-content-wrapper">
                <div className="message-bubble">
                  <div 
                    className="message-text"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                  />
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {msg.role === "assistant" && idx > 0 && (
                  <div className="message-actions">
                    <button
                      className={`rate-btn ${msg.rated === true ? 'active' : ''}`}
                      onClick={() => rateResponse(msg.id, true)}
                      title="תשובה מועילה"
                      aria-label="תשובה מועילה"
                    >
                      👍
                    </button>
                    <button
                      className={`rate-btn ${msg.rated === false ? 'active' : ''}`}
                      onClick={() => rateResponse(msg.id, false)}
                      title="תשובה לא מועילה"
                      aria-label="תשובה לא מועילה"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="message assistant">
              <div className="message-avatar">
                <i className="bi bi-robot"></i>
              </div>
              <div className="message-bubble typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {messages.length <= 2 && (
          <div className="chatbot-quick-replies">
            <div className="quick-replies-title">שאלות נפוצות:</div>
            <div className="quick-replies-grid">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply.id}
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply(reply.query)}
                >
                  {reply.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <div className="chatbot-quick-replies">
            <div className="quick-replies-title">פעולות מומלצות:</div>
            <div className="quick-replies-grid">
              {suggestedActions.map((action, idx) => (
                <button
                  key={idx}
                  className="quick-reply-btn suggested"
                  onClick={() => handleQuickReply(action.query)}
                >
                  {action.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="הקלד הודעה..."
            rows={1}
            disabled={isTyping}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            aria-label="שלח הודעה"
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <button
        className={`chatbot-fab ${isOpen ? "hidden" : ""}`}
        onClick={toggleChat}
        aria-label="פתח צ'אט"
      >
        <i className="bi bi-chat-dots-fill"></i>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>
    </>
  );
}
