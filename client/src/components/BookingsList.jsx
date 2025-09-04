
import React, { useState, useEffect, useCallback } from 'react';
import './BookingsList.css';
import BookingForm from './BookingForm';
import api from '../services/api';

const BookingsList = ({ showNotification, userRole }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isAuthorized = userRole === 'admin' || userRole === 'sales' || userRole === 'marketing';

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings');
      setBookings(response.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
      showNotification(`შეცდომა ბრონირებების ჩატვირთვისას: ${err.message}`, 'error');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings based on search and status
  useEffect(() => {
    let filtered = [...bookings];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(booking =>
        booking.company_name?.toLowerCase().includes(search) ||
        booking.event_name?.toLowerCase().includes(search) ||
        booking.booth_number?.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ბრონირების წაშლა?');
    if (!isConfirmed) return;

    try {
      await api.delete(`/bookings/${id}`);
      showNotification('ბრონირება წარმატებით წაიშალა!', 'success');
      fetchBookings();
    } catch (error) {
      showNotification(`შეცდომა: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  if (loading) return <div className="loading">იტვირთება...</div>;
  if (error) return <div className="error">შეცდომა: {error}</div>;

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h2>ბრონირებები</h2>
        {isAuthorized && (
          <button
            className="add-booking-btn"
            onClick={() => setEditingId(0)}
          >
            + ახალი ბრონირება
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="ძიება..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="">ყველა სტატუსი</option>
          <option value="დადასტურებული">დადასტურებული</option>
          <option value="მოლოდინში">მოლოდინში</option>
          <option value="გაუქმებული">გაუქმებული</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
          }}
          className="clear-filters-btn"
        >
          გასუფთავება
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bookings-table-container">
        <table className="bookings-table">
          <thead>
            <tr>
              <th>კომპანია</th>
              <th>ივენთი</th>
              <th>სტენდის ნომერი</th>
              <th>სტატუსი</th>
              <th>თარიღი</th>
              <th>მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  ბრონირებები არ მოიძებნა
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.company_name}</td>
                  <td>{booking.event_name}</td>
                  <td>{booking.booth_number}</td>
                  <td>
                    <span className={`status-badge status-${booking.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>{formatDate(booking.created_at)}</td>
                  <td>
                    <div className="actions">
                      {isAuthorized && (
                        <>
                          <button
                            className="edit"
                            onClick={() => setEditingId(booking.id)}
                            title="რედაქტირება"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete"
                            onClick={() => handleDelete(booking.id)}
                            title="წაშლა"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Form Modal */}
      {editingId !== null && isAuthorized && (
        <BookingForm
          isOpen={editingId !== null}
          onClose={() => setEditingId(null)}
          onSubmit={async (formData) => {
            try {
              if (editingId === 0) {
                await api.post('/bookings', formData);
                showNotification('ბრონირება წარმატებით შეიქმნა!', 'success');
              } else {
                await api.put(`/bookings/${editingId}`, formData);
                showNotification('ბრონირება წარმატებით განახლდა!', 'success');
              }
              fetchBookings();
              setEditingId(null);
            } catch (error) {
              showNotification(`შეცდომა: ${error.response?.data?.message || error.message}`, 'error');
            }
          }}
          editingBooking={editingId !== 0 ? bookings.find(b => b.id === editingId) : null}
        />
      )}
    </div>
  );
};

export default BookingsList;
