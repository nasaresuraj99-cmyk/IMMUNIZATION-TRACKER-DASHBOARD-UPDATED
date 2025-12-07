// Firebase configuration
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
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.error('Firebase persistence error:', err.code);
  });

// Export for use in other modules
window.firebaseApp = firebase.app();
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;