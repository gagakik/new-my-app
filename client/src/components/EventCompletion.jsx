
import React, { useState, useEffect } from 'react';
import './EventCompletion.css';

const EventCompletion = ({ eventId, eventName, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchEventStatistics();
  }, [eventId]);

  const fetchEventStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
        
        // სტატისტიკის გამოთვლა
        const totalParticipants = data.length;
        const totalBooths = data.filter(p => p.booth_number).length;
        const totalRevenue = data.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0);
        
        setStatistics({
          totalParticipants,
          totalBooths,
          totalRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching event statistics:', error);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        const result = await response.json();
        alert('ივენთი წარმატებით დასრულდა და მონაცემები არქივირდა!');
        onSuccess(result.report);
        onClose();
      } else {
        const error = await response.json();
        alert(`შეცდომა: ${error.message}`);
      }
    } catch (error) {
      console.error('Error completing event:', error);
      alert('სერვერის შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content event-completion-modal">
        <div className="modal-header">
          <h2>ივენთის დასრულება</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="event-completion-content">
          <div className="event-info">
            <h3>{eventName}</h3>
            <div className="statistics-summary">
              <div className="stat-item">
                <span className="stat-label">მონაწილეები:</span>
                <span className="stat-value">{statistics.totalParticipants}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">სტენდები:</span>
                <span className="stat-value">{statistics.totalBooths}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">მთლიანი შემოსავალი:</span>
                <span className="stat-value">{statistics.totalRevenue?.toFixed(2)} ₾</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleComplete} className="completion-form">
            <div className="form-group">
              <label htmlFor="notes">შენიშვნები (არასავალდებულო):</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                placeholder="შეიყვანეთ დამატებითი შენიშვნები ივენთის შესახებ..."
              />
            </div>

            <div className="warning-message">
              <p><strong>გაფრთხილება:</strong> ივენთის დასრულების შემდეგ:</p>
              <ul>
                <li>ყველა მონაწილე და მათი მონაცემები არქივირდება</li>
                <li>ივენთი გადაინაცვლებს არქივში</li>
                <li>ეს მოქმედება შეუქცევადია</li>
              </ul>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="cancel-button">
                გაუქმება
              </button>
              <button type="submit" disabled={loading} className="complete-button">
                {loading ? 'დამუშავება...' : 'ივენთის დასრულება'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventCompletion;
