import React, { useState, useEffect } from 'react';

const SpaceForm = ({ spaceToEdit, onFormClose, onSpaceUpdated, showNotification }) => {
  const [category, setCategory] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [description, setDescription] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!spaceToEdit;

  useEffect(() => {
    if (spaceToEdit) {
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
  }, [spaceToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const spaceData = {
      category,
      building_name: buildingName,
      description,
      area_sqm: parseFloat(areaSqm) || 0
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const url = isEditing ? `/api/spaces/${spaceToEdit.id}` : '/api/spaces';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(spaceData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(data.message, 'success');
        onSpaceUpdated();
        if (onFormClose) onFormClose();
      } else {
        throw new Error(data.message || 'შეცდომა მოხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    if (onFormClose) {
      onFormClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isEditing ? 'სივრცის რედაქტირება' : 'ახალი სივრცის დამატება'}</h3>
          <button 
            className="modal-close" 
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
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
              <input 
                type="text" 
                value={buildingName} 
                onChange={(e) => setBuildingName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>აღწერა</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>ფართობი (კვ.მ.)</label>
              <input 
                type="number" 
                step="0.01"
                value={areaSqm} 
                onChange={(e) => setAreaSqm(e.target.value)}
              />
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'მუშავდება...' : (isEditing ? 'განახლება' : 'დამატება')}
              </button>
              <button type="button" onClick={onCancel}>
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SpaceForm;