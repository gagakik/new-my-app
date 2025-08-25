
import React, { useState, useEffect } from 'react';
import './PriceCalculator.css';

const PriceCalculator = ({ exhibitionId, boothSize, onPriceCalculated, showNotification }) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  useEffect(() => {
    if (exhibitionId && boothSize && parseFloat(boothSize) > 0) {
      calculatePrice();
    }
  }, [exhibitionId, boothSize, participantCount]);

  const calculatePrice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exhibition_id: exhibitionId,
          booth_size: parseFloat(boothSize),
          registration_date: new Date().toISOString(),
          participant_count: participantCount
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
        if (onPriceCalculated) {
          onPriceCalculated(data);
        }
      } else {
        const error = await response.json();
        showNotification(error.message, 'error');
      }
    } catch (error) {
      showNotification('ფასის გაანგარიშების შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!exhibitionId || !boothSize) {
    return null;
  }

  if (loading) {
    return (
      <div className="price-calculator loading">
        <div className="loading-text">ფასის გაანგარიშება...</div>
      </div>
    );
  }

  if (!pricing) {
    return null;
  }

  return (
    <div className="price-calculator">
      <h4>ფასის გაანგარიშება</h4>
      
      <div className="participant-count">
        <label>მონაწილეთა რაოდენობა:</label>
        <input
          type="number"
          min="1"
          value={participantCount}
          onChange={(e) => setParticipantCount(parseInt(e.target.value) || 1)}
          className="participant-input"
        />
      </div>

      <div className="pricing-breakdown">
        <div className="price-row base-price">
          <span>საბაზისო ფასი ({pricing.booth_size} კვმ × €{pricing.price_per_sqm}):</span>
          <span>€{pricing.base_price.toFixed(2)}</span>
        </div>

        {pricing.applied_discounts && pricing.applied_discounts.length > 0 && (
          <div className="discounts-section">
            <h5>გამოყენებული ფასდაკლებები:</h5>
            {pricing.applied_discounts.map((discount, index) => (
              <div key={index} className="price-row discount">
                <span>
                  {discount.rule_name}
                  {discount.discount_percentage > 0 && ` (${discount.discount_percentage}%)`}
                </span>
                <span>-€{discount.discount_amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="price-row total-discount">
              <span>სულ ფასდაკლება:</span>
              <span>-€{pricing.discount_amount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="price-row final-price">
          <span>საბოლოო ფასი:</span>
          <span>€{pricing.final_price.toFixed(2)}</span>
        </div>

        {pricing.discount_amount > 0 && (
          <div className="savings-info">
            თქვენ დაზოგავთ €{pricing.discount_amount.toFixed(2)}!
          </div>
        )}
      </div>

      <button 
        className="recalculate-btn"
        onClick={calculatePrice}
      >
        ხელახლა გაანგარიშება
      </button>
    </div>
  );
};

export default PriceCalculator;
