
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// import { getFirestore, type Firestore } from "firebase/firestore"; // If you use Firestore
// import { getStorage, type FirebaseStorage } from "firebase/storage"; // If you use Firebase Storage

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Replace with your API key
  authDomain: "YOUR_AUTH_DOMAIN", // Replace with your auth domain
  projectId: "YOUR_PROJECT_ID", // Replace with your project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your messaging sender ID
  appId: "YOUR_APP_ID", // Replace with your app ID
  measurementId: "YOUR_MEASUREMENT_ID" // Optional: Replace with your measurement ID
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
// const db: Firestore = getFirestore(app); // If you use Firestore
// const storage: FirebaseStorage = getStorage(app); // If you use Firebase Storage

export { app, auth /*, db, storage */ };
