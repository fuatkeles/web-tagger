import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditsContext';
import { Navigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaCoins, FaCrown, FaCheck } from 'react-icons/fa';
import './Dashboard.css';
import pricingData from '../data/pricing.json';
import PayAsYouGo from './PayAsYouGo';

const PricingCard = ({ plan, price, credits, period, features, popular, lifetime }) => (
  <div className={`pricing-card ${popular ? 'popular' : ''} ${lifetime ? 'lifetime' : ''}`}>
    {popular && <div className="popular-badge">Most Popular</div>}
    {lifetime && <div className="lifetime-badge">Best Value</div>}
    <h3 className="plan-name">{plan}</h3>
    <div className="plan-price">
      <span className="currency">$</span>
      <span className="amount">{price}</span>
      {period && <span className="period">/{period}</span>}
    </div>
    <div className="credits-info">
      <FaCoins className="credits-icon" />
      <span>{credits}</span>
    </div>
    <ul className="features-list">
      {features.map((feature, index) => (
        <li key={index}>
          <FaCheck className="feature-check" />
          {feature}
        </li>
      ))}
    </ul>
    <button className="select-plan-btn">
      Select Plan
    </button>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { credits, maxCredits, membershipType } = useCredits();
  const { pricingPlans } = pricingData;

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="profile-container">
          <div className="user-profile-section">
            <div className="profile-photo-container">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="profile-photo" referrerPolicy="no-referrer" />
              ) : (
                <FaUser className="default-avatar" />
              )}
            </div>
            <div className="user-details">
              <h1>Welcome, {user.displayName || 'User'}!</h1>
              <div className="user-email">
                <FaEnvelope />
                <span>{user.email}</span>
              </div>
              <div className="membership-type">
                <FaCrown className={`membership-icon ${membershipType}`} />
                <span>{membershipType.charAt(0).toUpperCase() + membershipType.slice(1)} Member</span>
              </div>
              <div className="credits-bar">
                <div className="credits-info">
                  <FaCoins className="coins-icon" />
                  <span>{credits} credits remaining</span>
                </div>
                <div className="credits-progress">
                  <div 
                    className="credits-progress-bar" 
                    style={{ width: `${(credits / maxCredits) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="pricing-sections-container">
          <div className="pricing-section">
            <h2>Pricing Plans</h2>
            <div className="launch-announcement">
              <h3>🚀 Special Launch Offer!</h3>
              <p>First 100 users who sign up will receive 200 credits instead of 50 credits!</p>
            </div>
            <div className="pricing-grid">
              {pricingPlans.map((plan, index) => (
                <PricingCard key={index} {...plan} />
              ))}
            </div>
          </div>
          <div className="pricing-section">
            <PayAsYouGo />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 