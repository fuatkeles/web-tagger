import React from 'react';
import { FaCoins, FaGoogle, FaHistory, FaSave, FaCloudDownloadAlt, FaRocket } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './CreditAlert.css';

const CreditAlert = ({ isOpen, onClose }) => {
  const { signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
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
        <p>You've reached the free usage limit. Sign in to get more credits and access premium features!</p>
        
        <div className="credit-alert-benefits">
          <div className="benefit-item">
            <FaHistory className="benefit-icon" />
            <span className="benefit-title">50 Free Credits</span>
            <span className="benefit-text">Start with free credits</span>
          </div>
          <div className="benefit-item">
            <FaRocket className="benefit-icon" />
            <span className="benefit-title">Fast Processing</span>
            <span className="benefit-text">Lightning-fast conversions</span>
          </div>
          <div className="benefit-item">
            <FaCloudDownloadAlt className="benefit-icon" />
            <span className="benefit-title">Batch Process</span>
            <span className="benefit-text">Convert multiple files</span>
          </div>
        </div>

        <div className="credit-packages">
          <h3>Available Packages</h3>
          <div className="package-list">
            <div className="package-item free">
              <span className="package-name">Free</span>
              <span className="package-credits">50 credits</span>
              <span className="package-price">$0</span>
            </div>
            <div className="package-item premium">
              <span className="package-name">Premium</span>
              <span className="package-credits">350 credits</span>
              <span className="package-price">$9.99</span>
            </div>
          </div>
        </div>

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