import React, { useState, useEffect } from 'react';
import './EventParticipants.css';

const EventParticipants = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [formData, setFormData] = useState({
    company_id: '',
    booth_number: '',
    booth_size: '',
    notes: '',
    contact_person: '',
    contact_position: '',
    contact_email: '',
    contact_phone: '',
    payment_amount: '',
    payment_due_date: '',
    payment_method: '',
    invoice_number: '',
    invoice_file: null,
    contract_file: null,
    handover_file: null
  });
  const [files, setFiles] = useState({
    invoice_file: null,
    contract_file: null,
    handover_file: null
  });
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [equipmentTotal, setEquipmentTotal] = useState(0);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  useEffect(() => {
    fetchParticipants();
    fetchCompanies();
    fetchAvailableEquipment();
  }, [eventId]);

  // აღჭურვილობის ჯამური ღირებულების გათვლა
  useEffect(() => {
    const total = selectedEquipment.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    setEquipmentTotal(total);
  }, [selectedEquipment]);

  // ფილტრაცია და ძიება
  useEffect(() => {
    let filtered = participants;

    // ძიება კომპანიის სახელით
    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.identification_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (participant.contact_person && participant.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // ფილტრაცია სტატუსით
    if (statusFilter) {
      filtered = filtered.filter(participant =>
        participant.registration_status === statusFilter
      );
    }

    // ფილტრაცია გადახდის სტატუსით
    if (paymentFilter) {
      filtered = filtered.filter(participant =>
        participant.payment_status === paymentFilter
      );
    }

    // ფილტრაცია ქვეყნით
    if (countryFilter) {
      filtered = filtered.filter(participant =>
        participant.country === countryFilter
      );
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, paymentFilter, countryFilter]);

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`ფეტჩი: მოვიღე ${data.length} მონაწილე ივენთისთვის ${eventId}`, data);
        setParticipants(data);
        setFilteredParticipants(data);
      } else {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        showNotification('მონაწილეების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
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

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      let response = await fetch(`/api/equipment/availability/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEquipment(data);
        console.log('აღჭურვილობის ხელმისაწვდომობა მიღებულია:', data);
      } else {
        // თუ availability endpoint არ მუშაობს, დავბრუნდეთ ზოგად აღჭურვილობის სიაზე
        console.log('availability endpoint არ მუშაობს, ვიღებთ ზოგად სიას');
        response = await fetch('/api/equipment', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // ყველა აღჭურვილობა ხელმისაწვდომია
          const equipmentWithAvailability = data.map(equipment => ({
            ...equipment,
            booked_quantity: 0,
            available_quantity: equipment.quantity
          }));
          setAvailableEquipment(equipmentWithAvailability);
          console.log('ზოგადი აღჭურვილობის სია მიღებულია:', equipmentWithAvailability);
        }
      }
    } catch (error) {
      console.error('აღჭურვილობის ხელმისაწვდომობის მიღების შეცდომა:', error);
      // fallback - ცარიელი მასივი
      setAvailableEquipment([]);
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
        const equipment = data.map(booking => ({
          equipment_id: booking.equipment_id,
          code_name: booking.code_name,
          quantity: booking.quantity,
          unit_price: booking.unit_price,
          total_price: booking.total_price
        }));
        setSelectedEquipment(equipment);
      }
    } catch (error) {
      console.error('მონაწილის აღჭურვილობის მიღების შეცდომა:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_id) {
      showNotification('გთხოვთ აირჩიოთ კომპანია', 'error');
      return;
    }

    console.log('Form submission data:', formData);

    try {
      const token = localStorage.getItem('token');
      const method = editingParticipant ? 'PUT' : 'POST';
      const url = editingParticipant 
        ? `/api/events/${eventId}/participants/${editingParticipant.id}`
        : `/api/events/${eventId}/participants`;

      // Create FormData for file uploads
      const submitData = new FormData();

      // Add form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      // Add equipment bookings
      if (selectedEquipment.length > 0) {
        const validEquipment = selectedEquipment.filter(eq => 
          eq.equipment_id && eq.quantity > 0
        );
        submitData.append('equipment_bookings', JSON.stringify(validEquipment));
      }

      console.log('Request details:', { method, url, formData, files, selectedEquipment });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Success response:', data);
        showNotification(data.message, 'success');
        fetchParticipants();
        resetForm();
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);

        try {
          const errorData = JSON.parse(errorText);
          showNotification(errorData.message || 'შეცდომა მოთხოვნის დამუშავებისას', 'error');
        } catch (parseError) {
          showNotification(`სერვერის შეცდომა: ${response.status}`, 'error');
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      showNotification('შეცდომა მოთხოვნის დამუშავებისას', 'error');
    }
  };

  const handleCompanyChange = (companyId) => {
    const selectedCompany = companies.find(c => c.id == companyId);

    if (selectedCompany && selectedCompany.contact_persons) {
      try {
        // Parse contact_persons JSON
        const contactPersons = typeof selectedCompany.contact_persons === 'string' 
          ? JSON.parse(selectedCompany.contact_persons) 
          : selectedCompany.contact_persons;

        // Get all contact persons info
        if (Array.isArray(contactPersons) && contactPersons.length > 0) {
          // Create single line format for each contact person: Name (Position); email, phone
          const contactLines = contactPersons.map(cp => {
            const parts = [];

            // Name and position
            if (cp.name) {
              let nameWithPosition = cp.name;
              if (cp.position) nameWithPosition += ` (${cp.position})`;
              parts.push(nameWithPosition);
            }

            return parts.filter(Boolean).join(' ');
          }).filter(Boolean);

          // Get all emails, phones, and positions
          const emailLines = contactPersons.map(cp => cp.email).filter(Boolean);
          const phoneLines = contactPersons.map(cp => cp.phone).filter(Boolean);
          const positionLines = contactPersons.map(cp => cp.position).filter(Boolean);

          setFormData(prev => ({
            ...prev,
            company_id: companyId,
            contact_person: contactLines.join('\n') || prev.contact_person,
            contact_position: positionLines.join('\n') || prev.contact_position,
            contact_email: emailLines.join('\n') || prev.contact_email,
            contact_phone: phoneLines.join('\n') || prev.contact_phone
          }));
        } else if (contactPersons && typeof contactPersons === 'object') {
          // Single contact person object
          setFormData(prev => ({
            ...prev,
            company_id: companyId,
            contact_person: contactPersons.name || prev.contact_person,
            contact_position: contactPersons.position || prev.contact_position,
            contact_email: contactPersons.email || prev.contact_email,
            contact_phone: contactPersons.phone || prev.contact_phone
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            company_id: companyId
          }));
        }
      } catch (error) {
        console.error('Error parsing contact persons:', error);
        setFormData(prev => ({
          ...prev,
          company_id: companyId
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        company_id: companyId
      }));
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
      contact_position: participant.contact_position || '',
      contact_email: participant.contact_email || '',
      contact_phone: participant.contact_phone || '',
      registration_status: participant.registration_status,
      payment_status: participant.payment_status,
      payment_amount: participant.payment_amount || '',
      payment_due_date: participant.payment_due_date || '',
      payment_method: participant.payment_method || '',
      invoice_number: participant.invoice_number || ''
    });
    fetchParticipantEquipment(participant.id);
    setShowAddForm(true);
  };

  const addEquipmentItem = () => {
    setSelectedEquipment([...selectedEquipment, {
      equipment_id: '',
      code_name: '',
      quantity: 1,
      unit_price: 0,
      available_quantity: 0
    }]);
  };

  const removeEquipmentItem = (index) => {
    const newEquipment = selectedEquipment.filter((_, i) => i !== index);
    setSelectedEquipment(newEquipment);
  };

  const updateEquipmentItem = (index, field, value) => {
    const newEquipment = [...selectedEquipment];

    if (field === 'equipment_id') {
      const selectedEquip = availableEquipment.find(eq => eq.id == value);
      if (selectedEquip) {
        newEquipment[index] = {
          ...newEquipment[index],
          equipment_id: value,
          code_name: selectedEquip.code_name,
          unit_price: selectedEquip.price,
          available_quantity: selectedEquip.available_quantity,
          quantity: Math.min(newEquipment[index].quantity, selectedEquip.available_quantity)
        };
      }
    } else if (field === 'quantity') {
      const maxQuantity = newEquipment[index].available_quantity || 0;
      newEquipment[index][field] = Math.min(Math.max(1, parseInt(value) || 1), maxQuantity);
    } else {
      newEquipment[index][field] = value;
    }

    setSelectedEquipment(newEquipment);
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
      contact_position: '',
      contact_email: '',
      contact_phone: '',
      payment_amount: '',
      payment_due_date: '',
      payment_method: '',
      invoice_number: '',
      invoice_file: null,
      contract_file: null,
      handover_file: null
    });
    setFiles({
      invoice_file: null,
      contract_file: null,
      handover_file: null
    });
    setSelectedEquipment([]);
    setEquipmentTotal(0);
    setEditingParticipant(null);
    setShowAddForm(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentFilter('');
    setCountryFilter('');
  };

  // უნიკალური ქვეყნების სია
  const uniqueCountries = [...new Set(participants.map(p => p.country))].filter(Boolean).sort();

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
          <h3>{eventName} - მონაწილეები ({filteredParticipants.length} / {participants.length})</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* ძიება და ფილტრები */}
          <div className="participants-filters">
            <div className="search-row">
              <div className="search-group">
                <input
                  type="text"
                  placeholder="ძიება კომპანიის სახელით, კოდით ან კონტაქტით..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <button 
                className="reset-filters-btn"
                onClick={resetFilters}
                title="ფილტრების გასუფთავება"
              >
                ↻
              </button>
            </div>

            <div className="filters-row">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა სტატუსი</option>
                <option value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</option>
                <option value="რეგისტრირებული">რეგისტრირებული</option>
                <option value="დადასტურებული">დადასტურებული</option>
                <option value="გაუქმებული">გაუქმებული</option>
              </select>

              <select 
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა გადახდა</option>
                <option value="მომლოდინე">მომლოდინე</option>
                <option value="გადახდილი">გადახდილი</option>
                <option value="არ არის საჭიროო">არ არის საჭიროო</option>
              </select>

              <select 
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="filter-select"
              >
                <option value="">ყველა ქვეყანა</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

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
                      onChange={(e) => handleCompanyChange(e.target.value)}
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
                    <label>პოზიცია</label>
                    <input 
                      type="text"
                      value={formData.contact_position}
                      onChange={(e) => setFormData({...formData, contact_position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row">
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

                <div className="form-row">
                  <div className="form-group">
                    <label>გადასახდელი თანხა (₾)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>გადახდის ვადა</label>
                    <input 
                      type="date"
                      value={formData.payment_due_date}
                      onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>გადახდის მეთოდი</label>
                    <select 
                      value={formData.payment_method}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    >
                      <option value="">აირჩიეთ მეთოდი</option>
                      <option value="ბანკის გადარიცხვა">ბანკის გადარიცხვა</option>
                      <option value="ნაღდი">ნაღდი</option>
                      <option value="საბანკო ბარათი">საბანკო ბარათი</option>
                      <option value="ონლაინ გადახდა">ონლაინ გადახდა</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ინვოისის ნომერი</label>
                    <input 
                      type="text"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                    />
                  </div>
                </div>

                {/* აღჭურვილობის არჩევის სექცია */}
                <div className="equipment-section">
                  <div className="equipment-header">
                    <h4>აღჭურვილობის არჩევა</h4>
                    <button 
                      type="button" 
                      className="add-equipment-btn"
                      onClick={addEquipmentItem}
                    >
                      + აღჭურვილობის დამატება
                    </button>
                  </div>

                  {selectedEquipment.map((item, index) => (
                    <div key={index} className="equipment-item">
                      <div className="form-row">
                        <div className="form-group">
                          <label>აღჭურვილობა</label>
                          <select 
                            value={item.equipment_id}
                            onChange={(e) => updateEquipmentItem(index, 'equipment_id', e.target.value)}
                            required
                          >
                            <option value="">აირჩიეთ აღჭურვილობა</option>
                            {availableEquipment
                              .filter(eq => eq.available_quantity > 0)
                              .map(equipment => (
                                <option key={equipment.id} value={equipment.id}>
                                  {equipment.code_name} (ხელმისაწვდომი: {equipment.available_quantity}, ფასი: €{equipment.price})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>რაოდენობა</label>
                          <input 
                            type="number"
                            min="1"
                            max={item.available_quantity || 1}
                            value={item.quantity}
                            onChange={(e) => updateEquipmentItem(index, 'quantity', e.target.value)}
                            required
                          />
                          {item.available_quantity > 0 && (
                            <small>მაქს: {item.available_quantity}</small>
                          )}
                        </div>
                        <div className="form-group">
                          <label>ერთეულის ფასი (₾)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateEquipmentItem(index, 'unit_price', e.target.value)}
                            readOnly
                          />
                        </div>
                        <div className="form-group">
                          <label>ჯამი (₾)</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={(item.quantity * item.unit_price).toFixed(2)}
                            readOnly
                          />
                        </div>
                        <div className="form-group">
                          <button 
                            type="button" 
                            className="remove-equipment-btn"
                            onClick={() => removeEquipmentItem(index)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedEquipment.length > 0 && (
                    <div className="equipment-total">
                      <strong>აღჭურვილობის ჯამური ღირებულება: ₾{equipmentTotal.toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                {/* ფაილების მიმაგრების სექცია */}
                <div className="files-section">
                  <h4>დოკუმენტების მიმაგრება</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>ინვოისი (PDF ან Excel)</label>
                      <input 
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        onChange={(e) => setFiles({...files, invoice_file: e.target.files[0]})}
                        className="file-input"
                      />
                      {files.invoice_file && (
                        <div className="file-info">
                          არჩეული: {files.invoice_file.name}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>ხელშეკრულება (PDF ან Excel)</label>
                      <input 
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        onChange={(e) => setFiles({...files, contract_file: e.target.files[0]})}
                        className="file-input"
                      />
                      {files.contract_file && (
                        <div className="file-info">
                          არჩეული: {files.contract_file.name}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>მიღება-ჩაბარება (PDF ან Excel)</label>
                      <input 
                        type="file"
                        accept=".pdf,.xlsx,.xls"
                        onChange={(e) => setFiles({...files, handover_file: e.target.files[0]})}
                        className="file-input"
                      />
                      {files.handover_file && (
                        <div className="file-info">
                          არჩეული: {files.handover_file.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
            {filteredParticipants.length === 0 ? (
              participants.length === 0 ? (
              <div className="no-participants">
                  <p>ამ ივენთზე მონაწილეები ჯერ არ არის რეგისტრირებული.</p>
                  {isAuthorizedForManagement && (
                    <p className="hint">მონაწილის დამატებისთვის გამოიყენეთ ზემოთ მოცემული ღილაკი.</p>
                  )}
                </div>
              ) : (
                <div className="no-participants">
                  <p>ფილტრის შედეგად მონაწილეები ვერ მოიძებნა.</p>
                  <p className="hint">შეცვალეთ ძიების პარამეტრები ან გაასუფთავეთ ფილტრები.</p>
                </div>
              )
            ) : (
              <div className="participants-table">
                <div className="table-header">
                  <div>კომპანია</div>
                  <div>ქვეყანა</div>
                  <div>სტენდი</div>
                  <div>სტატუსი</div>
                  <div>გადახდა</div>
                  <div>რეგისტრაცია</div>
                  <div>დოკუმენტები</div>
                  {isAuthorizedForManagement && <div>მოქმედებები</div>}
                </div>
                {filteredParticipants.map(participant => (
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
                    <div data-label="დოკუმენტები:" className="participant-files">
                      {participant.invoice_file && (
                        <a href={participant.invoice_file} target="_blank" rel="noopener noreferrer" className="file-link">
                          📄 ინვოისი
                        </a>
                      )}
                      {participant.contract_file && (
                        <a href={participant.contract_file} target="_blank" rel="noopener noreferrer" className="file-link">
                          📋 ხელშეკრულება
                        </a>
                      )}
                      {participant.handover_file && (
                        <a href={participant.handover_file} target="_blank" rel="noopener noreferrer" className="file-link">
                          📦 მიღება-ჩაბარება
                        </a>
                      )}
                    </div>
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