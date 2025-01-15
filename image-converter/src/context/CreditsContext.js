import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from '@firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

const CreditsContext = createContext();

export const useCredits = () => useContext(CreditsContext);

const FREE_CREDITS = 15;
const REGISTERED_CREDITS = 50;

const getGuestCredits = () => {
  const lastResetDate = localStorage.getItem('guestCreditsLastReset');
  const currentDate = new Date().toDateString();
  
  // Günlük reset kontrolü
  if (lastResetDate !== currentDate) {
    localStorage.setItem('guestCredits', FREE_CREDITS.toString());
    localStorage.setItem('guestCreditsLastReset', currentDate);
    return FREE_CREDITS;
  }

  const localCredits = localStorage.getItem('guestCredits');
  return localCredits ? parseInt(localCredits) : FREE_CREDITS;
};

const updateGuestCredits = (newAmount) => {
  localStorage.setItem('guestCredits', newAmount.toString());
  return newAmount;
};

const getGuestOperations = () => {
  const localOperations = localStorage.getItem('guestOperations');
  return localOperations ? JSON.parse(localOperations) : [];
};

export const CreditsProvider = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(getGuestCredits());
  const [operations, setOperations] = useState(getGuestOperations());
  const [membershipType, setMembershipType] = useState('free');
  const [loading, setLoading] = useState(true);

  // Günlük kredi yenileme kontrolü
  useEffect(() => {
    if (!user) {
      const newCredits = getGuestCredits();
      setCredits(newCredits);
    }
  }, [user]);

  useEffect(() => {
    const initializeUserCredits = async () => {
      try {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
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
            const userData = userDoc.data();
            setCredits(userData.credits);
            setOperations(userData.operations || []);
            setMembershipType(userData.membershipType || 'free');
          }
        }
      } catch (error) {
        console.error('Error initializing credits:', error);
        if (!user) {
          const guestCredits = getGuestCredits();
          setCredits(guestCredits);
          setOperations(getGuestOperations());
        }
        setMembershipType('free');
      } finally {
        setLoading(false);
      }
    };

    initializeUserCredits();
  }, [user]);

  // Save guest credits and operations
  useEffect(() => {
    if (!user && !loading) {
      updateGuestCredits(credits);
      localStorage.setItem('guestOperations', JSON.stringify(operations));
    }
  }, [credits, operations, user, loading]);

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
        // Update local storage for guest users
        const newOperation = {
          type: operationType,
          cost: amount,
          timestamp: new Date().toISOString()
        };
        
        const newCredits = credits - amount;
        setCredits(newCredits);
        updateGuestCredits(newCredits);
        setOperations(prev => [...prev, newOperation]);
      }
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };

  const getOperationCost = (operation, fileCount = 1) => {
    switch (operation) {
      case 'geotag':
        return 1;
      case 'format':
        return 1;
      case 'download_all':
        return fileCount > 3 ? 1 : 0;
      default:
        return 0;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <CreditsContext.Provider value={{
      credits,
      operations,
      deductCredits,
      getOperationCost,
      membershipType,
      maxCredits: user ? REGISTERED_CREDITS : FREE_CREDITS
    }}>
      {children}
    </CreditsContext.Provider>
  );
}; 