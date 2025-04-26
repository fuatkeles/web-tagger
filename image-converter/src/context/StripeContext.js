import React, { createContext, useContext, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from './AuthContext';

const StripeContext = createContext();

export const useStripe = () => {
  return useContext(StripeContext);
};

export const StripeProvider = ({ children }) => {
  const [stripePromise] = useState(() => loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY));
  const { user, refreshUserData } = useAuth();
  
  // Use environment variable for API URL instead of hardcoding
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  const initiateCheckout = async (priceId, userId) => {
    try {
      console.log('Initiating checkout with API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Checkout response data:', data);
      
      // BYPASS STRIPE LIBRARY: Use the URL directly instead of the Stripe JS library
      if (data.url && typeof data.url === 'string') {
        console.log('Redirecting directly to URL:', data.url);
        // Direct redirect - bypass Stripe SDK
        window.location.href = data.url;
        return; // Exit early to avoid Stripe SDK issues
      }
      
      // Fallback to sessionId approach only if URL not available
      if (data.sessionId) {
        console.log('Fallback: Using sessionId for redirect');
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
        if (error) {
          console.error('Stripe checkout error:', error);
        }
      } else {
        console.error('No valid URL or sessionId found in response');
        throw new Error('Could not initiate checkout - missing redirect information');
      }
      
      // This will run after redirect if Stripe SDK is used
      setTimeout(async () => {
        await refreshUserData();
        setTimeout(async () => {
          await refreshUserData();
        }, 10000);
      }, 5000);
      
    } catch (error) {
      console.error('Error initiating checkout:', error);
    }
  };

  const value = {
    initiateCheckout,
  };

  return (
    <StripeContext.Provider value={value}>
      {children}
    </StripeContext.Provider>
  );
}; 