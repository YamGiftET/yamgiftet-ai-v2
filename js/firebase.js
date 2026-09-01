/* =========================================================
   YamGiftET AI v2 — Firebase Web SDK
   Persistent Firebase + Email/Password Authentication
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDugcciJH3n7GubfklX3CTL4LLoKSKJN-Q",
  authDomain: "yam-gift-ai.firebaseapp.com",
  projectId: "yam-gift-ai",
  storageBucket: "yam-gift-ai.firebasestorage.app",
  messagingSenderId: "98812921529",
  appId: "1:98812921529:web:9a9bd4b8abff7cc9a73d68",
  measurementId: "G-GL7BWSL1EE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.yamFirebaseConfig = firebaseConfig;
window.yamFirebaseApp = app;
window.yamFirebaseAuth = auth;

window.yamFirebaseAuthAPI = {
  signIn: signInWithEmailAndPassword,
  signUp: createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};

console.log("✅ YamGiftET Firebase SDK initialized");
console.log("📦 Firebase Project:", firebaseConfig.projectId);
console.log("🔐 Firebase Authentication ready");
