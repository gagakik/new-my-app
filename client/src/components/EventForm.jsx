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
  const [selectedExhibitions, setSelectedExhibitions] = useState([]);
  const [availableExhibitions, setAvailableExhibitions] = useState([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const isEditing = !!eventToEdit;

  // Fetch available spaces and exhibitions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } : {};

        // Fetch spaces
        const spacesResponse = await fetch('/api/spaces', { headers });
        if (spacesResponse.ok) {
          const spaces = await spacesResponse.json();
          setAvailableSpaces(spaces);
        } else {
          console.error('სივრცეების მიღება ვერ მოხერხდა:', spacesResponse.status);
        }

        // Fetch exhibitions
        const exhibitionsResponse = await fetch('/api/exhibitions', { headers });
        if (exhibitionsResponse.ok) {
          const exhibitions = await exhibitionsResponse.json();
          setAvailableExhibitions(exhibitions);
        } else {
          console.error('გამოფენების მიღება ვერ მოხერხდა:', exhibitionsResponse.status);
        }
      } catch (error) {
        console.error('შეცდომა მონაცემების მიღებისას:', error);
      }
    };
    fetchData();
  }, []);

  // Fetch companies when exhibition is selected
  const fetchCompaniesByExhibition = async (exhibitionId, preserveSelection = false, isEditMode = false) => {
    if (!exhibitionId) {
      setAvailableCompanies([]);
      if (!preserveSelection) {
        setSelectedCompanies([]);
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/companies`, { headers });
      if (response.ok) {
        const companies = await response.json();
        console.log('ყველა კომპანია:', companies.length);
        
        const filteredCompanies = companies.filter(company => {
          console.log(`კომპანია ${company.company_name}:`, company.selected_exhibitions);
          return company.selected_exhibitions && 
                 Array.isArray(company.selected_exhibitions) && 
                 company.selected_exhibitions.includes(parseInt(exhibitionId));
        });
        
        console.log(`გამოფენა ${exhibitionId}-ის კომპანიები:`, filteredCompanies.length);
        setAvailableCompanies(filteredCompanies);

        // ავტო-არჩევა მხოლოდ ახალი ივენთისთვის
        if (!preserveSelection && !isEditMode) {
          const autoSelectedCompanies = filteredCompanies.map(company => company.id);
          setSelectedCompanies(autoSelectedCompanies);
        }
      }
    } catch (error) {
      console.error('შეცდომა კომპანიების მიღებისას:', error);
    }
  };

  // რედაქტირების მონაცემების დაყენება
  useEffect(() => {
    const loadEditingData = async () => {
      if (isEditing && eventToEdit) {
        console.log('რედაქტირების მონაცემები:', eventToEdit);

        setServiceName(eventToEdit.service_name || '');
        setDescription(eventToEdit.description || '');
        setYearSelection(eventToEdit.year_selection || new Date().getFullYear());
        setStartDate(eventToEdit.start_date ? eventToEdit.start_date.slice(0, 10) : '');
        setEndDate(eventToEdit.end_date ? eventToEdit.end_date.slice(0, 10) : '');
        setServiceType(eventToEdit.service_type || 'ივენთი');

        // გამოფენის ID-ის სწორად დაყენება
        const exhibitionId = eventToEdit.exhibition_id ? eventToEdit.exhibition_id.toString() : '';
        setSelectedExhibitionId(exhibitionId);
        console.log('დაყენებული გამოფენის ID:', exhibitionId);

        // სივრცეების მოძებნა და დაყენება
        try {
          const token = localStorage.getItem('token');
          const spacesResponse = await fetch(`/api/annual-services/${eventToEdit.id}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (spacesResponse.ok) {
            const serviceDetails = await spacesResponse.json();
            const spaceIds = serviceDetails.spaces ? serviceDetails.spaces.map(s => s.id) : [];
            setSelectedSpaces(spaceIds);
            console.log('ჩატვირთული სივრცეები:', spaceIds);
          } else {
            // თუ დეტალები ვერ მოვიღეთ, ცდილობა მარტივი მეთოდით
            const spacesArray = Array.isArray(eventToEdit.selected_spaces) 
              ? eventToEdit.selected_spaces 
              : eventToEdit.selected_spaces ? JSON.parse(eventToEdit.selected_spaces) : [];
            setSelectedSpaces(spacesArray);
          }
        } catch (error) {
          console.error('სივრცეების ჩატვირთვის შეცდომა:', error);
          setSelectedSpaces([]);
        }

        // გამოფენების დაყენება
        const exhibitionsArray = exhibitionId ? [parseInt(exhibitionId)] : [];
        setSelectedExhibitions(exhibitionsArray);

        // კომპანიების ჩატვირთვა თუ გამოფენა არჩეულია
        if (exhibitionId && availableExhibitions.length > 0) {
          console.log('კომპანიების ჩატვირთვა რედაქტირებისას, გამოფენის ID:', exhibitionId);
          await fetchCompaniesByExhibition(exhibitionId, true, true);
        }
        
        setSelectedCompanies(eventToEdit.selected_companies || []);
      }
    };

    if (availableExhibitions.length > 0) {
      loadEditingData();
    }
  }, [eventToEdit, isEditing, availableExhibitions]);

  // ცალკე useEffect-ი ცარიელი ფორმისთვის
  useEffect(() => {
    if (!isEditing) {
      // ცარიელი ფორმისთვის
      setServiceName('');
      setDescription('');
      setYearSelection(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setServiceType('ივენთი');
      setSelectedSpaces([]);
      setSelectedExhibitions([]);
      setSelectedExhibitionId('');
      setSelectedCompanies([]);
      setAvailableCompanies([]);
    }
  }, [isEditing]);

  const handleSpaceToggle = (spaceId) => {
    setSelectedSpaces(prev => 
      prev.includes(spaceId) 
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleExhibitionSelect = (exhibitionId) => {
    console.log('გამოფენის არჩევა:', exhibitionId, 'რედაქტირების რეჟიმი:', isEditing);
    setSelectedExhibitionId(exhibitionId);
    setSelectedExhibitions(exhibitionId ? [parseInt(exhibitionId)] : []);
    
    // კომპანიების ჩატვირთვა
    if (exhibitionId) {
      // რედაქტირების დროს არ ვაფსებთ არჩეულ კომპანიებს
      fetchCompaniesByExhibition(exhibitionId, isEditing, isEditing);
    } else {
      setAvailableCompanies([]);
      if (!isEditing) {
        setSelectedCompanies([]);
      }
    }
  };

  const handleCompanyToggle = (companyId) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };





  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(endDate) <= new Date(startDate)) {
      showNotification('დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ', 'error');
      return;
    }

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
        body: JSON.stringify({
          service_name: serviceName,
          description,
          year_selection: parseInt(yearSelection),
          start_date: startDate,
          end_date: endDate,
          service_type: serviceType,
          is_active: true,
          selected_spaces: selectedSpaces,
          selected_exhibitions: selectedExhibitions,
          exhibition_id: selectedExhibitionId ? parseInt(selectedExhibitionId) : null,
          selected_companies: selectedCompanies
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');

      // თუ კომპანიები ავტომატურად რეგისტრირდნენ
      if (!isEditing && data.registeredCompanies > 0) {
        showNotification(`${data.registeredCompanies} კომპანია ავტომატურად დარეგისტრირდა მომლოდინე სტატუსით`, 'info');
      }

      onEventUpdated(); // ფორმის გასუფთავება და სიის განახლება
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
          <label>გამოფენის არჩევა</label>
          <select 
            value={selectedExhibitionId}
            onChange={(e) => handleExhibitionSelect(e.target.value)}
          >
            <option value="">აირჩიეთ გამოფენა</option>
            {availableExhibitions.map(exhibition => (
              <option key={exhibition.id} value={exhibition.id}>
                {exhibition.exhibition_name}
              </option>
            ))}
          </select>
        </div>

        {selectedExhibitionId && (
          <div className="form-group">
            <label>მონაწილე კომპანიები</label>
            <div className="companies-info">
              <p>ამ გამოფენას რეგისტრირებული აქვს <strong>{availableCompanies.length} კომპანია</strong>, რომლებიც ავტომატურად დაემატება მონაწილეობის მოთხოვნის სტატუსით.</p>
              <small>მონაწილეების სია და სტატუსების მართვა შესაძლებელია ივენთის შექმნის შემდეგ.</small>
            </div>
          </div>
        )}

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