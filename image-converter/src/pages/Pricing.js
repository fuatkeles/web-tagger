import React from 'react';
import { FaCoins, FaCheck, FaMapMarkerAlt, FaImage, FaCloud, FaRocket, FaCode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Pricing.css';
import pricingData from '../data/pricing.json';
import PayAsYouGo from '../components/PayAsYouGo';

const PricingCard = ({ plan, price, credits, period, features, popular, lifetime }) => {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!user) {
      signInWithGoogle();
    }
  };

  return (
    <div className={`pricing-card ${popular ? 'popular' : ''} ${lifetime ? 'lifetime' : ''}`}>
      {popular && (
        <div className="popular-badge">
          <span className="badge-icon">⭐</span>
          <span className="badge-text">Most Popular</span>
          <div className="badge-shine"></div>
        </div>
      )}
      {lifetime && (
        <div className="lifetime-badge">
          <span className="badge-icon">💎</span>
          <span className="badge-text">Best Value</span>
          <div className="badge-shine"></div>
        </div>
      )}
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
      <button className="select-plan-btn" onClick={handleClick}>
        Select Plan
      </button>
    </div>
  );
};

const FeatureSection = ({ title, description }) => {
  const getIcon = (title) => {
    if (title.includes('Image')) return FaImage;
    if (title.includes('Geotag')) return FaMapMarkerAlt;
    if (title.includes('Batch')) return FaCloud;
    if (title.includes('API')) return FaCode;
    return FaRocket;
  };

  const Icon = getIcon(title);

  return (
    <div className="feature-section">
      <div className="feature-icon">
        <Icon />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

const Pricing = () => {
  const navigate = useNavigate();
  const { pricingPlans, features, apiTiers } = pricingData;

  return (
    <div className="pricing-container">
      <div className="pricing-page">
        <div className="pricing-hero">
          <h1>Choose the Perfect Plan</h1>
          <p>Transform your images with powerful conversion and geotagging features</p>
          <div className="launch-announcement">
            <h2>🚀 Special Launch Offer!</h2>
            <p>First 100 users who sign up will receive 200 credits instead of 50 credits!</p>
          </div>
        </div>

        <div className="pricing-section">
          <h2>Pricing Plans</h2>
          <div className="pricing-grid">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
          <PayAsYouGo />
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureSection key={index} {...feature} />
          ))}
        </div>

        <div className="api-tiers">
          <h2>API Access Tiers</h2>
          <div className="api-tiers-grid">
            {apiTiers.map((tier, index) => (
              <div key={index} className="api-tier">
                <h3>{tier.title}</h3>
                <p>{tier.description}</p>
                <ul>
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h3>What are credits?</h3>
              <p>Credits are used for image conversions and geotagging operations. Each operation costs a specific number of credits based on complexity.</p>
            </div>
            <div className="faq-item">
              <h3>Do credits expire?</h3>
              <p>Monthly plan credits reset each billing cycle. Lifetime plan credits never expire and can be used at your own pace.</p>
            </div>
            <div className="faq-item">
              <h3>Can I upgrade my plan?</h3>
              <p>Yes, you can upgrade your plan at any time. The remaining credits will be transferred to your new plan.</p>
            </div>
            <div className="faq-item">
              <h3>What payment methods are accepted?</h3>
              <p>We accept all major credit cards, PayPal, and bank transfers for business plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 