import React, { useState, useEffect } from 'react'; // Fixed: '=>' changed to 'from'
import './EquipmentList.css';
import EquipmentForm from './EquipmentForm';

const EquipmentList = ({ showNotification, userRole }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'operation';

  const fetchEquipment = async () => {
    try {
      const response = await fetch('/api/equipment');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'აღჭურვილობის მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setEquipment(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა აღჭურვილობის ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ აღჭურვილობის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('აღჭურვილობა წარმატებით წაიშალა!', 'success');
        setEquipment(equipment.filter((item) => item.id !== id));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
  };

  const handleEquipmentUpdated = () => {
    setEditingId(null);
    fetchEquipment();
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  return (
    <div className="equipment-container">
      <h2>აღჭურვილობის სია</h2>
      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>ახალი აღჭურვილობის დამატება</button>
      )}

      {editingId !== null && isAuthorizedForManagement && (
        <EquipmentForm 
          equipmentToEdit={equipment.find(item => item.id === editingId)} 
          onEquipmentUpdated={handleEquipmentUpdated} 
          showNotification={showNotification} 
          userRole={userRole}
        />
      )}

      {equipment.length === 0 ? (
        <p className="no-equipment">აღჭურვილობა არ მოიძებნა.</p>
      ) : (
        <div className="equipment-grid">
          {equipment.map((item) => (
            <div key={item.id} className="equipment-card">
              <h3>{item.code_name}</h3>
              <p><strong>რაოდენობა:</strong> {item.quantity}</p>
              <p><strong>ფასი:</strong> ${item.price}</p>
              <p><strong>აღწერა:</strong> {item.description}</p>
              {item.image_url && (
                <img src={item.image_url} alt={item.code_name} className="equipment-image" /> 
              )}
              {item.created_at && (
                <p className="created-info">დამატებულია: {new Date(item.created_at).toLocaleDateString()}</p>
              )}
              {item.created_by_user_id && (
                <p className="created-info">დაამატა მომხმარებელმა ID: {item.created_by_user_id}</p>
              )}
              {isAuthorizedForManagement && (
                <div className="actions">
                  <button className="edit" onClick={() => handleEditClick(item)}>რედაქტირება</button>
                  <button 
                    className="delete" 
                    onClick={() => handleDelete(item.id)}>
                    წაშლა
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipmentList;
