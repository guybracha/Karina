import hoodieUrl from "../img/work/hoodie.png";
import trikoUrl from "../img/work/longTriko.png";
import shortTriko from "../img/work/shortTriko.png";
import helmetUrl from "../img/safety/helmet.png";
import yellow from "../img/safety/yellowVest.png";
import orange from "../img/safety/orangeVest.png";
import manager from "../img/safety/manager.png";
import cargo from "../img/work/cargoPants.png";
import cargoBack from "../img/work/cargoPantsBack.png";
import kenguru from "../img/work/kenguru.png";
import yellowBack from "../img/safety/yellowVestBack.png";
import orangeBack from "../img/safety/orangeVestBack.png";
import managerBack from "../img/safety/managerBack.png";
import softShellCoat from "../img/work/coat1.png";
import softShellCoatBack from "../img/work/coat1Back.png";
import kenguruBack from "../img/work/kenguruBack.png";
import hoodiePocket from "../img/work/hoodie1.png";
import drifitShort from "../img/work/drifitShort.png";
import drifitShortBack from "../img/work/drifitShortBack.png";
import drifitLong from "../img/work/drifitLong.png";
import drifitLongBack from "../img/work/drifitLongBack.png";

export const PRODUCTS = [
  {
    slug: "hoodie-zipper",
    name: "קפוצ׳ון רוכסן",
    price: 85,
    img: hoodiePocket,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    type: "hoodie",
    logoAllowed: true,
  },
  {
    slug: "long-triko",
    name: "טריקו ארוך",
    price: 60,
    img: trikoUrl,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    type: "shirt",
    logoAllowed: true,
  },
  {
    slug: "short-triko",
    name: "טריקו קצר",
    price: 55,
    img: shortTriko,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    type: "shirt",
    logoAllowed: true,
  },
  {
    slug: "safety-helmet",
    name: "קסדת בטיחות",
    price: 80,
    img: helmetUrl,
    colors: ["אפור"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    type: "helmet",
    logoAllowed: false,
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
    type: "vest",
    logoAllowed: true,
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
    type: "vest",
    logoAllowed: true,
  },
  {
    slug: "manager-vest",
    name: "אפוד מנהלים",
    price: 100,
    img: manager,
    backImg: managerBack,
    colors: ["כתום"],
    sizes: ["ONE SIZE"],
    category: "safety",
    season: "אין",
    type: "vest",
    logoAllowed: true,
  },
  {
    slug: "cargo-pants",
    name: "מכנסי דגמ\"ח לעבודה",
    price: 60,
    img: cargo,
    backImg: cargoBack,
    colors: ["שחור", "נייבי"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    type: "pants",
    logoAllowed: false,
  },
  {
    slug: "hoodie-kenguru",
    name: "קפוצ'ון קנגורו",
    price: 85,
    img: kenguru,
    backImg: kenguruBack,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    type: "hoodie",
    logoAllowed: true,
  },
  {
    slug: "softshell-coat",
    name: "מעיל סופטשל לעבודה",
    price: 180,
    img: softShellCoat,
    backImg: softShellCoatBack,
    colors: ["שחור", "נייבי"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "חורף",
    type: "jacket",
    logoAllowed: true,
  },
  {
    slug: "drifit-short",
    name: "חולצת דרייפיט קצרה",
    price: 50,
    img: drifitShort,
    backImg: drifitShortBack,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    type: "shirt",
    logoAllowed: true,
  },
  {
    slug: "drifit-long",
    name: "חולצת דרייפיט ארוכה",
    price: 55,
    img: drifitLong,
    backImg: drifitLongBack,
    colors: ["לבן", "נייבי", "אפור", "שחור"],
    sizes: ["S", "L", "XL", "2XL", "3XL", "4XL", "5XL"],
    category: "workwear",
    season: "קיץ, חורף",
    type: "shirt",
    logoAllowed: true,
  },
];
