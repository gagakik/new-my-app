
import React, { useState, useEffect } from 'react';
import './EventForm.css';

const EventForm = ({ eventToEdit, onEventUpdated, showNotification }) => {
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceType, setServiceType] = useState('ივენთი');
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const isEditing = !!eventToEdit;

  // Fetch available spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await fetch('/api/spaces');
        if (response.ok) {
          const spaces = await response.json();
          setAvailableSpaces(spaces);
        }
      } catch (error) {
        console.error('შეცდომა სივრცეების მიღებისას:', error);
      }
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (isEditing && eventToEdit) {
      setServiceName(eventToEdit.service_name || '');
      setDescription(eventToEdit.description || '');
      setYearSelection(eventToEdit.year_selection || new Date().getFullYear());
      setStartDate(eventToEdit.start_date ? eventToEdit.start_date.slice(0, 10) : '');
      setEndDate(eventToEdit.end_date ? eventToEdit.end_date.slice(0, 10) : '');
      setServiceType(eventToEdit.service_type || 'ივენთი');
      setSelectedSpaces(eventToEdit.selected_spaces || []);
    } else {
      setServiceName('');
      setDescription('');
      setYearSelection(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setServiceType('ივენთი');
      setSelectedSpaces([]);
    }
  }, [eventToEdit, isEditing]);

  const handleSpaceToggle = (spaceId) => {
    setSelectedSpaces(prev => 
      prev.includes(spaceId) 
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(endDate) <= new Date(startDate)) {
      showNotification('დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ', 'error');
      return;
    }

    const eventData = {
      service_name: serviceName,
      description,
      year_selection: parseInt(yearSelection),
      start_date: startDate,
      end_date: endDate,
      service_type: serviceType,
      is_active: true,
      selected_spaces: selectedSpaces,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/annual-services/${eventToEdit.id}`
      : '/api/annual-services';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onEventUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="form-container">
      <h3>{isEditing ? 'ივენთის რედაქტირება' : 'ახალი ივენთის დამატება'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ივენთის სახელი</label>
          <input 
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>აღწერა</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>წელი</label>
          <select 
            value={yearSelection} 
            onChange={(e) => setYearSelection(parseInt(e.target.value))}
            required
          >
            {generateYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>დაწყების თარიღი</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>დასრულების თარიღი</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>ივენთის ტიპი</label>
          <select 
            value={serviceType} 
            onChange={(e) => setServiceType(e.target.value)}
            required
          >
            <option value="ივენთი">ივენთი</option>
            <option value="გამოფენა">გამოფენა</option>
            <option value="კონფერენცია">კონფერენცია</option>
            <option value="გაქირავება">გაქირავება</option>
            <option value="ფესტივალი">ფესტივალი</option>
          </select>
        </div>

        <div className="form-group">
          <label>სივრცეების არჩევა</label>
          <div className="spaces-selection">
            {availableSpaces.map(space => (
              <label key={space.id} className="space-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSpaces.includes(space.id)}
                  onChange={() => handleSpaceToggle(space.id)}
                />
                <span>{space.building_name} - {space.category}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            {isEditing ? 'განახლება' : 'დამატება'}
          </button>
          <button type="button" className="cancel-btn" onClick={onEventUpdated}>
            გაუქმება
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
