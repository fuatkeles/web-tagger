import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { StripeContext } from '../contexts/StripeContext';

const Pricing = () => {
  const { user } = useContext(AuthContext);
  const { initiateCheckout } = useContext(StripeContext);

  const handleCheckout = async (priceId) => {
    try {
      const response = await fetch('http://localhost:5001/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.uid
        }),
      });

      const data = await response.json();
      
      if (data.sessionId) {
        await initiateCheckout({
          sessionId: data.sessionId
        });
      } else {
        console.error('No sessionId returned from server');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="pricing-container">
      <h1>Choose Your Plan</h1>
      <div className="pricing-plans">
        <div className="pricing-plan">
          <h2>Basic</h2>
          <p>150 credits</p>
          <button onClick={() => handleCheckout(process.env.REACT_APP_STRIPE_BASIC_PRICE_ID)}>
            Select Plan
          </button>
        </div>
        <div className="pricing-plan">
          <h2>Pro</h2>
          <p>350 credits</p>
          <button onClick={() => handleCheckout(process.env.REACT_APP_STRIPE_PRO_PRICE_ID)}>
            Select Plan
          </button>
        </div>
        <div className="pricing-plan">
          <h2>Business</h2>
          <p>1000 credits</p>
          <button onClick={() => handleCheckout(process.env.REACT_APP_STRIPE_BUSINESS_PRICE_ID)}>
            Select Plan
          </button>
        </div>
        <div className="pricing-plan">
          <h2>Lifetime</h2>
          <p>10000 credits</p>
          <button onClick={() => handleCheckout(process.env.REACT_APP_STRIPE_LIFETIME_PRICE_ID)}>
            Select Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 