import React, { useState, useEffect } from 'react';
import './ExhibitionForm.css';
import PackageManager from './PackageManager';
import PricingManager from './PricingManager';
import PriceCalculator from './PriceCalculator'; // Assuming PriceCalculator is in the same directory

const ExhibitionForm = ({ exhibitionToEdit, onExhibitionUpdated, showNotification, onCancel }) => {
  const [exhibitionName, setExhibitionName] = useState('');
  const [comment, setComment] = useState('');
  const [manager, setManager] = useState('');
  const [pricePerSqm, setPricePerSqm] = useState('');

  const isEditing = exhibitionToEdit && exhibitionToEdit.id;

  useEffect(() => {
    if (isEditing) {
      console.log('რედაქტირების მონაცემები:', exhibitionToEdit);
      console.log('price_per_sqm ღირებულება:', exhibitionToEdit.price_per_sqm, 'ტიპი:', typeof exhibitionToEdit.price_per_sqm);

      setExhibitionName(exhibitionToEdit.exhibition_name || '');
      setComment(exhibitionToEdit.comment || '');
      setManager(exhibitionToEdit.manager || '');
      setPricePerSqm(exhibitionToEdit.price_per_sqm ? exhibitionToEdit.price_per_sqm.toString() : '');
    } else {
      setExhibitionName('');
      setComment('');
      setManager('');
      setPricePerSqm('');
    }
  }, [exhibitionToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const exhibitionData = {
      exhibition_name: exhibitionName,
      comment,
      manager,
      price_per_sqm: pricePerSqm ? parseFloat(pricePerSqm) : null
    };

    console.log('გაგზავნილი მონაცემები:', exhibitionData);

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/exhibitions/${exhibitionToEdit.id}`
      : '/api/exhibitions';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exhibitionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onExhibitionUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'გამოფენის რედაქტირება' : 'ახალი გამოფენის დამატება'}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExhibitionUpdated();
            }}
          >
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>გამოფენის სახელი</label>
              <input
                type="text"
                value={exhibitionName}
                onChange={(e) => setExhibitionName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>მოკლე განმარტება</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>გამოფენის მენეჯერი</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>1 კვმ ღირებულება (ევროში)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePerSqm}
                onChange={(e) => setPricePerSqm(e.target.value)}
                placeholder="მაგ: 150.00"
              />
            </div>
            <div className="form-actions">
              <button type="submit">
                {isEditing ? 'განახლება' : 'დამატება'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onExhibitionUpdated();
                }}
              >
                გაუქმება
              </button>
            </div>
          </form>

          {/* პაკეტების მენეჯმენტი - მხოლოდ რედაქტირების დროს */}
          {isEditing && exhibitionToEdit && exhibitionToEdit.id && (
            <div className="package-section">
              <PackageManager 
                exhibitionId={exhibitionToEdit.id}
                showNotification={showNotification}
              />
            </div>
          )}

          {/* ფასწარმოების მენეჯმენტი - მხოლოდ რედაქტირების დროს */}
          {isEditing && exhibitionToEdit && exhibitionToEdit.id && (
            <div className="pricing-section">
              <PricingManager 
                exhibitionId={exhibitionToEdit.id}
                showNotification={showNotification}
              />
              <div className="price-preview">
                <h4>ფასის პრევიუ</h4>
                <PriceCalculator
                  exhibitionId={exhibitionToEdit.id}
                  boothSize="12" 
                  showNotification={showNotification}
                  onPriceCalculated={(pricing) => {
                    console.log('Calculated pricing:', pricing);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExhibitionForm;