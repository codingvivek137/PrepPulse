import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxdcEWIoY0cnPYCEcDtg6TyEhU3YUGPME",
  authDomain: "preppulse-79ae8.firebaseapp.com",
  projectId: "preppulse-79ae8",
  storageBucket: "preppulse-79ae8.firebasestorage.app",
  messagingSenderId: "720218050897",
  appId: "1:720218050897:web:ff41508631e99dea00c370",
  measurementId: "G-HJF30Q0LX9"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth=getAuth(app);
export const db=getFirestore(app);
