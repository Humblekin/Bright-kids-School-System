import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      setUserData({ uid: cred.user.uid, ...userDoc.data() });
    }
    return cred;
  }

  async function logout() {
    await signOut(auth);
    setUserData(null);
  }

  async function changePassword(newPassword) {
    return updatePassword(auth.currentUser, newPassword);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ uid: user.uid, ...userDoc.data() });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = { currentUser, userData, login, logout, changePassword, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
