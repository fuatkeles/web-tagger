import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import './PayAsYouGo.css';

const PayAsYouGo = () => {
  const MIN_CREDITS = 300;
  const MAX_CREDITS = 3000;
  const STEP = 30;
  const [credits, setCredits] = useState(MIN_CREDITS);

  const handleInputChange = (e) => {
    let value = Number(e.target.value);
    if (value < MIN_CREDITS) value = MIN_CREDITS;
    if (value > MAX_CREDITS) value = MAX_CREDITS;
    value = Math.round(value / STEP) * STEP;
    setCredits(value);
  };

  const calculatePrice = (creditAmount) => {
    // Linear interpolation between (300, 10) and (3000, 150)
    const price = 10 + (creditAmount - 300) * (150 - 10) / (3000 - 300);
    return price.toFixed(2);
  };

  return (
    <div className="pay-as-you-go">
      <div className="pay-as-you-go-header">
        <h3>Pay As You Go</h3>
        <p className="pay-as-you-go-description">
          Purchase credits anytime
        </p>
      </div>
      
      <div className="credits-slider-container">
        <div className="credits-input-container">
          <input
            type="number"
            className="credits-input"
            value={credits}
            onChange={handleInputChange}
            min={MIN_CREDITS}
            max={MAX_CREDITS}
            step={STEP}
          />
          <span className="credits-label">credits</span>
        </div>
        
        <div className="slider-container">
          <Slider.Root
            className="slider-root"
            value={[credits]}
            onValueChange={([value]) => setCredits(value)}
            min={MIN_CREDITS}
            max={MAX_CREDITS}
            step={STEP}
          >
            <Slider.Track className="slider-track">
              <Slider.Range className="slider-range" />
            </Slider.Track>
            <Slider.Thumb className="slider-thumb" />
          </Slider.Root>
          
          <div className="slider-labels">
            <span>{MIN_CREDITS}</span>
            <span>{MAX_CREDITS}</span>
          </div>
        </div>
      </div>

      <div className="total-price">
        <span className="total-price-label">TOTAL PRICE</span>
        <span className="price-amount">${calculatePrice(credits)}</span>
      </div>

      <button className="buy-credits-btn">
        Buy Credits
      </button>
    </div>
  );
};

export default PayAsYouGo; 