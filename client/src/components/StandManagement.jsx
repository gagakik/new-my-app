
import React, { useState, useEffect, useCallback } from 'react';
import './StandManagement.css';
import api from '../services/api';

const StandManagement = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [stands, setStands] = useState([]);
  const [filteredStands, setFilteredStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStandForm, setShowStandForm] = useState(false);
  const [editingStand, setEditingStand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    booth_number: '',
    company_name: '',
    stand_status: 'დაგეგმილი',
    design_notes: '',
    construction_notes: '',
    special_requirements: '',
    start_date: '',
    deadline: '',
    completion_percentage: 0
  });
  const [designFiles, setDesignFiles] = useState([]);
  const [progressPhotos, setProgressPhotos] = useState([]);

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'operations' ||
    userRole === 'manager';

  const standStatuses = [
    'დაგეგმილი',
    'დიზაინის ეტაპი', 
    'მშენებლობა დაწყებული',
    'მშენებლობა მიმდინარეობს',
    'ელექტრობის მოწყობა',
    'დასრულების ეტაპი',
    'დასრულებული',
    'ჩაბარებული',
    'გადაუდებელი ყურადღება'
  ];

  useEffect(() => {
    fetchStands();
  }, [eventId]);

  useEffect(() => {
    let filtered = stands;

    if (searchTerm) {
      filtered = filtered.filter(stand =>
        stand.booth_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stand.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(stand => stand.stand_status === statusFilter);
    }

    setFilteredStands(filtered);
  }, [stands, searchTerm, statusFilter]);

  const fetchStands = useCallback(async () => {
    try {
      const response = await api.get(`/events/${eventId}/stands`);
      setStands(response.data);
      setFilteredStands(response.data);
    } catch (error) {
      console.error('სტენდების მიღების შეცდომა:', error);
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, showNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const method = editingStand ? 'PUT' : 'POST';
      const url = editingStand
        ? `/api/events/${eventId}/stands/${editingStand.id}`
        : `/api/events/${eventId}/stands`;

      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      // დიზაინის ფაილების დამატება
      designFiles.forEach((file, index) => {
        submitData.append(`design_file_${index}`, file);
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
        fetchStands();
        resetForm();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'შეცდომა მოთხოვნის დამუშავებისას', 'error');
      }
    } catch (error) {
      console.error('შეცდომა:', error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleEdit = (stand) => {
    setEditingStand(stand);
    setFormData({
      booth_number: stand.booth_number || '',
      company_name: stand.company_name || '',
      stand_status: stand.stand_status || 'დაგეგმილი',
      design_notes: stand.design_notes || '',
      construction_notes: stand.construction_notes || '',
      special_requirements: stand.special_requirements || '',
      start_date: stand.start_date ? stand.start_date.split('T')[0] : '',
      deadline: stand.deadline ? stand.deadline.split('T')[0] : '',
      completion_percentage: stand.completion_percentage || 0
    });
    setShowStandForm(true);
  };

  const handleDelete = async (standId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ სტენდის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands/${standId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('სტენდი წარმატებით წაიშალა', 'success');
        fetchStands();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'სტენდის წაშლა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('წაშლის შეცდომა:', error);
      showNotification('შეცდომა წაშლისას', 'error');
    }
  };

  const updateStandStatus = async (standId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands/${standId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stand_status: newStatus })
      });

      if (response.ok) {
        showNotification('სტატუსი განახლდა', 'success');
        fetchStands();
      } else {
        showNotification('სტატუსის განახლება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('სტატუსის განახლების შეცდომა:', error);
      showNotification('შეცდომა სტატუსის განახლებისას', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      booth_number: '',
      company_name: '',
      stand_status: 'დაგეგმილი',
      design_notes: '',
      construction_notes: '',
      special_requirements: '',
      start_date: '',
      deadline: '',
      completion_percentage: 0
    });
    setDesignFiles([]);
    setProgressPhotos([]);
    setEditingStand(null);
    setShowStandForm(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'დაგეგმილი': 'planned',
      'დიზაინის ეტაპი': 'design',
      'მშენებლობა დაწყებული': 'construction-started',
      'მშენებლობა მიმდინარეობს': 'in-progress',
      'ელექტრობის მოწყობა': 'electrical',
      'დასრულების ეტაპი': 'finishing',
      'დასრულებული': 'completed',
      'ჩაბარებული': 'delivered',
      'გადაუდებელი ყურადღება': 'urgent'
    };
    return statusMap[status] || 'planned';
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#28a745';
    if (percentage >= 70) return '#ffc107';
    if (percentage >= 40) return '#fd7e14';
    return '#dc3545';
  };

  if (loading) return <div className="loading">იტვირთება...</div>;

  return (
    <div className="stand-management-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{eventName} - სტენდების მენეჯმენტი ({filteredStands.length} / {stands.length})</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="stands-filters">
            <div className="search-row">
              <input
                type="text"
                placeholder="ძიება სტენდის ნომრით ან კომპანიით..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა სტატუსი</option>
                {standStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {isAuthorizedForManagement && (
            <div className="stands-actions">
              <button
                className="add-stand-btn"
                onClick={() => {
                  resetForm();
                  setShowStandForm(true);
                }}
              >
                ახალი სტენდის დამატება
              </button>
            </div>
          )}

          {showStandForm && isAuthorizedForManagement && (
            <div className="stand-form">
              <h4>{editingStand ? 'სტენდის რედაქტირება' : 'ახალი სტენდის დამატება'}</h4>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>სტენდის ნომერი *</label>
                    <input
                      type="text"
                      value={formData.booth_number}
                      onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>კომპანია *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>სტატუსი</label>
                    <select
                      value={formData.stand_status}
                      onChange={(e) => setFormData({...formData, stand_status: e.target.value})}
                    >
                      {standStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>დასრულების პროცენტი</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formData.completion_percentage}
                      onChange={(e) => setFormData({...formData, completion_percentage: parseInt(e.target.value)})}
                    />
                    <span className="percentage-display">{formData.completion_percentage}%</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>დაწყების თარიღი</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>დასრულების ვადა</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    />
                  </div>
                </div>

                

                <div className="form-group">
                  <label>დიზაინის შენიშვნები</label>
                  <textarea
                    value={formData.design_notes}
                    onChange={(e) => setFormData({...formData, design_notes: e.target.value})}
                    rows="3"
                    placeholder="დიზაინის მოთხოვნები, მასალები, ფერები..."
                  />
                </div>

                <div className="form-group">
                  <label>მშენებლობის შენიშვნები</label>
                  <textarea
                    value={formData.construction_notes}
                    onChange={(e) => setFormData({...formData, construction_notes: e.target.value})}
                    rows="3"
                    placeholder="მშენებლობის მიმდინარეობა, პრობლემები, შესწორებები..."
                  />
                </div>

                <div className="form-group">
                  <label>სპეციალური მოთხოვნები</label>
                  <textarea
                    value={formData.special_requirements}
                    onChange={(e) => setFormData({...formData, special_requirements: e.target.value})}
                    rows="2"
                    placeholder="განსაკუთრებული ელექტრობა, წყალი, კონდიციონერი..."
                  />
                </div>

                <div className="form-group">
                  <label>დიზაინის ფაილები</label>
                  <input
                    type="file"
                    accept="image/*,.pdf,.dwg,.3ds"
                    multiple
                    onChange={(e) => setDesignFiles(Array.from(e.target.files))}
                    className="file-input"
                  />
                  <small className="file-hint">მხარდაჭერილია: JPG, PNG, PDF, DWG, 3DS</small>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {editingStand ? 'განახლება' : 'დამატება'}
                  </button>
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={resetForm}
                  >
                    გაუქმება
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="stands-grid">
            {filteredStands.length === 0 ? (
              <div className="no-stands">
                <p>სტენდები ჯერ არ არის დამატებული ამ ივენთისთვის.</p>
              </div>
            ) : (
              filteredStands.map(stand => (
                <div key={stand.id} className={`stand-card ${getStatusBadge(stand.stand_status)}`}>
                  <div className="stand-header">
                    <div className="stand-info">
                      <h4>სტენდი #{stand.booth_number}</h4>
                      <p className="company-name">{stand.company_name}</p>
                    </div>
                    <span className={`status-badge ${getStatusBadge(stand.stand_status)}`}>
                      {stand.stand_status}
                    </span>
                  </div>

                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${stand.completion_percentage}%`,
                          backgroundColor: getProgressColor(stand.completion_percentage)
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">{stand.completion_percentage}% დასრულებული</span>
                  </div>

                  

                  {(stand.start_date || stand.deadline) && (
                    <div className="dates-info">
                      {stand.start_date && (
                        <div><strong>დაწყება:</strong> {new Date(stand.start_date).toLocaleDateString('ka-GE')}</div>
                      )}
                      {stand.deadline && (
                        <div><strong>ვადა:</strong> {new Date(stand.deadline).toLocaleDateString('ka-GE')}</div>
                      )}
                    </div>
                  )}

                  {stand.design_notes && (
                    <div className="notes-section">
                      <strong>დიზაინი:</strong>
                      <p>{stand.design_notes}</p>
                    </div>
                  )}

                  {stand.construction_notes && (
                    <div className="notes-section">
                      <strong>მშენებლობა:</strong>
                      <p>{stand.construction_notes}</p>
                    </div>
                  )}

                  {isAuthorizedForManagement && (
                    <div className="stand-actions">
                      <select
                        value={stand.stand_status}
                        onChange={(e) => updateStandStatus(stand.id, e.target.value)}
                        className="status-select"
                      >
                        {standStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(stand)}
                      >
                        ✏️ რედაქტირება
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(stand.id)}
                      >
                        🗑️ წაშლა
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StandManagement;
