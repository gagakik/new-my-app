import React, { useState, useEffect, useCallback } from 'react';
import EventForm from './EventForm';
import EventParticipants from './EventParticipants';
import EventCompletion from './EventCompletion';
import EventFileManager from './EventFileManager';
import './EventsList.css';

const EventsList = ({ showNotification, userRole }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showEventCompletion, setShowEventCompletion] = useState(false);
  const [selectedEventForCompletion, setSelectedEventForCompletion] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedEventForFiles, setSelectedEventForFiles] = useState(null);

  // ფილტრებისა და ძიების სტეიტები
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' ან 'desc'

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'sales' ||
    userRole === 'marketing';

  const isAuthorizedForDeletion = userRole === 'admin';

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

      console.log('Fetching events from /api/annual-services');
      const response = await fetch('/api/annual-services', { headers });

      if (!response.ok) {
        console.error('Events API failed with status:', response.status);

        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }

        if (response.status === 500) {
          console.log('Server error, trying fallback to annual-services');
          // სერვერის შეცდომის შემთხვევაში შევცადოთ annual-services-ით
          try {
            const fallbackResponse = await fetch('/api/annual-services', { headers });

            if (!fallbackResponse.ok) {
              throw new Error('ბექენდ სერვისები მიუწვდომელია');
            }

            const data = await fallbackResponse.json();
            console.log('Fallback data received:', data.length, 'services');
            setEvents(data || []);
            return;
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw new Error('სერვისი დროებით მიუწვდომელია');
          }
        }

        throw new Error(`სერვერის შეცდომა: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("სერვერმა არასწორი ფორმატი დააბრუნა");
      }

      const data = await response.json();
      console.log('Events data received:', data.length, 'events');
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
      showNotification(`შეცდომა ივენთების ჩატვირთვისას: ${err.message}`, 'error');
      setEvents([]); // ცარიელი მასივი დავაყენოთ შეცდომის შემთხვევაში
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ცალკე useEffect სორტირებისთვის - როცა events იტვირთება ან sortDirection იცვლება
  useEffect(() => {
    if (events.length > 0) {
      let sorted = [...events];
      if (sortDirection === 'desc') {
        sorted.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      } else {
        sorted.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      }
      setEvents(sorted);
    }
  }, [sortDirection]);

  // ფილტრაციის ლოგიკა
  useEffect(() => {
    let filtered = [...events];

    // ფილტრაცია არქივის მიხედვით
    if (showArchivedOnly) {
      filtered = filtered.filter(event => event.is_archived);
    } else {
      filtered = filtered.filter(event => !event.is_archived);
    }

    // ძიება სახელის მიხედვით
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ფილტრაცია წლის მიხედვით
    if (selectedYear) {
      filtered = filtered.filter(event => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear.toString() === selectedYear;
      });
    }

    // ფილტრაცია თვის მიხედვით
    if (selectedMonth) {
      filtered = filtered.filter(event => {
        const eventMonth = new Date(event.start_date).getMonth() + 1;
        return eventMonth.toString() === selectedMonth;
      });
    }

    // ფილტრაცია სტატუსის მიხედვით
    if (statusFilter) {
      filtered = filtered.filter(event => {
        const status = getStatusBadge(event);
        return status.class === statusFilter;
      });
    }

    // სორტირება დაწყების თარიღის მიხედვით
    if (sortDirection === 'desc') {
      filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)); // ყველაზე ახალი პირველი
    } else {
      filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)); // ყველაზე ძველი პირველი
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedYear, selectedMonth, statusFilter, showArchivedOnly, sortDirection]);

  // ცალკე useEffect, რომელიც გაასუფთავებს filter-ებს, როდესაც showArchivedOnly იცვლება
  useEffect(() => {
    // თუ გადავედით არქივიდან აქტიურზე, გავასუფთავოთ ფილტრები, რადგან ზოგიერთი ფილტრი შეიძლება არქივებულებზე არ იყოს რელევანტური
    if (!showArchivedOnly) {
      // შეგვიძლია აქ დავამატოთ კონკრეტული ფილტრების გასუფთავება, თუ საჭიროა, მაგალითად, statusFilter
      // setStatusFilter('');
    }
  }, [showArchivedOnly]);


  // წლების სია
  const getAvailableYears = () => {
    const years = events.map(event => new Date(event.start_date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };

  // თვეების სია
  const months = [
    { value: '1', label: 'იანვარი' },
    { value: '2', label: 'თებერვალი' },
    { value: '3', label: 'მარტი' },
    { value: '4', label: 'აპრილი' },
    { value: '5', label: 'მაისი' },
    { value: '6', label: 'ივნისი' },
    { value: '7', label: 'ივლისი' },
    { value: '8', label: 'აგვისტო' },
    { value: '9', label: 'სექტემბერი' },
    { value: '10', label: 'ოქტომბერი' },
    { value: '11', label: 'ნოემბერი' },
    { value: '12', label: 'დეკემბერი' }
  ];

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedYear('');
    setSelectedMonth('');
    setStatusFilter('');
    // setShowArchivedOnly(false); // არქივის ტოგლის გათიშვა არ გვინდა ფილტრების გასუფთავებისას
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის წაშლა? ეს მოიცავს ყველა დაკავშირებულ მონაწილეს და მონაცემს.');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      console.log(`Attempting to delete event with ID: ${id}`);

      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        showNotification('ივენთი წარმატებით წაიშალა!', 'success');
        setEvents(prevEvents => prevEvents.filter((event) => event.id !== id));
        fetchEvents(); // Refresh the list to ensure consistency
      } else {
        const contentType = response.headers.get("content-type");

        let errorMessage = 'წაშლა ვერ მოხერხდა';

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (jsonError) {
            console.error('Error parsing JSON error response:', jsonError);
            errorMessage = `სერვერის შეცდომა (${response.status})`;
          }
        } else {
          // If response is not JSON (like HTML error page)
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          errorMessage = `სერვერის შეცდომა (${response.status})`;
        }

        console.error('Delete failed:', { status: response.status, message: errorMessage });
        showNotification(errorMessage, 'error');
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
    } catch (er) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleRestore = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივიდან აღდგენა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${id}/restore`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('ივენთი წარმატებით აღდგა არქივიდან!', 'success');
        fetchEvents();
      } else {
        const errorData = await response.json();
        showNotification(`არქივიდან აღდგენა ვერ მოხერხდა: ${errorData.message}`, 'error');
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

  const handleShowParticipants = (event) => {
    setSelectedEvent(event);
    setShowParticipants(true);
  };

  const handleShowFiles = (event) => {
    setSelectedEventForFiles(event);
    setShowFileManager(true);
  };

  const handleCompleteEvent = (event) => {
    setSelectedEventForCompletion(event);
    setShowEventCompletion(true);
  };

  const handleCompletionSuccess = (report) => {
    showNotification('ივენთი წარმატებით დასრულდა!', 'success');
    fetchEvents(); // ივენთების სიის განახლება
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
    return timeString.slice(0, 5); // Format HH:MM
  };

  const formatDateTime = (date, time) => {
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);
    return formattedTime ? `${formattedDate} ${formattedTime}` : formattedDate;
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

  const toggleSortDirection = () => {
    setSortDirection(prevDirection => (prevDirection === 'desc' ? 'asc' : 'desc'));
  };


  return (
    <div className="events-container">
      <div className="header-section">
        <h2>{showArchivedOnly ? 'არქივი' : 'ივენთები'}</h2>
        <div className="header-actions">
          <button
            className={`archive-toggle ${showArchivedOnly ? 'active' : ''}`}
            onClick={() => setShowArchivedOnly(!showArchivedOnly)}
          >
            {showArchivedOnly ? 'აქტიური ივენთები' : 'არქივი'}
          </button>
          {isAuthorizedForManagement && !showArchivedOnly && (
            <button className="add-new new-event" onClick={() => setEditingId(0)}>
              ივენთის დამატება
            </button>
          )}
        </div>
      </div>

      {editingId !== null && isAuthorizedForManagement && (
         <EventForm
            eventToEdit={events.find(e => e.id === editingId)}
            onEventUpdated={handleEventUpdated}
            showNotification={showNotification}
         />
      )}

      <div className="events-filters">
        <div className="filters-row">
          <div className="search-group">
            <label>ძიება</label>
            <input
              type="text"
              placeholder="ძიება სახელით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <label>წელი</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">ყველა წელი</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>თვე</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="filter-select"
            >
              <option value="">ყველა თვე</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>სტატუსი</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">ყველა სტატუსი</option>
              <option value="upcoming">მომავალი</option>
              <option value="active">მიმდინარე</option>
              <option value="finished">დასრულებული</option>
              <option value="archived">არქივი</option>
              <option value="inactive">არააქტიური</option>
            </select>
          </div>

          <div className="filter-actions">
            <button className="clear-filters" onClick={clearFilters}>
              ფილტრების გასუფთავება
            </button>
            <button className="sort-toggle" onClick={toggleSortDirection}>
              {sortDirection === 'desc' ? 'ახალი ძველი' : 'ძველი ახალი'}
            </button>
          </div>
        </div>

        <div className="results-info">
          ნაპოვნია: {filteredEvents.length} {showArchivedOnly ? 'არქივული' : 'აქტიური'} ივენთი
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="no-events">
          {showArchivedOnly
            ? 'არქივში ივენთები არ მოიძებნა.'
            : (events.length === 0 ? 'ივენთები არ მოიძებნა.' : 'ფილტრების შესაბამისი ივენთები არ მოიძებნა.')}
        </p>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => {
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
                  <div className="event-dates">
                    <span className="date-label">დაწყება:</span>
                    <span className="date-value">{formatDateTime(event.start_date, event.start_time)}</span>
                    <span className="date-label">დასრულება:</span>
                    <span className="date-value">{formatDateTime(event.end_date, event.end_time)}</span>
                  </div>
                  <div className="event-stats">
                    <span className="stat-item">
                      <strong>სივრცეები:</strong> {event.spaces_count || 0}
                    </span>
                    <span className="stat-item">
                      <strong>ტიპი:</strong> {event.service_type}
                    </span>
                  </div>
                </div>

                <div className="actions">
                  <button
                    className="participants"
                    onClick={() => handleShowParticipants(event)}
                    title="მონაწილეები"
                  >
                    👥
                  </button>
                  <button
                    className="files-manager"
                    onClick={() => handleShowFiles(event)}
                    title="ფაილების მართვა - ატვირთვა, ნახვა, წაშლა"
                  >
                    📁
                    <div className="files-preview">
                      <div className="preview-section">
                        <div className="preview-header">📋 გეგმა:</div>
                        <div className="file-item-preview">
                          <span>{event.plan_file_path ? '✅ გეგმა.pdf' : '❌ არ არის'}</span>
                        </div>
                      </div>
                      <div className="preview-section">
                          <div className="preview-header">მიმაგრებული ფაილები:</div>
                          {(() => {
                            const allFiles = [
                              ...(event.invoice_files || []).map(f => ({...f, type: 'ინვოისი'})),
                              ...(event.expense_files || []).map(f => ({...f, type: 'ხარჯი'}))
                            ];

                            if (allFiles.length > 0) {
                              return (
                                <>
                                  {allFiles.slice(0, 3).map((file, index) => (
                                    <div key={index} className="file-item-preview">
                                      <span>📄 {file.name} ({file.type})</span>
                                    </div>
                                  ))}
                                  {allFiles.length > 3 && (
                                    <div className="file-item-preview">
                                      <span>... და კიდევ {allFiles.length - 3} ფაილი</span>
                                    </div>
                                  )}
                                </>
                              );
                            } else {
                              return (
                                <div className="file-item-preview">
                                  <span>❌ მიმაგრებული ფაილები არ არის</span>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      <div className="click-hint">
                        <span>დააჭირეთ ფაილების მართვისთვის</span>
                      </div>
                    </div>
                  </button>
                  {isAuthorizedForManagement && (
                    <>
                      {!showArchivedOnly && (
                        <button
                          className="edit"
                          onClick={() => handleEditClick(event)}
                          title="რედაქტირება"
                        >
                        </button>
                      )}
                      {status.class === 'finished' && !event.is_archived && (
                        <>
                          <button
                            className="complete"
                            onClick={() => handleCompleteEvent(event)}
                            title="ივენთის დასრულება">
                          </button>
                          <button
                            className="archive"
                            onClick={() => handleArchive(event.id)}
                            title="არქივში გადატანა">
                          </button>
                        </>
                      )}
                      {showArchivedOnly && event.is_archived && (
                        <button
                          className="restore"
                          onClick={() => handleRestore(event.id)}
                          title="არქივიდან აღდგენა">
                        </button>
                      )}
                      {isAuthorizedForDeletion && (
                        <button
                          className="delete"
                          onClick={() => handleDelete(event.id)}
                          title="წაშლა">
                        </button>
                      )}
                    </>
                  )}
                </div>
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
              <p><strong>თარიღები:</strong> {formatDateTime(selectedEvent.start_date, selectedEvent.start_time)} - {formatDateTime(selectedEvent.end_date, selectedEvent.end_time)}</p>

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

      {showParticipants && selectedEvent && (
        <EventParticipants
          eventId={selectedEvent.id}
          eventName={selectedEvent.service_name}
          onClose={() => {
            setShowParticipants(false);
            setSelectedEvent(null);
          }}
          showNotification={showNotification}
          userRole={userRole}
        />
      )}

      {showEventCompletion && selectedEventForCompletion && (
        <EventCompletion
          eventId={selectedEventForCompletion.id}
          eventName={selectedEventForCompletion.name}
          onClose={() => {
            setShowEventCompletion(false);
            setSelectedEventForCompletion(null);
          }}
          onSuccess={handleCompletionSuccess}
        />
      )}

      {showFileManager && selectedEventForFiles && (
        <EventFileManager
          event={selectedEventForFiles}
          onClose={() => {
            setShowFileManager(false);
            setSelectedEventForFiles(null);
          }}
          showNotification={showNotification}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default EventsList;