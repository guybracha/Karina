import { db } from "../firebase";
import {
  collection, addDoc, getDocs, query, where, doc, setDoc, serverTimestamp
} from "firebase/firestore";

export async function createProduct(p) {
  const ref = await addDoc(collection(db, "products"), p);
  return ref.id;
}

export async function listActiveProducts() {
  const q = query(collection(db, "products"), where("active","==",true));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

export async function createOrder(userId, items) {
  const amount = items.reduce((s,i)=> s + i.price * i.qty, 0);
  const id = crypto.randomUUID(); // אם אין, אפשר לתת ל-Firestore אוטומטי
  await setDoc(doc(db, "orders_prod", id), {
    userId, items, amount, status: "pending", createdAt: serverTimestamp()
  });
  return id;
}
