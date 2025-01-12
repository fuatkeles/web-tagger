import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from '@firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const CreditsContext = createContext();

export const useCredits = () => useContext(CreditsContext);

const FREE_CREDITS = 15;
const REGISTERED_CREDITS = 50;

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
          // Not logged in, get credits from backend API
          try {
            const response = await axios.get(`${API_URL}/api/credits/anonymous`);
            setCredits(response.data.credits);
            setOperations(response.data.operations);
            setMembershipType('free');
          } catch (error) {
            setCredits(FREE_CREDITS);
            setOperations([]);
          }
        }
      } catch (error) {
        setCredits(FREE_CREDITS);
        setOperations([]);
        setMembershipType('free');
      } finally {
        setLoading(false);
      }
    };

    initializeUserCredits();

    // Add interval to check credits for non-logged users
    if (!user) {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/api/credits/anonymous`);
          setCredits(response.data.credits);
          setOperations(response.data.operations);
        } catch (error) {
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

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
        // Use backend API for non-logged users
        const response = await axios.post(`${API_URL}/api/credits/anonymous/deduct`, {
          amount,
          operationType
        });
        
        setCredits(response.data.credits);
        setOperations(response.data.operations);
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  const getOperationCost = (operation, fileCount = 1) => {
    switch (operation) {
      case 'geotag':
        return 1;
      case 'format':
        return 1;
      case 'rename':
        return 1;
      case 'download_all':
        // Charge 1 credit for bulk downloads of more than 3 files
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