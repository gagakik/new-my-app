import React, { useState, useEffect, useCallback } from 'react'; // დავამატეთ useCallback
import './EquipmentList.css';
import EquipmentForm from './EquipmentForm';

const EquipmentList = ({ showNotification, userRole }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'operation';

  // fetchEquipment ფუნქცია მოთავსებულია useCallback-ში
  const fetchEquipment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('ტოკენი:', token ? 'არსებობს' : 'არ არსებობს');

      if (!token) {
        showNotification('ავტორიზაცია საჭიროა', 'error');
        return;
      }

      const response = await fetch('/api/equipment', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      } else if (response.status === 403) {
        showNotification('წვდომა აკრძალულია. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.', 'error');
        // გაასუფთავეთ ტოკენი და გადამისამართეთ login-ზე
        localStorage.removeItem('token');
        window.location.reload();
      } else {
        const errorText = await response.text();
        console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', response.status, errorText);
        showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა.', 'error');
      }
    } catch (error) {
      console.error('შეცდომა აღჭურვილობის მიღებისას:', error);
      showNotification('სერვისი დროებით მიუწვდომელია', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]); // showNotification არის დამოკიდებულება

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]); // fetchEquipment დაემატა დამოკიდებულებებში

  // ფილტრაცია ძიების ტერმინის მიხედვით
  const filteredEquipment = equipment.filter(item =>
    item.code_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ აღჭურვილობის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) { // შემოწმება, თუ ტოკენი არ არსებობს
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
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

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    console.log('Processing image URL:', imageUrl);

    // თუ URL უკვე სრული მისამართია (http-ით იწყება), ისე დავტოვოთ
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // თუ URL არ იწყება /-ით, დავუმატოთ
    if (!imageUrl.startsWith('/')) {
      imageUrl = '/' + imageUrl;
    }

    // პროდუქშენ გარემოში სრული URL-ის ფორმირება
    const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('replit');
    if (isProduction) {
      return `http://209.38.237.197${imageUrl}`;
    }

    console.log('Final image URL:', imageUrl);
    return imageUrl;
  };


  if (loading) {
    return (
      <div className="equipment-container">
        <div className="loading">იტვირთება...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="equipment-container">
        <div className="error">შეცდომა: {error}</div>
      </div>
    );
  }

  return (
    <div className="equipment-container">
      <h2>აღჭურვილობის სია</h2>

      {/* ძიების ველი */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="ძებნა კოდური სახელით ან აღწერით..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="search-input"
        />
      </div>

      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>
          ახალი აღჭურვილობის დამატება
        </button>
      )}

      {editingId !== null && isAuthorizedForManagement && (
        <EquipmentForm 
          equipmentToEdit={equipment.find(item => item.id === editingId)} 
          onEquipmentUpdated={handleEquipmentUpdated} 
          showNotification={showNotification} 
          userRole={userRole}
        />
      )}

      {filteredEquipment.length === 0 ? (
        <p className="no-equipment">
          {searchTerm ? 'ძიების კრიტერიუმებით აღჭურვილობა არ მოიძებნა.' : 'აღჭურვილობა არ მოიძებნა.'}
        </p>
      ) : (
        <div className="equipment-grid">
          {filteredEquipment.map((item) => (
            <div key={item.id} className="equipment-card">
              {item.image_url && (
                <div className="equipment-image-container">
                  <img 
                    src={getImageUrl(item.image_url)} 
                    alt={item.code_name} 
                    className="equipment-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      console.log('სურათის ჩატვირთვის შეცდომა:', item.image_url);
                    }}
                    loading="lazy"
                  /> 
                </div>
              )}

              <div className="equipment-details">
                <h3>{item.code_name}</h3>

                <div className="equipment-info">
                  <p><strong>რაოდენობა:</strong> {item.quantity}</p>
                  <p><strong>ფასი:</strong> ${item.price}</p>
                  {item.description && (
                    <div className="equipment-description">
                      <strong>აღწერა:</strong> {item.description}
                    </div>
                  )}
                </div>

                <div className="equipment-meta">
                  {item.created_by && (
                    <div className="date-info">
                      <div className="user">{item.created_by}</div>
                      {item.created_at && (
                        <div className="date">
                          {new Date(item.created_at).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {item.updated_by && item.updated_at && (
                    <div className="date-info update-info">
                      <div className="user">{item.updated_by}</div>
                      <div className="date">
                        {new Date(item.updated_at).toLocaleDateString('ka-GE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isAuthorizedForManagement && (
                <div className="equipment-actions">
                  <button
                    className="edit"
                    onClick={() => handleEditClick(item)}
                    title="რედაქტირება"
                  >
                    ✏️ რედაქტირება
                  </button>
                  <button
                    className="delete"
                    onClick={() => handleDelete(item.id)}
                    title="წაშლა"
                  >
                    🗑️ წაშლა
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