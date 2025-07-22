import React, { useState, useEffect } from 'react';
import './ExhibitionForm.css';

const ExhibitionForm = ({ exhibitionToEdit, onExhibitionUpdated, showNotification }) => {
  const [exhibitionName, setExhibitionName] = useState('');
  const [comment, setComment] = useState('');
  const [manager, setManager] = useState('');
  const isEditing = !!exhibitionToEdit;

  useEffect(() => {
    if (isEditing) {
      setExhibitionName(exhibitionToEdit.exhibition_name);
      setComment(exhibitionToEdit.comment);
      setManager(exhibitionToEdit.manager);
    } else {
      setExhibitionName('');
      setComment('');
      setManager('');
    }
  }, [exhibitionToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const exhibitionData = {
      exhibition_name: exhibitionName,
      comment,
      manager,
    };
    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing

      ? `http://localhost:5000/api/exhibitions/${exhibitionToEdit.id}`
      : 'http://localhost:5000/api/exhibitions';

    try {
      const token = localStorage.getItem('token'); // ტოკენის აღება
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ტოკენის გაგზავნა
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
    <div className="form-container">
      <h3>{isEditing ? 'გამოფენის რედაქტირება' : 'ახალი გამოფენის დამატება'}</h3>
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
          <label>კომენტარი</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>მენეჯერი</label>
          <input
            type="text"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="submit-btn">
          {isEditing ? 'განახლება' : 'დამატება'}
        </button>
        <button type="button" className="cancel-btn" onClick={onExhibitionUpdated}>
          გაუქმება
        </button>
      </form>
    </div>
  );
};

export default ExhibitionForm;
