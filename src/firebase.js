import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDfdCgFzkrZ_YvFnzbBgRG9nyPLq8qLgBY",
  authDomain: "bright-kids-school-sytem.firebaseapp.com",
  projectId: "bright-kids-school-sytem",
  storageBucket: "bright-kids-school-sytem.firebasestorage.app",
  messagingSenderId: "296531828842",
  appId: "1:296531828842:web:dab68d265001a29f156a13"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary app instance specifically for creating users without signing out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export default app;
