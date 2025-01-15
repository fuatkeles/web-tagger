import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc } from '@firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import config from '../config';

const getApiUrl = (endpoint) => {
  return `${config.apiUrl}/api${endpoint}`;
};

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

  // Function to fetch anonymous credits
  const fetchAnonymousCredits = async () => {
    try {
      const response = await axios.get(getApiUrl('/credits/anonymous'));
      if (response.data && typeof response.data.credits === 'number') {
        setCredits(response.data.credits);
        setOperations(response.data.operations || []);
      } else {
        console.error('Invalid credits data received:', response.data);
        setCredits(FREE_CREDITS);
        setOperations([]);
      }
    } catch (error) {
      console.error('Error fetching anonymous credits:', error);
      setCredits(FREE_CREDITS);
      setOperations([]);
    }
  };

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
          await fetchAnonymousCredits();
          setMembershipType('free');
        }
      } catch (error) {
        console.error('Error initializing credits:', error);
        setCredits(FREE_CREDITS);
        setOperations([]);
        setMembershipType('free');
      } finally {
        setLoading(false);
      }
    };

    initializeUserCredits();

    // Set up periodic refresh for anonymous users
    let refreshInterval;
    if (!user) {
      refreshInterval = setInterval(fetchAnonymousCredits, config.refreshInterval);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
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
        const response = await axios.post(getApiUrl('/credits/anonymous/deduct'), {
          amount,
          operationType
        });
        
        if (response.data && typeof response.data.credits === 'number') {
          setCredits(response.data.credits);
          setOperations(response.data.operations || []);
        } else {
          throw new Error('Invalid response from credit deduction');
        }
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