import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD_btD4Cg6bTvtQeqvd0_lvKSa5zW8g4Pg",
  authDomain: "portfolio-a415d.firebaseapp.com",
  projectId: "portfolio-a415d",
  storageBucket: "portfolio-a415d.firebasestorage.app",
  messagingSenderId: "523268267627",
  appId: "1:523268267627:web:10321d2897650046da5b2e",
  measurementId: "G-HN9X2X9HPJ",
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Analytics only works in the browser
const analytics = typeof window !== "undefined" ? isSupported().then((yes) => (yes ? getAnalytics(app) : null)) : null;

export { app, analytics };
