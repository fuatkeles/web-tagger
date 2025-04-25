import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  writeBatch,
  getFirestore,
  onSnapshot,
  runTransaction,
  increment,
  updateDoc
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/firebase';
import { onAuthStateChanged } from '@firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPromotionActive, setIsPromotionActive] = useState(false);

  useEffect(() => {
    const checkPromotion = async () => {
      try {
        const promotionRef = doc(db, 'promotion', 'firstUsers');
        const promotionDoc = await getDoc(promotionRef);
        
        if (!promotionDoc.exists()) {
          await setDoc(promotionRef, {
            userCount: 0,
            isActive: true,
            maxUsers: 100
          });
          setIsPromotionActive(true);
        } else {
          const { userCount, isActive, maxUsers } = promotionDoc.data();
          setIsPromotionActive(isActive && userCount < maxUsers);
        }
      } catch (error) {
        setIsPromotionActive(true);
      }
    };

    checkPromotion();

    const unsubscribe = onSnapshot(doc(db, 'promotion', 'firstUsers'), (doc) => {
      if (doc.exists()) {
        const { userCount, isActive, maxUsers } = doc.data();
        setIsPromotionActive(isActive && userCount < maxUsers);
      } else {
        setIsPromotionActive(true);
      }
    }, (error) => {
      setIsPromotionActive(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUser({ ...user, ...userDoc.data() });
        } else {
          // Create new user document
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            credits: 0,
            subscriptionStatus: 'inactive',
            lastPurchaseDate: null,
            currentPlan: null
          });
          setUser({ ...user, credits: 0, subscriptionStatus: 'inactive' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUser({ ...user, ...userDoc.data() });
      }
    }
  };

  const value = {
    user,
    signInWithGoogle,
    logout,
    isPromotionActive,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 