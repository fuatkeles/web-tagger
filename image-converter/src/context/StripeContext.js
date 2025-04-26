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
      
      // Handle both sessionId and url response formats
      const sessionId = data.sessionId || (data.url && data.url.match(/cs_[a-zA-Z0-9_]+/)[0]);
      
      if (!sessionId) {
        throw new Error('No valid session ID found in response');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe checkout error:', error);
      } else {
        // Payment successful, refresh user data to get updated credits
        // Wait for webhook to process (5 seconds)
        setTimeout(async () => {
          await refreshUserData();
          // Check again after 10 seconds to ensure webhook processed
          setTimeout(async () => {
            await refreshUserData();
          }, 10000);
        }, 5000);
      }
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