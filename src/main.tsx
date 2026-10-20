import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export async function deduplicateCategories(userId?: string) {
  const targetUid = userId || auth.currentUser?.uid || "lSL8WWJkzOVxryeunp2lbW6cr0D3";
  console.log(`[Deduplicate] Running category deduplication for UID: ${targetUid}...`);
  const categoriesRef = collection(db, "categories");
  const q = query(categoriesRef, where("userId", "==", targetUid));
  const snapshot = await getDocs(q);
  console.log(`[Deduplicate] Found ${snapshot.docs.length} category document(s) in Firestore for this user.`);

  const seenNames = new Set<string>();
  let deletedCount = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    const categoryName = (data.name || "").trim().toLowerCase();

    if (seenNames.has(categoryName)) {
      console.log(`Deleting duplicate: ${data.name} (${document.id})`);
      await deleteDoc(doc(db, "categories", document.id));
      deletedCount++;
    } else {
      seenNames.add(categoryName);
    }
  }
  console.log(`Deduplication complete! Deleted ${deletedCount} duplicate category document(s).`);
  return { total: snapshot.docs.length, deleted: deletedCount };
}

// Suppress harmless Vite HMR WebSocket connection messages in iframe / cloud proxy environments
if (typeof window !== "undefined") {
  (window as any).db = db;
  (window as any).auth = auth;
  (window as any).deduplicateCategories = deduplicateCategories;

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = typeof reason === "string" ? reason : reason?.message;
    if (msg && (msg.includes("WebSocket closed without opened") || msg.includes("[vite]"))) {
      event.preventDefault();
    }
  });

  // Promptly check for updated service workers on page load
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.update();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
