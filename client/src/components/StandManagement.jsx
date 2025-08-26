
import React, { useState, useEffect } from 'react';
import './StandManagement.css';

const StandManagement = ({ showNotification, userRole }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedStand, setSelectedStand] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const statusOptions = [
    { value: 'planned', label: 'დაგეგმილი', color: '#6b7280' },
    { value: 'design', label: 'დიზაინი', color: '#3b82f6' },
    { value: 'materials', label: 'მასალები', color: '#f59e0b' },
    { value: 'construction', label: 'მშენებლობა', color: '#f97316' },
    { value: 'setup', label: 'მოწყობა', color: '#8b5cf6' },
    { value: 'completed', label: 'დასრულებული', color: '#10b981' },
    { value: 'issues', label: 'პრობლემები', color: '#ef4444' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'დაბალი', color: '#10b981' },
    { value: 'medium', label: 'საშუალო', color: '#f59e0b' },
    { value: 'high', label: 'მაღალი', color: '#ef4444' },
    { value: 'urgent', label: 'სასწრაფო', color: '#dc2626' }
  ];

  useEffect(() => {
    fetchEvents();
    fetchOperators();
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

  const fetchOperators = async () => {
    try {
      const response = await fetch('/api/operators');
      if (response.ok) {
        const data = await response.json();
        setOperators(data);
      }
    } catch (error) {
      console.error('ოპერატორების ჩატვირთვის შეცდომა:', error);
    }
  };

  const fetchStands = async (eventId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stands?event_id=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setStands(data);
      }
    } catch (error) {
      console.error('სტენდების ჩატვირთვის შეცდომა:', error);
      showNotification('სტენდების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setSelectedStand(null);
    fetchStands(event.id);
  };

  const updateStandStatus = async (standId, newStatus) => {
    try {
      const response = await fetch(`/api/stands/${standId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setStands(stands.map(stand => 
          stand.id === standId ? { ...stand, status: newStatus } : stand
        ));
        showNotification('სტატუსი განახლდა', 'success');
        setShowStatusModal(false);
        setSelectedStand(null);
      }
    } catch (error) {
      console.error('სტატუსის განახლების შეცდომა:', error);
      showNotification('სტატუსის განახლება ვერ მოხერხდა', 'error');
    }
  };

  const updateStandOperator = async (standId, operatorId) => {
    try {
      const response = await fetch(`/api/stands/${standId}/operator`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assigned_operator: operatorId })
      });

      if (response.ok) {
        const operator = operators.find(op => op.id === parseInt(operatorId));
        setStands(stands.map(stand => 
          stand.id === standId ? { ...stand, assigned_operator: operator ? operator.name : null } : stand
        ));
        showNotification('ოპერატორი მინიჭებულია', 'success');
      }
    } catch (error) {
      console.error('ოპერატორის მინიჭების შეცდომა:', error);
      showNotification('ოპერატორის მინიჭება ვერ მოხერხდა', 'error');
    }
  };

  const getStatusInfo = (status) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const getPriorityInfo = (priority) => {
    return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
  };

  const filteredStands = stands.filter(stand => {
    const matchesSearch = stand.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         stand.stand_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || stand.status === filterStatus;
    const matchesOperator = !filterOperator || stand.assigned_operator === filterOperator;
    
    return matchesSearch && matchesStatus && matchesOperator;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  return (
    <div className="stand-management">
      <div className="page-header">
        <h2>სტენდების მართვა</h2>
        <p>ივენთების სტენდების სტატუსების, ოპერატორების და მშენებლობის პროცესის მართვა</p>
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
              <span className="stands-count">
                {stands.length > 0 && selectedEvent?.id === event.id ? `${stands.length} სტენდი` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="stands-section">
          {/* Filters and Search */}
          <div className="controls-panel">
            <div className="search-filters">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="ძიება კომპანიის სახელით ან სტენდის ნომრით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="filter-group">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="">ყველა სტატუსი</option>
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>

                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="filter-select"
                >
                  <option value="">ყველა ოპერატორი</option>
                  {operators.map(operator => (
                    <option key={operator.id} value={operator.name}>
                      {operator.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="stats-summary">
              <div className="stat-item">
                <span className="stat-number">{filteredStands.length}</span>
                <span className="stat-label">სტენდი</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {filteredStands.filter(s => s.status === 'completed').length}
                </span>
                <span className="stat-label">დასრულებული</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {filteredStands.filter(s => s.status === 'construction').length}
                </span>
                <span className="stat-label">მშენებლობაში</span>
              </div>
            </div>
          </div>

          {/* Stands Grid */}
          {loading ? (
            <div className="loading">იტვირთება...</div>
          ) : (
            <div className="stands-grid">
              {filteredStands.map(stand => {
                const statusInfo = getStatusInfo(stand.status);
                const priorityInfo = getPriorityInfo(stand.priority);
                
                return (
                  <div key={stand.id} className="stand-card">
                    <div className="stand-header">
                      <div className="stand-title">
                        <h4>სტენდი #{stand.stand_number}</h4>
                        <span className="company-name">{stand.company_name}</span>
                      </div>
                      <div className="stand-badges">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: statusInfo.color }}
                        >
                          {statusInfo.label}
                        </span>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: priorityInfo.color }}
                        >
                          {priorityInfo.label}
                        </span>
                      </div>
                    </div>

                    <div className="stand-details">
                      <div className="detail-row">
                        <span className="label">ზომა:</span>
                        <span className="value">{stand.size}მ²</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">ოპერატორი:</span>
                        <span className="value">
                          {stand.assigned_operator || 'არ არის მინიჭებული'}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">ვადა:</span>
                        <span className="value">{formatDate(stand.deadline)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">პროგრესი:</span>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${stand.progress || 0}%` }}
                          ></div>
                          <span className="progress-text">{stand.progress || 0}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="stand-actions">
                      <button
                        className="action-btn status-btn"
                        onClick={() => {
                          setSelectedStand(stand);
                          setShowStatusModal(true);
                        }}
                      >
                        სტატუსის ცვლილება
                      </button>
                      
                      <select
                        value={stand.assigned_operator || ''}
                        onChange={(e) => updateStandOperator(stand.id, e.target.value)}
                        className="operator-select"
                      >
                        <option value="">ოპერატორის მინიჭება</option>
                        {operators.map(operator => (
                          <option key={operator.id} value={operator.id}>
                            {operator.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedStand && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>სტატუსის ცვლილება - სტენდი #{selectedStand.stand_number}</h3>
              <button
                className="close-btn"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>აირჩიეთ ახალი სტატუსი:</p>
              <div className="status-options">
                {statusOptions.map(status => (
                  <button
                    key={status.value}
                    className={`status-option ${selectedStand.status === status.value ? 'current' : ''}`}
                    style={{ borderColor: status.color }}
                    onClick={() => updateStandStatus(selectedStand.id, status.value)}
                  >
                    <span className="status-dot" style={{ backgroundColor: status.color }}></span>
                    {status.label}
                    {selectedStand.status === status.value && <span className="current-label">(მიმდინარე)</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandManagement;
