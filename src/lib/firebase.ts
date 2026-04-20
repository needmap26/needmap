import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase config at runtime
const missingKeys = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key);
if (missingKeys.length > 0 && typeof window !== "undefined") {
  console.error(`Firebase Config Error: Missing value for ${missingKeys.join(', ')}. Check your .env.local variables.`);
}

if (typeof window !== "undefined") {
  console.log("Initializing Firebase for project:", firebaseConfig.projectId);
}

// Ensure ONLY ONE Firebase app instance
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
