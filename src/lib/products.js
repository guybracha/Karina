// src/lib/products.js

import hoodieUrl from "../img/work/hoodie.png";
import trikoUrl from "../img/work/triko1.png";
import helmetUrl from "../img/safety/helmet.png";

export const PRODUCTS = [
  {
    slug: "hoodie-navy",
    name: "קפוצ׳ון נייבי",
    price: 120,
    img: hoodieUrl,
    colors: ["נייבי", "שחור", "אפור"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "tshirt-gray",
    name: "חולצת טריקו אפורה",
    price: 35,
    img: trikoUrl,
    colors: ["אפור", "לבן", "שחור"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "beanie-blue",
    name: "כובע צמר כחול",
    price: 45,
    img: helmetUrl,
    colors: ["כחול", "שחור"],
    sizes: ["One Size"],
  },
];
