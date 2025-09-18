// src/lib/products.js

import hoodieUrl from "../img/work/hoodie.png";
import trikoUrl from "../img/work/triko1.png";
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
    slug: "hoodie-navy",
    name: "קפוצ׳ון נייבי",
    price: 120,
    img: hoodieUrl,
    backImg: hoodiePocket,
    colors: ["נייבי", "שחור", "אפור"],
    sizes: ["S", "M", "L", "XL"],
    category: "workwear",
    season: "חורף",
    type: "hoodie",
  },
  {
    slug: "tshirt-gray",
    name: "חולצת טריקו אפורה",
    price: 35,
    img: trikoUrl,
    colors: ["אפור", "לבן", "שחור"],
    sizes: ["S", "M", "L", "XL"],
    category: "workwear",
    season: "קיץ",
    type: "shirt",
  },
  {
    slug: "helmet-blue",
    name: "קסדת בטיחות",
    price: 45,
    img: helmetUrl,
    colors: ["כחול", "שחור"],
    sizes: ["One Size"],
    category: "safety",
    season: "כל השנה",
    type: "helmet",
  },
  {
    slug: "vest-yellow",
    name: "אפוד זוהר צהוב",
    price: 30,
    img: yellow,
    backImg: yellowBack,
    colors: ["צהוב"],
    sizes: ["M", "L", "XL"],
    category: "safety",
    season: "כל השנה",
    type: "vest",
  },
  {
    slug: "vest-orange",
    name: "אפוד זוהר כתום",
    price: 30,
    img: orange,
    backImg: orangeBack,
    colors: ["כתום"],
    sizes: ["M", "L", "XL"],
    category: "safety",
    season: "כל השנה",
    type: "vest",
  },
  {
    slug: "manager-vest",
    name: "אפוד מנהלים",
    price: 90,
    img: manager,
    backImg: managerBack,
    colors: ["לבן", "תכלת"],
    sizes: ["S", "M", "L", "XL"],
    category: "safety",
    season: "קיץ",
    type: "vest",
  },
  {
    slug: "cargo-pants",
    name: 'מכנסי דגמ"ח לעבודה',
    price: 110,
    img: cargo,
    backImg: cargoBack,
    colors: ["חאקי", "שחור", "כחול"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "כל השנה",
    type: "pants",
  },
  {
    slug: "kenguru",
    name: 'חולצת קנגורו לעבודה',
    price: 95,
    img: kenguru,
    backImg: kenguruBack,
    colors: ["כחול", "שחור", "אפור"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "כל השנה",
    type: "hoodie",
  },
  {
    slug: "softshell-coat",
    name: 'מעיל סופטשל לעבודה',
    price: 250,
    img: softShellCoat,
    backImg: softShellCoatBack,
    colors: ["שחור", "כחול"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "חורף",
    type: "jacket",
  },
  {
    slug: "drifit-short",
    name: 'חולצת דרייפיט קצרה',
    price: 55,
    img: drifitShort,
    backImg: drifitShortBack,
    colors: ["לבן", "שחור", "כחול"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "קיץ",
    type: "shirt",
  },
  {
    slug: "drifit-long",
    name: 'חולצת דרייפיט ארוכה',
    price: 70,
    img: drifitLong,
    backImg: drifitLongBack,
    colors: ["לבן", "שחור", "כחול"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "חורף",
    type: "shirt",
  }
];
