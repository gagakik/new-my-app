
import React, { useState, useEffect } from 'react';
import './CustomPackageBuilder.css';

const CustomPackageBuilder = ({ exhibitionId, showNotification, onPackageBuilt }) => {
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [packageDetails, setPackageDetails] = useState({
    package_name: '',
    description: '',
    fixed_area_sqm: ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableEquipment();
  }, [exhibitionId]);

  useEffect(() => {
    calculateTotalPrice();
  }, [selectedEquipment, packageDetails.fixed_area_sqm]);

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/equipment/availability/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEquipment(data);
      }
    } catch (error) {
      console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', error);
      showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    const equipmentPrice = selectedEquipment.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    const areaPrice = packageDetails.fixed_area_sqm * 50; // 50 EUR per sqm base price
    setTotalPrice(equipmentPrice + areaPrice);
  };

  const addEquipmentToPackage = (equipment) => {
    const existingIndex = selectedEquipment.findIndex(item => item.id === equipment.id);
    
    if (existingIndex >= 0) {
      const updated = [...selectedEquipment];
      if (updated[existingIndex].quantity < equipment.available_quantity) {
        updated[existingIndex].quantity += 1;
        setSelectedEquipment(updated);
      } else {
        showNotification('არასაკმარისი რაოდენობა', 'warning');
      }
    } else {
      setSelectedEquipment([...selectedEquipment, {
        ...equipment,
        quantity: 1
      }]);
    }
  };

  const updateEquipmentQuantity = (equipmentId, newQuantity) => {
    const equipment = availableEquipment.find(eq => eq.id === equipmentId);
    
    if (newQuantity > equipment.available_quantity) {
      showNotification('რაოდენობა აღემატება ხელმისაწვდომს', 'warning');
      return;
    }
    
    if (newQuantity <= 0) {
      setSelectedEquipment(selectedEquipment.filter(item => item.id !== equipmentId));
    } else {
      setSelectedEquipment(selectedEquipment.map(item => 
        item.id === equipmentId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const saveCustomPackage = async () => {
    if (!packageDetails.package_name || !packageDetails.fixed_area_sqm) {
      showNotification('გთხოვთ შეავსოთ ყველა სავალდებულო ველი', 'warning');
      return;
    }

    const customPackage = {
      exhibition_id: exhibitionId,
      ...packageDetails,
      fixed_price: totalPrice,
      equipment_list: selectedEquipment.map(item => ({
        equipment_id: item.id,
        quantity: item.quantity
      })),
      is_custom: true
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customPackage)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('პაკეტი წარმატებით შეიქმნა!', 'success');
        if (onPackageBuilt) onPackageBuilt(data.package);
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      console.error('პაკეტის შენახვის შეცდომა:', error);
      showNotification('პაკეტის შენახვა ვერ მოხერხდა', 'error');
    }
  };

  if (loading) return <div>იტვირთება...</div>;

  return (
    <div className="custom-package-builder">
      <h3>მორგებული პაკეტის შემქმნელი</h3>
      
      <div className="package-builder-content">
        <div className="package-details-section">
          <h4>პაკეტის დეტალები</h4>
          
          <div className="form-group">
            <label>პაკეტის სახელი *</label>
            <input
              type="text"
              value={packageDetails.package_name}
              onChange={(e) => setPackageDetails(prev => ({
                ...prev,
                package_name: e.target.value
              }))}
              placeholder="შეიყვანეთ პაკეტის სახელი"
            />
          </div>

          <div className="form-group">
            <label>აღწერა</label>
            <textarea
              value={packageDetails.description}
              onChange={(e) => setPackageDetails(prev => ({
                ...prev,
                description: e.target.value
              }))}
              rows="3"
              placeholder="პაკეტის აღწერა"
            />
          </div>

          <div className="form-group">
            <label>ფართობი (კვმ) *</label>
            <input
              type="number"
              step="0.1"
              value={packageDetails.fixed_area_sqm}
              onChange={(e) => setPackageDetails(prev => ({
                ...prev,
                fixed_area_sqm: e.target.value
              }))}
              placeholder="0.0"
            />
            <small>ფარული ფასი: €50 თითო კვმ-ზე</small>
          </div>

          <div className="price-summary">
            <h4>საერთო ღირებულება: €{totalPrice.toFixed(2)}</h4>
            <div className="price-breakdown">
              <div>ფართობი: €{(packageDetails.fixed_area_sqm * 50).toFixed(2)}</div>
              <div>აღჭურვილობა: €{selectedEquipment.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="equipment-selection-section">
          <h4>აღჭურვილობის არჩევა</h4>
          
          <div className="available-equipment">
            <h5>ხელმისაწვდომი აღჭურვილობა</h5>
            <div className="equipment-grid">
              {availableEquipment.map(equipment => (
                <div key={equipment.id} className="equipment-item">
                  <div className="equipment-info">
                    <h6>{equipment.code_name}</h6>
                    <p>€{equipment.price}</p>
                    <small>ხელმისაწვდომი: {equipment.available_quantity}</small>
                  </div>
                  <button
                    onClick={() => addEquipmentToPackage(equipment)}
                    disabled={equipment.available_quantity === 0}
                    className="add-equipment-btn"
                  >
                    დამატება
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="selected-equipment">
            <h5>არჩეული აღჭურვილობა</h5>
            {selectedEquipment.length === 0 ? (
              <p>აღჭურვილობა არ არის არჩეული</p>
            ) : (
              <div className="selected-items">
                {selectedEquipment.map(item => (
                  <div key={item.id} className="selected-item">
                    <span>{item.code_name}</span>
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateEquipmentQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateEquipmentQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span>€{(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="builder-actions">
        <button onClick={saveCustomPackage} className="save-package-btn">
          პაკეტის შენახვა
        </button>
      </div>
    </div>
  );
};

export default CustomPackageBuilder;
