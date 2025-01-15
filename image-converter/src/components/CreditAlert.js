import React from 'react';
import { FaCoins, FaGoogle } from 'react-icons/fa';
import './CreditAlert.css';

const CreditAlert = ({ onClose, onLogin }) => {
  const handleGoogleSignIn = async () => {
    try {
      await onLogin();
      onClose();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <div className="credit-alert-overlay">
      <div className="credit-alert-modal">
        <div className="credit-alert-icon">
          <FaCoins />
        </div>
        <h2>Credits Needed</h2>
        <p>You've run out of free credits. Sign in with Google to get 50 free credits and continue using the service!</p>
        
        <div className="credit-alert-actions">
          <button className="login-button" onClick={handleGoogleSignIn}>
            <FaGoogle />
            <span>Sign in with Google</span>
          </button>
          <button className="cancel-button" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditAlert; 