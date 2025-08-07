import React, { useState, useEffect, useCallback } from 'react';
import './ServicesList.css';
import ServiceForm from './ServiceForm';

const ServicesList = ({ showNotification, userRole }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  const fetchServices = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch('/api/annual-services', {
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setServices(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა სერვისების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ სერვისის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(`/api/annual-services/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('სერვისი წარმატებით წაიშალა!', 'success');
        setServices(services.filter((service) => service.id !== id));
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleEditClick = (service) => {
    setEditingId(service.id);
  };

  const handleServiceUpdated = () => {
    setEditingId(null);
    fetchServices();
  };

  const handleArchive = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ სერვისის არქივში გადატანა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${id}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('სერვისი წარმატებით არქივში გადაიტანა!', 'success');
        fetchServices();
      } else {
        const errorData = await response.json();
        showNotification(`არქივში გადატანა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const viewServiceDetails = async (service) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${service.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const details = await response.json();
        setSelectedService(details);
        setShowDetails(true);
      } else {
        showNotification('სერვისის დეტალების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა სერვისის დეტალების ჩატვირთვისას', 'error');
    }
  };

  if (loading) {
    return <div>იტვირთება...</div>;
  }

  if (error) {
    return <div>შეცდომა: {error}</div>;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  const getStatusBadge = (service) => {
    const now = new Date();
    const startDate = new Date(service.start_date);
    const endDate = new Date(service.end_date);

    if (service.is_archived) return { text: 'არქივი', class: 'archived' };
    if (!service.is_active) return { text: 'არააქტიური', class: 'inactive' };
    if (now < startDate) return { text: 'მომავალი', class: 'upcoming' };
    if (now > endDate) return { text: 'დასრულებული', class: 'finished' };
    return { text: 'მიმდინარე', class: 'active' };
  };

  return (
    <div className="services-container">
      <h2>ყოველწლური სერვისები</h2>
      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>
          ახალი სერვისის დამატება
        </button>
      )}

      {editingId !== null && isAuthorizedForManagement && (
         <ServiceForm 
            serviceToEdit={services.find(s => s.id === editingId)} 
            onServiceUpdated={handleServiceUpdated} 
            showNotification={showNotification} 
         />
      )}

      {services.length === 0 ? (
        <p className="no-services">სერვისები არ მოიძებნა.</p>
      ) : (
        <table className="services-table">
          <thead>
            <tr>
              <th>სერვისის სახელი</th>
              <th>წელი</th>
              <th>ტიპი</th>
              <th>თარიღები</th>
              <th>სტატუსი</th>
              <th>სივრცეები</th>
              {isAuthorizedForManagement && <th>მოქმედებები</th>}
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const status = getStatusBadge(service);
              return (
                <tr key={service.id}>
                  <td>
                    <button 
                      className="service-name-link"
                      onClick={() => viewServiceDetails(service)}
                    >
                      {service.service_name}
                    </button>
                  </td>
                  <td>{service.year_selection}</td>
                  <td>{service.service_type}</td>
                  <td>
                    {formatDate(service.start_date)} - {formatDate(service.end_date)}
                  </td>
                  <td>
                    <span className={`status-badge ${status.class}`}>
                      {status.text}
                    </span>
                  </td>
                  <td>{service.spaces_count || 0} სივრცე</td>
                  {isAuthorizedForManagement && (
                    <td>
                      <div className="actions">
                        <button
                          className="view"
                          onClick={() => viewServiceDetails(service)}
                          title="დეტალების ნახვა"
                        >
                          👁️ დეტალები
                        </button>
                        <button
                          className="edit"
                          onClick={() => handleEditClick(service)}
                          title="რედაქტირება"
                        >
                          ✏️ რედაქტირება
                        </button>
                        {status.class === 'finished' && !service.is_archived && (
                          <button className="archive" onClick={() => handleArchive(service.id)}>
                            არქივი
                          </button>
                        )}
                        <button 
                          className="delete" 
                          onClick={() => handleDelete(service.id)}
                          title="წაშლა"
                        >
                          🗑️ წაშლა
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showDetails && selectedService && (
        <div className="service-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedService.service_name}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p><strong>აღწერა:</strong> {selectedService.description}</p>
              <p><strong>წელი:</strong> {selectedService.year_selection}</p>
              <p><strong>ტიპი:</strong> {selectedService.service_type}</p>
              <p><strong>თარიღები:</strong> {formatDate(selectedService.start_date)} - {formatDate(selectedService.end_date)}</p>

              {selectedService.spaces && selectedService.spaces.length > 0 && (
                <div>
                  <h4>გამოყენებული სივრცეები:</h4>
                  <ul>
                    {selectedService.spaces.map(space => (
                      <li key={space.id}>
                        {space.building_name} - {space.category}
                        {space.area_sqm && ` (${space.area_sqm} მ²)`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedService.bookings && selectedService.bookings.length > 0 && (
                <div>
                  <h4>მონაწილე კომპანიები ({selectedService.bookings.length}):</h4>
                  <ul>
                    {selectedService.bookings.map(booking => (
                      <li key={booking.id}>
                        {booking.company_name} - {booking.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesList;