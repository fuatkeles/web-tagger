import React, { useState, useEffect } from 'react';
import './CMPBanner.css';

const CMPBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true,
    analytics_storage: false,
    ad_storage: false,
    ad_user_data: false,
    ad_personalization: false
  });

  useEffect(() => {
    // Sayfa yüklendiğinde çerez izni kontrolü
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      setIsVisible(true);
      // Çerez izni yoksa Google Analytics'i devre dışı bırak
      window.gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    } else {
      const parsedConsent = JSON.parse(savedConsent);
      setConsent(parsedConsent);
      updateGTAGConsent(parsedConsent);
    }
  }, []);

  const updateGTAGConsent = (consentState) => {
    // Google Analytics ve reklam izinlerini güncelle
    window.gtag('consent', 'update', {
      'analytics_storage': consentState.analytics_storage ? 'granted' : 'denied',
      'ad_storage': consentState.ad_storage ? 'granted' : 'denied',
      'ad_user_data': consentState.ad_user_data ? 'granted' : 'denied',
      'ad_personalization': consentState.ad_personalization ? 'granted' : 'denied'
    });
  };

  const handleAcceptAll = () => {
    const allConsent = {
      necessary: true,
      analytics_storage: true,
      ad_storage: true,
      ad_user_data: true,
      ad_personalization: true
    };
    setConsent(allConsent);
    localStorage.setItem('cookieConsent', JSON.stringify(allConsent));
    updateGTAGConsent(allConsent);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    updateGTAGConsent(consent);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const minimalConsent = {
      necessary: true,
      analytics_storage: false,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false
    };
    setConsent(minimalConsent);
    localStorage.setItem('cookieConsent', JSON.stringify(minimalConsent));
    updateGTAGConsent(minimalConsent);
    setIsVisible(false);
  };

  const handleConsentChange = (type) => {
    setConsent(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="cmp-banner">
      <div className="cmp-content">
        <div className="cmp-header">
          <p>We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>
          <div className="cmp-buttons">
            <button className="btn-reject" onClick={handleRejectAll}>Reject All</button>
            <button className="btn-save" onClick={handleSavePreferences}>Save</button>
            <button className="btn-accept" onClick={handleAcceptAll}>Accept All</button>
            <button className="btn-preferences" onClick={() => setShowPreferences(!showPreferences)}>
              {showPreferences ? 'Hide Preferences' : 'Show Preferences'}
            </button>
          </div>
        </div>
        
        <div className={`cookie-preferences ${showPreferences ? 'show' : ''}`}>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={consent.analytics_storage}
                onChange={() => handleConsentChange('analytics_storage')}
              />
              Analytics Storage
            </label>
            <p className="preference-description">
              Allows us to collect data about how you use our website to improve your experience.
            </p>
          </div>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={consent.ad_storage}
                onChange={() => handleConsentChange('ad_storage')}
              />
              Advertising Storage
            </label>
            <p className="preference-description">
              Allows us to show you personalized advertisements.
            </p>
          </div>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={consent.ad_user_data}
                onChange={() => handleConsentChange('ad_user_data')}
              />
              Advertising User Data
            </label>
            <p className="preference-description">
              Allows us to collect data for advertising purposes.
            </p>
          </div>
          <div className="preference-item">
            <label>
              <input
                type="checkbox"
                checked={consent.ad_personalization}
                onChange={() => handleConsentChange('ad_personalization')}
              />
              Advertising Personalization
            </label>
            <p className="preference-description">
              Allows us to personalize advertisements based on your interests.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMPBanner; 