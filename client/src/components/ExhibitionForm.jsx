import React, { useState, useEffect } from 'react';
import './ExhibitionForm.css';
import PackageManager from './PackageManager';

const ExhibitionForm = ({ exhibitionToEdit, onExhibitionUpdated, showNotification, onCancel }) => {
  const [exhibitionName, setExhibitionName] = useState('');
  const [manager, setManager] = useState('');
  const isEditing = exhibitionToEdit && exhibitionToEdit.id;

  useEffect(() => {
    if (isEditing) {
      setExhibitionName(exhibitionToEdit.exhibition_name || '');
      setManager(exhibitionToEdit.manager || '');
    } else {
      setExhibitionName('');
      setManager('');
    }
  }, [exhibitionToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const exhibitionData = {
      exhibition_name: exhibitionName,
      manager
    };

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
            ✕
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
              <label>გამოფენის მენეჯერი</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                required
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
        </div>
      </div>
    </div>
  );
};

export default ExhibitionForm;