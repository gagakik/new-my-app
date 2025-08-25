
import React, { useState, useEffect } from 'react';
import './StandManagement.css';

const StandManagement = ({ showNotification, userRole }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [equipmentDetails, setEquipmentDetails] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('ივენთების ჩატვირთვის შეცდომა:', error);
      showNotification('ივენთების ჩატვირთვა ვერ მოხერხდა', 'error');
    }
  };

  const fetchParticipants = async (eventId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      console.error('მონაწილეების ჩატვირთვის შეცდომა:', error);
      showNotification('მონაწილეების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantEquipment = async (participantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/participants/${participantId}/equipment-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEquipmentDetails(data);
      } else {
        setEquipmentDetails([]);
      }
    } catch (error) {
      console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', error);
      setEquipmentDetails([]);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setSelectedParticipant(null);
    setEquipmentDetails([]);
    fetchParticipants(event.id);
  };

  const handleParticipantSelect = (participant) => {
    setSelectedParticipant(participant);
    fetchParticipantEquipment(participant.id);
  };

  const filteredParticipants = participants.filter(participant =>
    participant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (participant.booth_number && participant.booth_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  return (
    <div className="stand-management">
      <div className="page-header">
        <h2>სტენდების მართვა</h2>
        <p>ივენთებზე რეგისტრირებული კომპანიების სტენდების და აღჭურვილობის მართვა</p>
      </div>

      {/* Event Selection */}
      <div className="event-selection">
        <h3>ივენთის არჩევა</h3>
        <div className="events-grid">
          {events.map(event => (
            <div
              key={event.id}
              className={`event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={() => handleEventSelect(event)}
            >
              <h4>{event.service_name}</h4>
              <p className="event-dates">
                {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </p>
              <p className="event-type">{event.service_type}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="participants-section">
          <div className="section-header">
            <h3>{selectedEvent.service_name} - მონაწილეები</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="ძიება კომპანიის სახელით ან სტენდის ნომრით..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">იტვირთება...</div>
          ) : (
            <div className="participants-grid">
              {filteredParticipants.map(participant => (
                <div
                  key={participant.id}
                  className={`participant-card ${selectedParticipant?.id === participant.id ? 'selected' : ''}`}
                  onClick={() => handleParticipantSelect(participant)}
                >
                  <div className="participant-header">
                    <h4>{participant.company_name}</h4>
                    <span className="country-badge">{participant.country}</span>
                  </div>
                  <div className="participant-details">
                    <div className="detail-item">
                      <span className="label">სტენდი:</span>
                      <span className="value">
                        {participant.booth_number ? `#${participant.booth_number}` : 'არ არის მითითებული'}
                        {participant.booth_size && ` (${participant.booth_size}მ²)`}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">სტატუსი:</span>
                      <span className={`status-badge ${participant.registration_status}`}>
                        {participant.registration_status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="label">გადახდა:</span>
                      <span className={`payment-badge ${participant.payment_status}`}>
                        {participant.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedParticipant && (
        <div className="equipment-section">
          <div className="section-header">
            <h3>{selectedParticipant.company_name} - აღჭურვილობის ინფორმაცია</h3>
          </div>

          <div className="participant-info-card">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">კომპანია:</span>
                <span className="value">{selectedParticipant.company_name}</span>
              </div>
              <div className="info-item">
                <span className="label">ქვეყანა:</span>
                <span className="value">{selectedParticipant.country}</span>
              </div>
              <div className="info-item">
                <span className="label">სტენდის ნომერი:</span>
                <span className="value">{selectedParticipant.booth_number || 'არ არის მითითებული'}</span>
              </div>
              <div className="info-item">
                <span className="label">სტენდის ზომა:</span>
                <span className="value">{selectedParticipant.booth_size ? `${selectedParticipant.booth_size}მ²` : 'არ არის მითითებული'}</span>
              </div>
              <div className="info-item">
                <span className="label">რეგისტრაციის თარიღი:</span>
                <span className="value">{formatDate(selectedParticipant.registration_date)}</span>
              </div>
              <div className="info-item">
                <span className="label">გადახდის თანხა:</span>
                <span className="value">{selectedParticipant.payment_amount ? `€${selectedParticipant.payment_amount}` : 'არ არის მითითებული'}</span>
              </div>
            </div>
          </div>

          <div className="equipment-details">
            <h4>დაბრონილი აღჭურვილობა</h4>
            {equipmentDetails.length > 0 ? (
              <div className="equipment-table">
                <div className="table-header">
                  <div>აღჭურვილობა</div>
                  <div>რაოდენობა</div>
                  <div>ერთეულის ფასი</div>
                  <div>ჯამური ღირებულება</div>
                </div>
                {equipmentDetails.map((equipment, index) => (
                  <div key={index} className="table-row">
                    <div className="equipment-name">
                      <strong>{equipment.code_name}</strong>
                      {equipment.description && (
                        <small className="equipment-description">{equipment.description}</small>
                      )}
                    </div>
                    <div className="equipment-quantity">{equipment.quantity} ცალი</div>
                    <div className="equipment-price">€{parseFloat(equipment.unit_price || 0).toFixed(2)}</div>
                    <div className="equipment-total">€{parseFloat(equipment.total_price || 0).toFixed(2)}</div>
                  </div>
                ))}
                <div className="table-footer">
                  <div className="total-row">
                    <div className="total-label">მთლიანი აღჭურვილობის ღირებულება:</div>
                    <div className="total-amount">
                      €{equipmentDetails.reduce((sum, eq) => sum + parseFloat(eq.total_price || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-equipment">
                <p>ამ კომპანიას არ აქვს დაბრონილი აღჭურვილობა</p>
              </div>
            )}
          </div>

          {selectedParticipant.notes && (
            <div className="notes-section">
              <h4>შენიშვნები</h4>
              <div className="notes-content">
                {selectedParticipant.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StandManagement;
