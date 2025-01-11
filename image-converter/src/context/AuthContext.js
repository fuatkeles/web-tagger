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
  increment 
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
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            try {
              await runTransaction(db, async (transaction) => {
                const promotionRef = doc(db, 'promotion', 'firstUsers');
                const promotionDoc = await transaction.get(promotionRef);
                
                if (!promotionDoc.exists()) {
                  throw "Promotion document doesn't exist";
                }

                const { userCount, isActive, maxUsers } = promotionDoc.data();
                const isEligible = isActive && userCount < maxUsers;
                const startingCredits = isEligible ? 200 : 50;

                if (isEligible) {
                  transaction.update(promotionRef, {
                    userCount: increment(1),
                    isActive: userCount + 1 < maxUsers
                  });
                }

                transaction.set(userRef, {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  membershipType: 'free',
                  credits: startingCredits,
                  operations: [],
                  createdAt: new Date().toISOString(),
                  lastUpdated: new Date().toISOString(),
                  promotionApplied: isEligible
                });
              });
            } catch (error) {
              await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                membershipType: 'free',
                credits: 50,
                operations: [],
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                promotionApplied: false
              });
            }
          }
        } catch (error) {
          // Handle error silently
        }
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    signInWithGoogle: async () => {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        // Handle error silently
      }
    },
    signOut: async () => {
      try {
        await signOut(auth);
      } catch (error) {
        // Handle error silently
      }
    },
    isPromotionActive
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 