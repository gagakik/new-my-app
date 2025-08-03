
import React, { useState, useEffect } from 'react';
import './EventParticipants.css';

const EventParticipants = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [participants, setParticipants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [formData, setFormData] = useState({
    company_id: '',
    booth_number: '',
    booth_size: '',
    notes: '',
    contact_person: '',
    contact_email: '',
    contact_phone: ''
  });

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  useEffect(() => {
    fetchParticipants();
    fetchCompanies();
  }, [eventId]);

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      } else {
        showNotification('მონაწილეების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('კომპანიების მიღების შეცდომა:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_id) {
      showNotification('გთხოვთ აირჩიოთ კომპანია', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = editingParticipant ? 'PUT' : 'POST';
      const url = editingParticipant 
        ? `/api/events/${eventId}/participants/${editingParticipant.id}`
        : `/api/events/${eventId}/participants`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        fetchParticipants();
        resetForm();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      showNotification('შეცდომა მოთხოვნის დამუშავებისას', 'error');
    }
  };

  const handleEdit = (participant) => {
    setEditingParticipant(participant);
    setFormData({
      company_id: participant.company_id,
      booth_number: participant.booth_number || '',
      booth_size: participant.booth_size || '',
      notes: participant.notes || '',
      contact_person: participant.contact_person || '',
      contact_email: participant.contact_email || '',
      contact_phone: participant.contact_phone || '',
      registration_status: participant.registration_status,
      payment_status: participant.payment_status
    });
    setShowAddForm(true);
  };

  const handleDelete = async (participantId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ მონაწილის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('მონაწილე წარმატებით წაიშალა', 'success');
        fetchParticipants();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      showNotification('შეცდომა წაშლისას', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: '',
      booth_number: '',
      booth_size: '',
      notes: '',
      contact_person: '',
      contact_email: '',
      contact_phone: ''
    });
    setEditingParticipant(null);
    setShowAddForm(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'მონაწილეობის მოთხოვნა': 'requested',
      'რეგისტრირებული': 'registered',
      'დადასტურებული': 'confirmed',
      'გაუქმებული': 'cancelled'
    };
    return statusMap[status] || 'requested';
  };

  const getPaymentBadge = (status) => {
    const statusMap = {
      'მომლოდინე': 'pending',
      'გადახდილი': 'paid',
      'არ არის საჭიროო': 'not-required'
    };
    return statusMap[status] || 'pending';
  };

  if (loading) return <div>იტვირთება...</div>;

  return (
    <div className="event-participants-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{eventName} - მონაწილეები ({participants.length})</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {isAuthorizedForManagement && (
            <div className="participants-actions">
              <button 
                className="add-participant-btn"
                onClick={() => setShowAddForm(true)}
              >
                ახალი მონაწილის დამატება
              </button>
            </div>
          )}

          {showAddForm && isAuthorizedForManagement && (
            <div className="participant-form">
              <h4>{editingParticipant ? 'მონაწილის რედაქტირება' : 'ახალი მონაწილის დამატება'}</h4>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>კომპანია *</label>
                    <select 
                      value={formData.company_id}
                      onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                      required
                    >
                      <option value="">აირჩიეთ კომპანია</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.company_name} ({company.country})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>სტენდის ნომერი</label>
                    <input 
                      type="text"
                      value={formData.booth_number}
                      onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>სტენდის ზომა (მ²)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={formData.booth_size}
                      onChange={(e) => setFormData({...formData, booth_size: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>საკონტაქტო პირი</label>
                    <input 
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>ელ-ფოსტა</label>
                    <input 
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>ტელეფონი</label>
                    <input 
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    />
                  </div>
                </div>

                {editingParticipant && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>რეგისტრაციის სტატუსი</label>
                      <select 
                        value={formData.registration_status}
                        onChange={(e) => setFormData({...formData, registration_status: e.target.value})}
                      >
                        <option value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</option>
                        <option value="რეგისტრირებული">რეგისტრირებული</option>
                        <option value="დადასტურებული">დადასტურებული</option>
                        <option value="გაუქმებული">გაუქმებული</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>გადახდის სტატუსი</label>
                      <select 
                        value={formData.payment_status}
                        onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                      >
                        <option value="მომლოდინე">მომლოდინე</option>
                        <option value="გადახდილი">გადახდილი</option>
                        <option value="არ არის საჭიროო">არ არის საჭიროო</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>შენიშვნები</label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {editingParticipant ? 'განახლება' : 'დამატება'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={resetForm}>
                    გაუქმება
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="participants-list">
            {participants.length === 0 ? (
              <div className="no-participants">
                <p>ამ ივენთზე მონაწილეები ჯერ არ არის რეგისტრირებული.</p>
                {isAuthorizedForManagement && (
                  <p className="hint">მონაწილის დამატებისთვის გამოიყენეთ ზემოთ მოცემული ღილაკი.</p>
                )}
              </div>
            ) : (
              <div className="participants-table">
                <div className="table-header">
                  <div>კომპანია</div>
                  <div>ქვეყანა</div>
                  <div>სტენდი</div>
                  <div>სტატუსი</div>
                  <div>გადახდა</div>
                  <div>რეგისტრაცია</div>
                  {isAuthorizedForManagement && <div>მოქმედებები</div>}
                </div>
                {participants.map(participant => (
                  <div key={participant.id} className="table-row">
                    <div className="company-info" data-label="კომპანია:">
                      <strong>{participant.company_name}</strong>
                      <small>{participant.identification_code}</small>
                    </div>
                    <div data-label="ქვეყანა:">{participant.country}</div>
                    <div data-label="სტენდი:">
                      {participant.booth_number && `#${participant.booth_number}`}
                      {participant.booth_size && ` (${participant.booth_size}მ²)`}
                    </div>
                    <div data-label="სტატუსი:">
                      <span className={`status-badge ${getStatusBadge(participant.registration_status)}`}>
                        {participant.registration_status}
                      </span>
                    </div>
                    <div data-label="გადახდა:">
                      <span className={`payment-badge ${getPaymentBadge(participant.payment_status)}`}>
                        {participant.payment_status}
                      </span>
                    </div>
                    <div data-label="რეგისტრაცია:">{new Date(participant.registration_date).toLocaleDateString('ka-GE')}</div>
                    {isAuthorizedForManagement && (
                      <div className="participant-actions" data-label="მოქმედებები:">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(participant)}
                        >
                          რედაქტირება
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(participant.id)}
                        >
                          წაშლა
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventParticipants;
