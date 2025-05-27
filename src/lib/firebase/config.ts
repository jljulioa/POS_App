
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// import { getFirestore, type Firestore } from "firebase/firestore"; // If you use Firestore
// import { getStorage, type FirebaseStorage } from "firebase/storage"; // If you use Firebase Storage

// Your web app's Firebase configuration, read from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check if all required Firebase config values are present
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId
  // Add checks for other essential fields if necessary, e.g., appId
) {
  console.error(
    'Firebase configuration is missing or incomplete. ' +
    'Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are set in .env.local. ' +
    'Required: API_KEY, AUTH_DOMAIN, PROJECT_ID.'
  );
  // Depending on how critical Firebase is at init, you might throw an error here
  // or allow the app to load with Firebase potentially uninitialized.
  // For now, we log an error. Initialization will likely fail if critical parts are missing.
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) { // Only initialize if key fields are present
    app = initializeApp(firebaseConfig);
  } else {
    // Fallback or error handling if essential config is missing
    // This scenario should ideally be caught by the checks above
    // For now, to prevent a crash, we'll assign a dummy object that will fail later
    // but this indicates a severe configuration error.
    console.error("CRITICAL: Firebase could not be initialized due to missing configuration.");
    app = {} as FirebaseApp; // This will cause issues if Firebase is used before proper init.
  }
} else {
  app = getApp();
}

// Conditionally getAuth if app was initialized properly
// It's better to let getAuth throw an error if app is not a valid FirebaseApp
// than to try to proceed with a potentially uninitialized app.
let auth: Auth;
try {
  auth = getAuth(app);
} catch (error) {
  console.error("Failed to initialize Firebase Auth. Ensure Firebase app was initialized correctly.", error);
  // Provide a default/dummy Auth object or handle accordingly.
  // This usually means app wasn't initialized correctly.
  auth = {} as Auth; // This will cause runtime errors if auth is used.
}


// const db: Firestore = getFirestore(app); // If you use Firestore
// const storage: FirebaseStorage = getStorage(app); // If you use Firebase Storage

export { app, auth /*, db, storage */ };
