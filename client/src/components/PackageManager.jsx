
import React, { useState, useEffect } from 'react';


const PackageManager = ({ exhibitionId, showNotification }) => {
  const [packages, setPackages] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    package_name: '',
    description: '',
    fixed_area_sqm: '',
    fixed_price: '',
    equipment_list: []
  });

  useEffect(() => {
    if (exhibitionId) {
      fetchPackages();
      fetchEquipment();
    }
  }, [exhibitionId]);

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('პაკეტების ჩატვირთვის შეცდომა:', error);
      showNotification('პაკეტების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEquipment(data);
      }
    } catch (error) {
      console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', error);
    }
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    setFormData({
      package_name: '',
      description: '',
      fixed_area_sqm: '',
      fixed_price: '',
      equipment_list: []
    });
    setShowForm(true);
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      package_name: pkg.package_name,
      description: pkg.description || '',
      fixed_area_sqm: pkg.fixed_area_sqm.toString(),
      fixed_price: pkg.fixed_price.toString(),
      equipment_list: pkg.equipment_list || []
    });
    setShowForm(true);
  };

  const handleEquipmentAdd = () => {
    setFormData(prev => ({
      ...prev,
      equipment_list: [...prev.equipment_list, { equipment_id: '', quantity: 1 }]
    }));
  };

  const handleEquipmentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleEquipmentRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const packageData = {
      exhibition_id: exhibitionId,
      ...formData,
      fixed_area_sqm: parseFloat(formData.fixed_area_sqm),
      fixed_price: parseFloat(formData.fixed_price),
      equipment_list: formData.equipment_list.filter(eq => eq.equipment_id && eq.quantity > 0)
    };

    try {
      const token = localStorage.getItem('token');
      const method = editingPackage ? 'PUT' : 'POST';
      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        setShowForm(false);
        fetchPackages();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      console.error('პაკეტის შენახვის შეცდომა:', error);
      showNotification('პაკეტის შენახვა ვერ მოხერხდა', 'error');
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ პაკეტის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        fetchPackages();
      }
    } catch (error) {
      console.error('პაკეტის წაშლის შეცდომა:', error);
      showNotification('პაკეტის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  if (loading) return <div>იტვირთება...</div>;

  return (
    <div className="package-manager">
      <div className="package-header">
        <h3>გამოფენის პაკეტები</h3>
        <button onClick={handleAddPackage} className="add-package-btn">
          ახალი პაკეტის დამატება
        </button>
      </div>

      {showForm && (
        <div className="package-form-overlay">
          <div className="package-form">
            <h4>{editingPackage ? 'პაკეტის რედაქტირება' : 'ახალი პაკეტის შექმნა'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>პაკეტის სახელი</label>
                <input
                  type="text"
                  value={formData.package_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>აღწერა</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ფართობი (კვმ)</label>
                  <input
                    type="number"
                    step="0"
                    value={formData.fixed_area_sqm}
                    onChange={(e) => setFormData(prev => ({ ...prev, fixed_area_sqm: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ფიქსირებული ღირებულება (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fixed_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, fixed_price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="equipment-section">
                <div className="equipment-header">
                  <label>შემავალი აღჭურვილობა</label>
                  <button type="button" onClick={handleEquipmentAdd} className="add-equipment-btn">
                    + აღჭურვილობის დამატება
                  </button>
                </div>

                {formData.equipment_list.map((item, index) => (
                  <div key={index} className="equipment-row">
                    <select
                      value={item.equipment_id}
                      onChange={(e) => handleEquipmentChange(index, 'equipment_id', e.target.value)}
                      required
                    >
                      <option value="">აირჩიეთ აღჭურვილობა</option>
                      {availableEquipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.code_name} (€{eq.price})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleEquipmentChange(index, 'quantity', parseInt(e.target.value))}
                      placeholder="რაოდენობა"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => handleEquipmentRemove(index)}
                      className="remove-equipment-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingPackage ? 'განახლება' : 'შენახვა'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                  გაუქმება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="packages-list">
        {packages.length === 0 ? (
          <p>პაკეტები არ არის შექმნილი</p>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className="package-card">
              <div className="package-info">
                <h4>{pkg.package_name}</h4>
                <p>{pkg.description}</p>
                <div className="package-details">
                  <span><strong>ფართობი:</strong> {pkg.fixed_area_sqm} კვმ</span>
                  <span><strong>ღირებულება:</strong> €{pkg.fixed_price}</span>
                </div>
                
                {pkg.equipment_list && pkg.equipment_list.length > 0 && (
                  <div className="package-equipment">
                    <h5>შემავალი აღჭურვილობა:</h5>
                    <ul>
                      {pkg.equipment_list.map((eq, idx) => (
                        <li key={idx}>
                          {eq.code_name} - {eq.quantity} ცალი (€{eq.price} თითოეული)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="package-actions">
                <button onClick={() => handleEditPackage(pkg)} className="edit-btn">
                  რედაქტირება
                </button>
                <button onClick={() => handleDeletePackage(pkg.id)} className="delete-btn">
                  წაშლა
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PackageManager;
