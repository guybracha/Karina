import hoodieUrl from "../webp/workwear/hoodie.webp";
import longTrikoGray from "../webp/workwear/longTrikoGray.webp";
import longTrikoWhite from "../webp/workwear/longTrikoWhite.webp";
import longTrikoBlack from "../webp/workwear/longTrikoBlack.webp";
import longTrikoNavy from "../webp/workwear/longTrikoNavy.webp";
import shortTrikoWhite from "../webp/workwear/shortTrikoWhite.webp";
import shortTrikoNavy from "../webp/workwear/shortTrikoNavy.webp";
import shortTrikoBlack from "../webp/workwear/shortTrikoBlack.webp";
import shortTrikoGray from "../webp/workwear/shortTrikoGray.webp";
import helmetUrl from "../webp/safety/helmet.webp";
import yellow from "../webp/safety/yellowVest.webp";
import orange from "../webp/safety/orangeVest.webp";
import manager from "../webp/safety/manager.webp";
import cargoBlack from "../webp/workwear/cargoPantsBlack.webp";
import cargoNavy from "../webp/workwear/cargoPantsNavy.webp";
import cargoBack from "../webp/workwear/cargoPantsBack.webp";
import cargoBeige from "../webp/workwear/cargoPantsBeige.webp";
import cargoGray from "../webp/workwear/cargoPantsGray.webp";
import kenguru from "../webp/workwear/kenguru.webp";
import yellowBack from "../webp/safety/yellowVestBack.webp";
import orangeBack from "../webp/safety/orangeVestBack.webp";
import managerBack from "../webp/safety/managerBack.webp";
import softShellCoat from "../webp/workwear/coat1.webp";
import softShellCoatBack from "../webp/workwear/coat1Back.webp";
import kenguruBack from "../webp/workwear/kenguruBack.webp";
import zipper from "../webp/workwear/zipperHoodie.webp";
import drifitShortNavyFront from "../webp/workwear/drifitShortNavyFront.webp";
import drifitShortNavyBack from "../webp/workwear/drifitShortNavyBack.webp";
import drifitShortWhiteFront from "../webp/workwear/drifitShortWhiteFront.webp";
import drifitShortWhiteBack from "../webp/workwear/drifitShortWhiteBack.webp";
import drifitShortBlackFront from "../webp/workwear/drifitShortBlackFront.webp";
import drifitShortBlackBack from "../webp/workwear/drifitShortBlackBack.webp";
import drifitShortGrayFront from "../webp/workwear/drifitShortGrayFront.webp";
import drifitShortGrayBack from "../webp/workwear/drifitShortGrayBack.webp";
import drifitLong from "../webp/workwear/drifitLongBlackFront.webp";
import drifitLongBack from "../webp/workwear/drifitLongBlackBack.webp";
import hermonit from "../webp/workwear/hermonit.webp";
import fleese from "../webp/workwear/plizOneSide.webp";
import fleeseDouble from "../webp/workwear/plizDoubleSide.webp";
import labCoat from "../webp/workwear/mictaron.webp";
import halfApron from "../webp/workwear/halfSinar.webp";
import fullApron from "../webp/workwear/fullSicar.webp";
import chef from "../webp/workwear/chef.webp";
import drifitStripes from "../webp/safety/drifitStripes.webp";
import bottle from "../webp/workwear/bottle.webp";
import managerYellow from "../webp/safety/managerYellow.webp";
import managerYellowBack from "../webp/safety/managerYellowBack.webp";
import pwd from "../webp/safety/pwd.webp";
import pwdBack from "../webp/safety/pwdBack.webp";

export const PRODUCTS = [{
    slug: "hoodie-zipper",
    name: "קפוצ׳ון רוכסן",
    price: 85,
    img: zipper,
    colors: ["שחור", "נייבי", "אפור"],
    sizes: ["S","M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    isKids: true,
    type: "hoodie",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "long-triko",
    name: "טריקו ארוך",
    price: 60,
    img: longTrikoWhite,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    images: {
      "לבן": longTrikoWhite,
      "נייבי": longTrikoNavy,
      "אפור": longTrikoGray,
      "שחור": longTrikoBlack,
    },
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    isKids: true,
    season: "קיץ, חורף",
    type: "shirt",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "safety-helmet",
    name: "קסדת בטיחות",
    price: 80,
    img: helmetUrl,
    colors: ["לבן", "ירוק", "כחול"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "helmet",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "vest-yellow",
    name: "אפוד זוהר צהוב",
    price: 45,
    img: yellow,
    backImg: yellowBack,
    colors: ["צהוב"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "vest",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "vest-orange",
    name: "אפוד זוהר כתום",
    price: 45,
    img: orange,
    backImg: orangeBack,
    colors: ["כתום"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "vest",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "manager-vest-orange",
    name: "אפוד מנהלים כתום",
    price: 100,
    img: manager,
    backImg: managerBack,
    colors: ["כתום"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "vest",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "manager-vest-yellow",
    name: "אפוד מנהלים צהוב",
    price: 100,
    img: managerYellow,
    backImg: managerYellowBack,
    colors: ["צהוב"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "vest",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "hoodie-kenguru",
    name: "קפוצ'ון קנגורו",
    price: 85,
    img: kenguru,
    backImg: kenguruBack,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    isKids: true,
    type: "hoodie",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "softshell-coat",
    name: "מעיל סופטשל לעבודה",
    price: 180,
    img: softShellCoat,
    backImg: softShellCoatBack,
    colors: ["שחור"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    isKids: false,
    type: "jacket",
    logoAllowed: true,
    isBlocked: false,
  },
  {
  slug: "drifit-short",
  name: "חולצת דרייפיט קצרה",
  price: 50,

  // ברירת מחדל (לקידום אתרים ו-fallback)
  img: drifitShortWhiteFront,
  backImg: drifitShortWhiteBack,

  colors: ["לבן", "נייבי", "אפור", "שחור"],

  // וריאציות צד קדמי לפי צבע
  images: {
    "לבן":  drifitShortWhiteFront,
    "נייבי": drifitShortNavyFront,
    "אפור": drifitShortGrayFront,
    "שחור": drifitShortBlackFront,
  },

  // וריאציות צד אחורי לפי צבע
  backImages: {
    "לבן":  drifitShortWhiteBack,
    "נייבי": drifitShortNavyBack,
    "אפור": drifitShortGrayBack,
    "שחור": drifitShortBlackBack,
  },
  sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
  category: "workwear",
  isKids: true,
  season: "קיץ, חורף",
  type: "shirt",
  logoAllowed: true,
  isBlocked: false,
  },
  {
    slug: "drifit-long",
    name: "חולצת דרייפיט ארוכה",
    price: 55,
    img: drifitLong,
    backImg: drifitLongBack,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    isKids: true,
    type: "shirt",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "storm-suit",
    name: "חרמונית",
    price: 400,
    img: hermonit,
    colors: ["נייבי"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "workwear",
    season: "חורף",
    isKids: false,
    type: "overall",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "fleece-reversible",
    name: "פליז דו צדדי",
    price: 190,
    img: fleeseDouble,
    colors: ["שחור/כחול"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "workwear",
    season: "חורף",
    isKids: false,
    type: "fleece",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "lab-coat",
    name: "מקטרונים",
    price: 90,
    img: labCoat,
    colors: ["לבן", "שחור"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "workwear",
    season: "קיץ",
    isKids: false,
    type: "coat",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "half-apron",
    name: "סינר חצי",
    price: 100,
    img: halfApron,
    colors: ["שחור"],
    sizes: ["ONE SIZE"],
    category: "workwear",
    season: "קיץ",
    isKids: false,
    type: "apron",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "full-apron",
    name: "סינר שלם",
    price: 120,
    img: fullApron,
    colors: ["שחור"],
    sizes: ["ONE SIZE"],
    category: "workwear",
    season: "קיץ",
    isKids: false,
    type: "apron",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "chef-jacket",
    name: "ג'קט שף",
    price: 250,
    img: chef,
    colors: ["שחור", "לבן"],
    sizes: ["ONE SIZE"],
    category: "workwear",
    season: "קיץ",
    isKids: false,
    type: "chef-jacket",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "drifit-stripes",
    name: "דרייפיט פסים זוהרים",
    price: 80,
    img: drifitStripes,
    colors: ["צהוב", "כתום"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "shirt",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "thermal-bottle",
    name: "בקבוקים תרמיים",
    price: 49,
    img: bottle,
    colors: ["לבן", "שחור"],
    sizes: ["ONE SIZE"],
    category: "workwear",
    season: "גם וגם",
    isKids: true,
    type: "bottle",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "tshirt-short",
    name: "חולצת טריקו קצר",
    price: 55,
    img: shortTrikoWhite,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    images: {
      "לבן": shortTrikoWhite,
      "נייבי": shortTrikoNavy,
      "אפור": shortTrikoGray,
      "שחור": shortTrikoBlack,
    },
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    isKids: true,
    season: "קיץ",
    type: "shirt",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "helmet-manager",
    name: "קסדת בטיחות מנהל",
    price: 80,
    img: helmetUrl,
    colors: ["לבן", "ירוק", "כחול"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "helmet",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "maatz-vest",
    name: 'אפוד עובד דגם מע"צ',
    price: 45,
    img: pwd,
    backImg: pwdBack,
    colors: ["צהוב", "כתום"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    isKids: false,
    type: "vest",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "cargo-pants",
    name: 'מכנסי דגמ"ח עבודה',
    price: 60,
    img: cargoBlack,
    colors: ["שחור", "נייבי", "אפור", "בז׳"],
    images: {
      "שחור": cargoBlack,
      "נייבי": cargoNavy,
      "אפור": cargoGray,
      "בז׳": cargoBeige,
    },
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    isKids: false,
    season: "קיץ, חורף",
    type: "pants",
    logoAllowed: true,
    isBlocked: false,
  },
  {
    slug: "fleese-single",
    name: "פליז חד צדדי",
    price: 85,
    img: fleese,
    colors: ["שחור"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "workwear",
    season: "חורף",
    isKids: false,
    type: "coat",
    logoAllowed: true,
    isBlocked: false,
  }
];