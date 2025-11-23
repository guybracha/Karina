import hoodieUrl from "../img/work/hoodie.png";
import longTrikoGray from "../img/work/longTrikoGray.png";
import longTrikoWhite from "../img/work/longTrikoWhite.png";
import longTrikoBlack from "../img/work/longTrikoBlack.png";
import longTrikoNavy from "../img/work/longTrikoNavy.png";
import shortTrikoWhite from "../img/work/shortTrikoWhite.png";
import shortTrikoNavy from "../img/work/shortTrikoNavy.png";
import shortTrikoBlack from "../img/work/shortTrikoBlack.png";
import shortTrikoGray from "../img/work/shortTrikoGray.png";
import helmetUrl from "../img/safety/helmet.png";
import yellow from "../img/safety/yellowVest.png";
import orange from "../img/safety/orangeVest.png";
import manager from "../img/safety/manager.png";
import cargoBlack from "../img/work/cargoPantsBlack.png";
import cargoNavy from "../img/work/cargoPantsNavy.png";
import cargoBack from "../img/work/cargoPantsBack.png";
import cargoBeige from "../img/work/cargoPantsBeige.png";
import cargoGray from "../img/work/cargoPantsGray.png";
import kenguru from "../img/work/kenguru.png";
import yellowBack from "../img/safety/yellowVestBack.png";
import orangeBack from "../img/safety/orangeVestBack.png";
import managerBack from "../img/safety/managerBack.png";
import softShellCoat from "../img/work/coat1.png";
import softShellCoatBack from "../img/work/coat1Back.png";
import kenguruBack from "../img/work/kenguruBack.png";
import zipper from "../img/work/zipperHoodie.png";
import drifitShortNavyFront from "../img/work/drifitShortNavyFront.png";
import drifitShortNavyBack from "../img/work/drifitShortNavyBack.png";
import drifitShortWhiteFront from "../img/work/drifitShortWhiteFront.png";
import drifitShortWhiteBack from "../img/work/drifitShortWhiteBack.png";
import drifitShortBlackFront from "../img/work/drifitShortBlackFront.png";
import drifitShortBlackBack from "../img/work/drifitShortBlackBack.png";
import drifitShortGrayFront from "../img/work/drifitShortGrayFront.png";
import drifitShortGrayBack from "../img/work/drifitShortGrayBack.png";
import drifitLong from "../img/work/drifitLongBlackFront.png";
import drifitLongBack from "../img/work/drifitLongBlackBack.png";
import hermonit from "../img/work/hermonit.png";
import fleese from "../img/work/plizOneSide.png";
import fleeseDouble from "../img/work/plizDoubleSide.png";
import labCoat from "../img/work/mictaron.png";
import halfApron from "../img/work/halfSinar.png";
import fullApron from "../img/work/fullSicar.png";
import chef from "../img/work/chef.png";
import drifitStripes from "../img/safety/drifitStripes.png";
import bottle from "../img/work/bottle.png";
import managerYellow from "../img/safety/managerYellow.png";
import managerYellowBack from "../img/safety/managerYellowBack.png";
import pwd from "../img/safety/pwd.png";
import pwdBack from "../img/safety/pwdBack.png";

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
    price: null,
    img: hermonit,
    colors: ["נייבי"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    category: "workwear",
    season: "חורף",
    isKids: false,
    type: "overall",
    logoAllowed: true,
    isBlocked: true,
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