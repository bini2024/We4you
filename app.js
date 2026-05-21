// ============================================================
// app.js – Firebase Integration for We4you Transport
// ============================================================
// SETUP INSTRUCTIONS:
//  1. Go to https://console.firebase.google.com
//  2. Create a new project → "we4you-transport"
//  3. Enable Firestore Database (Start in production mode)
//  4. Register a Web App and copy your firebaseConfig below
//  5. In Firestore, create a collection named "quotes"
//  6. Set Firestore Rules (temporarily for dev):
//       rules_version = '2';
//       service cloud.firestore {
//         match /databases/{database}/documents {
//           match /quotes/{doc} {
//             allow create: if true;
//             allow read: if false;
//           }
//         }
//       }
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ⚠️  REPLACE THIS WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase connected");
} catch (e) {
  console.warn("⚠️  Firebase not configured – form will log to console only.", e.message);
}

// Expose submit function globally so main.js can call it
window.submitQuoteToFirebase = async function(formData) {
  if (!db) {
    // No Firebase config yet – just log and succeed silently
    console.log("📋 Quote (no Firebase):", formData);
    return { ok: true, fallback: true };
  }
  try {
    const docRef = await addDoc(collection(db, "quotes"), {
      ...formData,
      createdAt: serverTimestamp(),
      status: "new"
    });
    return { ok: true, id: docRef.id };
  } catch (err) {
    console.error("Firebase write error:", err);
    return { ok: false, error: err.message };
  }
};
