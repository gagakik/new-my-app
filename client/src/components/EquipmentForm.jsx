import React, { useState, useEffect } from 'react';
import './EquipmentForm.css';

const EquipmentForm = ({ equipmentToEdit, onEquipmentUpdated, showNotification }) => {
  const [codeName, setCodeName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null); // ახალი სტეიტი ფაილისთვის
  const [existingImageUrl, setExistingImageUrl] = useState(''); // არსებული სურათის URL
  const isEditing = !!equipmentToEdit;

  useEffect(() => {
    if (isEditing) {
      setCodeName(equipmentToEdit.code_name);
      setQuantity(equipmentToEdit.quantity);
      setPrice(equipmentToEdit.price);
      setDescription(equipmentToEdit.description);
      setExistingImageUrl(equipmentToEdit.image_url || ''); // არსებული URL
      setImageFile(null); // ფაილი თავიდან null-ზე დაყენება
    } else {
      setCodeName('');
      setQuantity('');
      setPrice('');
      setDescription('');
      setImageFile(null);
      setExistingImageUrl('');
    }
  }, [equipmentToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(); // FormData ობიექტი ფაილების გასაგზავნად
    formData.append('code_name', codeName);
    formData.append('quantity', quantity);
    formData.append('price', price);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile); // დაამატეთ ფაილი
    } else if (isEditing && existingImageUrl) {
      formData.append('image_url_existing', existingImageUrl); // თუ სურათი არ იცვლება
    }
    
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/equipment/${equipmentToEdit.id}`
      : '/api/equipment';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: { 
          // 'Content-Type': 'multipart/form-data' - არ არის საჭირო FormData-სთვის
          'Authorization': `Bearer ${token}`
        },
        body: formData, // გაგზავნეთ FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onEquipmentUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <div className="form-container">
      <h3>{isEditing ? 'აღჭურვილობის რედაქტირება' : 'ახალი აღჭურვილობის დამატება'}</h3>
      <form onSubmit={handleSubmit} encType="multipart/form-data"> {/* დაამატეთ encType */}
        <div className="form-group">
          <label>კოდური სახელი</label>
          <input 
            type="text"
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>რაოდენობა</label>
          <input 
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>ფასი</label>
          <input 
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>აღწერილობა</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
        </div>
        <div className="form-group">
          <label>სურათი</label>
          <input 
            type="file"
            accept="image/*" // მხოლოდ სურათების არჩევა
            onChange={(e) => setImageFile(e.target.files[0])} 
          />
          {isEditing && existingImageUrl && !imageFile && (
            <p className="current-image-info">მიმდინარე სურათი: <a href={existingImageUrl} target="_blank" rel="noopener noreferrer">ნახვა</a></p>
          )}
        </div>
        <button type="submit" className="submit-btn">
          {isEditing ? 'განახლება' : 'დამატება'}
        </button>
        <button type="button" className="cancel-btn" onClick={onEquipmentUpdated}>
          გაუქმება
        </button>
      </form>
    </div>
  );
};

export default EquipmentForm;
