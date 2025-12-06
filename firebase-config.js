// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAo0KbHGOoPUYwIeM4S4DGtzqySv7aZIr8",
  authDomain: "professional-tracker.firebaseapp.com",
  databaseURL: "https://professional-tracker-default-rtdb.firebaseio.com",
  projectId: "professional-tracker",
  storageBucket: "professional-tracker.firebasestorage.app",
  messagingSenderId: "996112988194",
  appId: "1:996112988194:web:c53689f17f1506732ab27b",
  measurementId: "G-S4X90DHRNY"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const realtimeDb = firebase.database();

// Enable offline persistence for Firestore
db.enablePersistence()
  .catch((err) => {
    console.error('Firestore persistence error:', err.code);
  });

// Firebase error codes for login
const firebaseErrorCodes = {
  'auth/invalid-email': 'Invalid email format. Please enter a valid email.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'Email not found. Please check your email.',
  'auth/wrong-password': 'Invalid password. Please try again.',
  'auth/too-many-requests': 'Too many login attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.'
};