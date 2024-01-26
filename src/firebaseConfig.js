// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBCQV-03KxVk4VZwqBNPBOTCw1ffYxGLbY",
  authDomain: "dnd-soundboard-55d8f.firebaseapp.com",
  projectId: "dnd-soundboard-55d8f",
  storageBucket: "dnd-soundboard-55d8f.appspot.com",
  messagingSenderId: "421052113535",
  appId: "1:421052113535:web:00220598fdf4f1e2e5954a",
  measurementId: "G-H2ZS5EMVJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);

const analytics = getAnalytics(app);

export { auth, db, storage };