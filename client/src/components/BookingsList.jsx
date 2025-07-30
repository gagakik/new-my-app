
import React, { useState, useEffect, useCallback } from 'react';
import './BookingsList.css';
import BookingForm from './BookingForm';

const BookingsList = ({ showNotification, userRole }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 
      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა');
      }

      const response = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა ჯავშნების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showNotification('ჯავშნის სტატუსი წარმატებით განახლდა!', 'success');
        fetchBookings();
      } else {
        const errorData = await response.json();
        showNotification(`სტატუსის განახლება ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა სტატუსის განახლებისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleDeleteBooking = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ჯავშნის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('ჯავშანი წარმატებით წაიშალა!', 'success');
        fetchBookings();
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა ჯავშნის წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };
  
  const handleBookingUpdated = () => {
    setEditingId(null);
    fetchBookings();
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

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'მუშავდება', className: 'status-pending' },
      confirmed: { label: 'დადასტურებული', className: 'status-confirmed' },
      cancelled: { label: 'გაუქმებული', className: 'status-cancelled' },
      completed: { label: 'დასრულებული', className: 'status-completed' }
    };
    
    const statusInfo = statusMap[status] || { label: status, className: '' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  return (
    <div className="bookings-container">
      <h2>ჯავშნები</h2>
      <button className="add-new" onClick={() => setEditingId(0)}>ახალი ჯავშნის დამატება</button>
      
      {editingId !== null && (
         <BookingForm 
            bookingToEdit={bookings.find(b => b.id === editingId)} 
            onBookingUpdated={handleBookingUpdated} 
            showNotification={showNotification} 
         />
      )}
      
      {bookings.length === 0 ? (
        <p className="no-bookings">ჯავშნები არ მოიძებნა.</p>
      ) : (
        <table className="bookings-table">
          <thead>
            <tr>
              <th>სერვისი</th>
              <th>გამოფენა</th>
              <th>კომპანია</th>
              <th>ჯავშნის თარიღი</th>
              <th>დრო</th>
              <th>ღირებულება</th>
              <th>სტატუსი</th>
              {isAuthorizedForManagement && <th>მოქმედებები</th>}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.service_name}</td>
                <td>{booking.exhibition_name}</td>
                <td>{booking.company_name}</td>
                <td>{formatDate(booking.booking_date)}</td>
                <td>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</td>
                <td>{parseFloat(booking.total_amount || 0).toFixed(2)} ₾</td>
                <td>{getStatusBadge(booking.status)}</td>
                {isAuthorizedForManagement && (
                  <td>
                    <div className="actions">
                      <select 
                        value={booking.status} 
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">მუშავდება</option>
                        <option value="confirmed">დადასტურებული</option>
                        <option value="completed">დასრულებული</option>
                        <option value="cancelled">გაუქმებული</option>
                      </select>
                      <button 
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="delete-btn"
                        title="ჯავშნის წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BookingsList;
