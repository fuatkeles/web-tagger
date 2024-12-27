import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from '@firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';

const CreditsContext = createContext();

export const useCredits = () => useContext(CreditsContext);

const FREE_CREDITS = 15;
const REGISTERED_CREDITS = 50;

const getDailyResetTime = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime();
};

// Force reset credits if they are still at old value
const currentFreeCredits = parseInt(localStorage.getItem('freeCredits'));
if (currentFreeCredits === 5) {
  localStorage.setItem('freeCredits', FREE_CREDITS.toString());
  localStorage.setItem('lastResetTime', getDailyResetTime().toString());
}

const checkAndResetDailyCredits = () => {
  const lastResetTime = localStorage.getItem('lastResetTime');
  const now = new Date().getTime();
  
  if (!lastResetTime || now >= parseInt(lastResetTime)) {
    localStorage.setItem('freeCredits', FREE_CREDITS.toString());
    localStorage.setItem('lastResetTime', getDailyResetTime().toString());
    return FREE_CREDITS;
  }
  
  return parseInt(localStorage.getItem('freeCredits')) || FREE_CREDITS;
};

export const CreditsProvider = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(FREE_CREDITS);
  const [operations, setOperations] = useState([]);
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
          // Not logged in, use local storage for free credits with daily reset
          const currentCredits = checkAndResetDailyCredits();
          setCredits(currentCredits);

          const storedOperations = localStorage.getItem('freeOperations');
          if (storedOperations) {
            setOperations(JSON.parse(storedOperations));
          } else {
            localStorage.setItem('freeOperations', JSON.stringify([]));
            setOperations([]);
          }
          setMembershipType('free');
        }
      } catch (error) {
        console.error('Error initializing credits:', error);
        // Fallback to local storage if Firestore fails
        const currentCredits = checkAndResetDailyCredits();
        setCredits(currentCredits);
        setOperations([]);
        setMembershipType('free');
      } finally {
        setLoading(false);
      }
    };

    initializeUserCredits();

    // Add interval to check for daily reset
    if (!user) {
      const interval = setInterval(() => {
        const currentCredits = checkAndResetDailyCredits();
        setCredits(currentCredits);
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [user]);

  const deductCredits = async (amount, operationType) => {
    if (credits < amount) return false;

    try {
      const newOperation = {
        type: operationType,
        cost: amount,
        timestamp: new Date().toISOString()
      };

      if (user) {
        // Update Firestore for logged-in users
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const currentOperations = userDoc.data().operations || [];
          await updateDoc(userRef, {
            credits: credits - amount,
            operations: [...currentOperations, newOperation],
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        // Update localStorage for free users
        localStorage.setItem('freeCredits', (credits - amount).toString());
        const updatedOperations = [...operations, newOperation];
        localStorage.setItem('freeOperations', JSON.stringify(updatedOperations));
      }

      setCredits(prev => prev - amount);
      setOperations(prev => [...prev, newOperation]);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };

  const getOperationCost = (type) => {
    switch (type) {
      case 'geotag':
        return 3;
      case 'download':
        return 1;
      default:
        return 1;
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