import React, { useState, useEffect } from 'react';
import './ServiceForm.css';

const ServiceForm = ({ serviceToEdit, onServiceUpdated, showNotification }) => {
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceType, setServiceType] = useState('გამოფენა');
  const [isActive, setIsActive] = useState(true);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const isEditing = !!serviceToEdit;

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
    if (isEditing && serviceToEdit) {
      setServiceName(serviceToEdit.service_name || '');
      setDescription(serviceToEdit.description || '');
      setYearSelection(serviceToEdit.year_selection || new Date().getFullYear());
      setStartDate(serviceToEdit.start_date ? serviceToEdit.start_date.slice(0, 10) : '');
      setEndDate(serviceToEdit.end_date ? serviceToEdit.end_date.slice(0, 10) : '');
      setServiceType(serviceToEdit.service_type || 'გამოფენა');
      setIsActive(serviceToEdit.is_active !== undefined ? serviceToEdit.is_active : true);
      setSelectedSpaces(serviceToEdit.selected_spaces || []);
    } else {
      setServiceName('');
      setDescription('');
      setYearSelection(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setServiceType('გამოფენა');
      setIsActive(true);
      setSelectedSpaces([]);
    }
  }, [serviceToEdit, isEditing]);

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

    const serviceData = {
      service_name: serviceName,
      description,
      year_selection: parseInt(yearSelection),
      start_date: startDate,
      end_date: endDate,
      service_type: serviceType,
      is_active: isActive,
      selected_spaces: selectedSpaces,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `/api/annual-services/${serviceToEdit.id}`
      : '/api/annual-services';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onServiceUpdated();
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
      <h3>{isEditing ? 'სერვისის რედაქტირება' : 'ახალი სერვისის დამატება'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>სერვისის სახელი</label>
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
          <label>სერვისის ტიპი</label>
          <select 
            value={serviceType} 
            onChange={(e) => setServiceType(e.target.value)}
            required
          >
            <option value="გამოფენა">გამოფენა</option>
            <option value="კონფერენცია">კონფერენცია</option>
            <option value="გაქირავება">გაქირავება</option>
            <option value="ივენთი">ივენთი</option>
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

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            აქტიური სერვისი
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            {isEditing ? 'განახლება' : 'დამატება'}
          </button>
          <button type="button" className="cancel-btn" onClick={onServiceUpdated}>
            გაუქმება
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm;