import React, { useState, useEffect } from 'react';
import './SpaceForm.css';

const SpaceForm = ({ spaceToEdit, onSpaceUpdated, showNotification }) => {
  const [category, setCategory] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [description, setDescription] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const isEditing = !!spaceToEdit;

  useEffect(() => {
    if (isEditing && spaceToEdit) {
      setCategory(spaceToEdit.category || '');
      setBuildingName(spaceToEdit.building_name || '');
      setDescription(spaceToEdit.description || '');
      setAreaSqm(spaceToEdit.area_sqm || '');
    } else {
      setCategory('');
      setBuildingName('');
      setDescription('');
      setAreaSqm('');
    }
  }, [spaceToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const spaceData = {
      category,
      building_name: buildingName,
      description,
      area_sqm: areaSqm ? parseFloat(areaSqm) : null, // არასავალდებულო ველი
    };
    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/spaces/${spaceToEdit.id}`
      : '/api/spaces';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(spaceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onSpaceUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <div className="form-container">
      <h3>{isEditing ? 'სივრცის რედაქტირება' : 'ახალი სივრცის დამატება'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>კატეგორია</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">აირჩიეთ კატეგორია</option>
            <option value="საოფისე">საოფისე</option>
            <option value="საგამოფენო">საგამოფენო</option>
            <option value="საპარკინგე">საპარკინგე</option>
            <option value="სასაწყობე">სასაწყობე</option>
            <option value="საწარმო">საწარმო</option>
            <option value="ივენთები">ივენთები</option>
            <option value="საკომფერენციო">საკომფერენციო</option>
          </select>
        </div>
        <div className="form-group">
          <label>შენობის დასახელება</label>
          <input type="text" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>აღწერილობა</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
        </div>
        <div className="form-group">
          <label>ფართობი (კვ.მ)</label>
          <input type="number" step="0.01" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} />
        </div>
        
        <button type="submit" className="submit-btn">
          {isEditing ? 'განახლება' : 'დამატება'}
        </button>
        <button type="button" className="cancel-btn" onClick={onSpaceUpdated}>
          გაუქმება
        </button>
      </form>
    </div>
  );
};

export default SpaceForm;
