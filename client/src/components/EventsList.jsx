
import React, { useState, useEffect, useCallback } from 'react';
import './EventsList.css';
import EventForm from './EventForm';

const EventsList = ({ showNotification, userRole }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 
      
      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა ივენთების ნახვისთვის');
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // ცალკე API call ივენთებისთვის
      const response = await fetch('/api/events', {
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }
        
        // თუ events endpoint არ არსებობს, შევცადოთ annual-services-ით
        const fallbackResponse = await fetch('/api/annual-services', {
          headers: headers
        });
        
        if (!fallbackResponse.ok) {
          if (fallbackResponse.status === 401 || fallbackResponse.status === 403) {
            throw new Error('არ გაქვთ სერვისების ნახვის უფლება');
          }
          const errorData = await fallbackResponse.json();
          throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
        }
        
        const data = await fallbackResponse.json();
        console.log('All services data:', data);
        
        // ფილტრაცია მხოლოდ ივენთ ტიპის სერვისებისთვის
        const eventTypes = ['ივენთი', 'ფესტივალი', 'event', 'festival'];
        const filteredEvents = data.filter(service => 
          eventTypes.some(type => 
            service.service_type && service.service_type.toLowerCase().includes(type.toLowerCase())
          )
        );
        console.log('Filtered events:', filteredEvents);
        setEvents(filteredEvents);
        return;
      }
      
      const data = await response.json();
      console.log('Events data:', data);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
      showNotification(`შეცდომა ივენთების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის წაშლა?');
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
        showNotification('ივენთი წარმატებით წაიშალა!', 'success');
        setEvents(events.filter((event) => event.id !== id));
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };
  
  const handleEditClick = (event) => {
    setEditingId(event.id);
  };
  
  const handleEventUpdated = () => {
    setEditingId(null);
    fetchEvents();
  };

  const handleArchive = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივში გადატანა?');
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
        showNotification('ივენთი წარმატებით არქივში გადაიტანა!', 'success');
        fetchEvents();
      } else {
        const errorData = await response.json();
        showNotification(`არქივში გადატანა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const viewEventDetails = async (event) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${event.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const details = await response.json();
        setSelectedEvent(details);
        setShowDetails(true);
      } else {
        showNotification('ივენთის დეტალების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა ივენთის დეტალების ჩატვირთვისას', 'error');
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

  const getStatusBadge = (event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (event.is_archived) return { text: 'არქივი', class: 'archived' };
    if (!event.is_active) return { text: 'არააქტიური', class: 'inactive' };
    if (now < startDate) return { text: 'მომავალი', class: 'upcoming' };
    if (now > endDate) return { text: 'დასრულებული', class: 'finished' };
    return { text: 'მიმდინარე', class: 'active' };
  };

  return (
    <div className="events-container">
      <h2>ივენთები</h2>
      {isAuthorizedForManagement && (
        <button className="add-new" onClick={() => setEditingId(0)}>
          ახალი ივენთის დამატება
        </button>
      )}
      
      {editingId !== null && isAuthorizedForManagement && (
         <EventForm 
            eventToEdit={events.find(e => e.id === editingId)} 
            onEventUpdated={handleEventUpdated} 
            showNotification={showNotification} 
         />
      )}
      
      {events.length === 0 ? (
        <p className="no-events">ივენთები არ მოიძებნა.</p>
      ) : (
        <div className="events-grid">
          {events.map((event) => {
            const status = getStatusBadge(event);
            return (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <h3 
                    className="event-name"
                    onClick={() => viewEventDetails(event)}
                  >
                    {event.service_name}
                  </h3>
                  <span className={`status-badge ${status.class}`}>
                    {status.text}
                  </span>
                </div>
                
                <div className="event-details">
                  <p><strong>ტიპი:</strong> {event.service_type}</p>
                  <p><strong>წელი:</strong> {event.year_selection}</p>
                  <p><strong>თარიღები:</strong> {formatDate(event.start_date)} - {formatDate(event.end_date)}</p>
                  <p><strong>სივრცეები:</strong> {event.spaces_count || 0}</p>
                  <p><strong>აღწერა:</strong> {event.description}</p>
                </div>
                
                {isAuthorizedForManagement && (
                  <div className="event-actions">
                    <button className="view" onClick={() => viewEventDetails(event)}>
                      ნახვა
                    </button>
                    <button className="edit" onClick={() => handleEditClick(event)}>
                      რედაქტირება
                    </button>
                    {status.class === 'finished' && !event.is_archived && (
                      <button className="archive" onClick={() => handleArchive(event.id)}>
                        არქივი
                      </button>
                    )}
                    <button 
                      className="delete" 
                      onClick={() => handleDelete(event.id)}>
                      წაშლა
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDetails && selectedEvent && (
        <div className="event-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedEvent.service_name}</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p><strong>აღწერა:</strong> {selectedEvent.description}</p>
              <p><strong>წელი:</strong> {selectedEvent.year_selection}</p>
              <p><strong>ტიპი:</strong> {selectedEvent.service_type}</p>
              <p><strong>თარიღები:</strong> {formatDate(selectedEvent.start_date)} - {formatDate(selectedEvent.end_date)}</p>
              
              {selectedEvent.spaces && selectedEvent.spaces.length > 0 && (
                <div>
                  <h4>გამოყენებული სივრცეები:</h4>
                  <ul>
                    {selectedEvent.spaces.map(space => (
                      <li key={space.id}>
                        {space.building_name} - {space.category}
                        {space.area_sqm && ` (${space.area_sqm} მ²)`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedEvent.bookings && selectedEvent.bookings.length > 0 && (
                <div>
                  <h4>მონაწილე კომპანიები ({selectedEvent.bookings.length}):</h4>
                  <ul>
                    {selectedEvent.bookings.map(booking => (
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

export default EventsList;
