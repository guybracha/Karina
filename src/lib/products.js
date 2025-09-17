// src/lib/products.js

import hoodieUrl from "../img/work/hoodie.png";
import trikoUrl from "../img/work/triko1.png";
import helmetUrl from "../img/safety/helmet.png";
import yellow from "../img/safety/yellowVest.png";
import orange from "../img/safety/orangeVest.png";
import manager from "../img/safety/manager.png";
import cargo from "../img/work/cargoPants.png";

export const PRODUCTS = [
  {
    slug: "hoodie-navy",
    name: "קפוצ׳ון נייבי",
    price: 120,
    img: hoodieUrl,
    colors: ["נייבי", "שחור", "אפור"],
    sizes: ["S", "M", "L", "XL"],
    category: "workwear",
    season: "חורף",
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
  },
  {
    slug: "vest-yellow",
    name: "אפוד זוהר צהוב",
    price: 30,
    img: yellow,
    colors: ["צהוב"],
    sizes: ["M", "L", "XL"],
    category: "safety",
    season: "כל השנה",
  },
  {
    slug: "vest-orange",
    name: "אפוד זוהר כתום",
    price: 30,
    img: orange,
    colors: ["כתום"],
    sizes: ["M", "L", "XL"],
    category: "safety",
    season: "כל השנה",
  },
  {
    slug: "manager-vest",
    name: "אפוד מנהלים",
    price: 90,
    img: manager,
    colors: ["לבן", "תכלת"],
    sizes: ["S", "M", "L", "XL"],
    category: "workwear",
    season: "קיץ",
  },
  {
    slug: "cargo-pants",
    name: "מכנסי קארגו לעבודה",
    price: 110,
    img: cargo,
    colors: ["חאקי", "שחור", "כחול"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    category: "workwear",
    season: "כל השנה",
  },
];
