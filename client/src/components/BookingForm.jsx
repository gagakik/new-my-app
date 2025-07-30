
import React, { useState, useEffect } from 'react';
import './BookingForm.css';

const BookingForm = ({ bookingToEdit, onBookingUpdated, showNotification }) => {
  const [serviceId, setServiceId] = useState('');
  const [exhibitionId, setExhibitionId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [services, setServices] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [companies, setCompanies] = useState([]);

  const isEditing = !!bookingToEdit;

  useEffect(() => {
    // Fetch services, exhibitions, and companies for dropdowns
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [servicesRes, exhibitionsRes, companiesRes] = await Promise.all([
          fetch('/api/annual-services', { headers }),
          fetch('/api/exhibitions', { headers }),
          fetch('/api/companies', { headers })
        ]);

        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          setServices(servicesData);
        }
        if (exhibitionsRes.ok) {
          const exhibitionsData = await exhibitionsRes.json();
          setExhibitions(exhibitionsData);
        }
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    if (isEditing) {
      setServiceId(bookingToEdit.service_id);
      setExhibitionId(bookingToEdit.exhibition_id);
      setCompanyId(bookingToEdit.company_id);
      setBookingDate(bookingToEdit.booking_date ? bookingToEdit.booking_date.split('T')[0] : '');
      setStartTime(bookingToEdit.start_time || '');
      setEndTime(bookingToEdit.end_time || '');
      setNotes(bookingToEdit.notes || '');
    } else {
      setServiceId('');
      setExhibitionId('');
      setCompanyId('');
      setBookingDate('');
      setStartTime('');
      setEndTime('');
      setNotes('');
    }
  }, [bookingToEdit, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bookingData = {
      service_id: parseInt(serviceId),
      exhibition_id: parseInt(exhibitionId),
      company_id: parseInt(companyId),
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      notes,
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ოპერაცია ვერ შესრულდა');
      }

      const data = await response.json();
      showNotification(data.message, 'success');
      onBookingUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  return (
    <div className="form-container">
      <h3>ახალი ჯავშნის დამატება</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>სერვისი</label>
          <select 
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
          >
            <option value="">აირჩიეთ სერვისი</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.service_name} - {parseFloat(service.price).toFixed(2)} ₾
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>გამოფენა</label>
          <select 
            value={exhibitionId}
            onChange={(e) => setExhibitionId(e.target.value)}
            required
          >
            <option value="">აირჩიეთ გამოფენა</option>
            {exhibitions.map(exhibition => (
              <option key={exhibition.id} value={exhibition.id}>
                {exhibition.exhibition_name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>კომპანია</label>
          <select 
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            required
          >
            <option value="">აირჩიეთ კომპანია</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.company_name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>ჯავშნის თარიღი</label>
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>დაწყების დრო</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>დასრულების დრო</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>კომენტარი</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
          />
        </div>
        <button type="submit" className="submit-btn">
          დამატება
        </button>
        <button type="button" className="cancel-btn" onClick={onBookingUpdated}>
          გაუქმება
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
