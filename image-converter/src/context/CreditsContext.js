import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from '@firebase/firestore';

const CreditsContext = createContext();

export const useCredits = () => useContext(CreditsContext);

const FREE_CREDITS = 15;
const REGISTERED_CREDITS = 50;

export const CreditsProvider = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(() => {
    if (!user) {
      const savedCredits = localStorage.getItem('guestCredits');
      return savedCredits ? parseInt(savedCredits) : FREE_CREDITS;
    }
    return FREE_CREDITS;
  });
  const [operations, setOperations] = useState(() => {
    if (!user) {
      const savedOperations = localStorage.getItem('guestOperations');
      return savedOperations ? JSON.parse(savedOperations) : [];
    }
    return [];
  });
  const [membershipType, setMembershipType] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUserCredits = async () => {
      try {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            // First time user, initialize credits
            const userData = {
              uid: user.uid,
              credits: REGISTERED_CREDITS,
              operations: [],
              email: user.email,
              membershipType: 'free',
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            };
            
            await setDoc(userRef, userData);
            setCredits(REGISTERED_CREDITS);
            setOperations([]);
            setMembershipType('free');
          } else {
            // Existing user, load credits
            const userData = userDoc.data();
            setCredits(userData.credits);
            setOperations(userData.operations || []);
            setMembershipType(userData.membershipType || 'free');
          }
        } else {
          // Not logged in user
          setMembershipType('free');
        }
      } catch (error) {
        console.error('Error initializing credits:', error);
        if (!user) {
          setCredits(FREE_CREDITS);
          setOperations([]);
        }
        setMembershipType('free');
      } finally {
        setLoading(false);
      }
    };

    initializeUserCredits();
  }, [user]);

  // Save guest credits and operations to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('guestCredits', credits.toString());
      localStorage.setItem('guestOperations', JSON.stringify(operations));
    }
  }, [credits, operations, user]);

  const deductCredits = async (amount, operationType) => {
    if (credits < amount) return false;

    try {
      if (user) {
        // Update Firestore for logged-in users
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const currentOperations = userDoc.data().operations || [];
          const newOperation = {
            type: operationType,
            cost: amount,
            timestamp: new Date().toISOString()
          };

          await updateDoc(userRef, {
            credits: credits - amount,
            operations: [...currentOperations, newOperation],
            lastUpdated: new Date().toISOString()
          });

          setCredits(prev => prev - amount);
          setOperations(prev => [...prev, newOperation]);
        }
      } else {
        // Not logged in user
        if (credits - amount >= 0) {
          setCredits(prev => prev - amount);
          setOperations(prev => [...prev, {
            type: operationType,
            cost: amount,
            timestamp: new Date().toISOString()
          }]);
          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };

  const value = {
    credits,
    operations,
    membershipType,
    deductCredits,
    loading
  };

  if (loading) {
    return null;
  }

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
}; 