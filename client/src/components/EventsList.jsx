import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  People as PeopleIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  EventNote as EventNoteIcon
} from '@mui/icons-material';
import EventForm from './EventForm';
import EventParticipants from './EventParticipants';
import EventCompletion from './EventCompletion';
import EventFileManager from './EventFileManager';

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

  // ფილტრების სტეიტები
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [sortDirection, setSortDirection] = useState('desc');

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

      const response = await fetch('/api/annual-services', { headers });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }
        throw new Error(`სერვერის შეცდომა: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
      showNotification(`შეცდომა ივენთების ჩატვირთვისას: ${err.message}`, 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

    if (showArchivedOnly) {
      filtered = filtered.filter(event => event.is_archived);
    } else {
      filtered = filtered.filter(event => !event.is_archived);
    }

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedYear) {
      filtered = filtered.filter(event => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear.toString() === selectedYear;
      });
    }

    if (selectedMonth) {
      filtered = filtered.filter(event => {
        const eventMonth = new Date(event.start_date).getMonth() + 1;
        return eventMonth.toString() === selectedMonth;
      });
    }

    if (statusFilter) {
      filtered = filtered.filter(event => {
        const status = getStatusBadge(event);
        return status.class === statusFilter;
      });
    }

    if (sortDirection === 'desc') {
      filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    } else {
      filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedYear, selectedMonth, statusFilter, showArchivedOnly, sortDirection]);

  const getAvailableYears = () => {
    const years = events.map(event => new Date(event.start_date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };

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
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showNotification('ივენთი წარმატებით წაიშალა!', 'success');
        fetchEvents();
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleArchive = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივში გადატანა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${id}/archive`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
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

  const handleRestore = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივიდან აღდგენა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${id}/restore`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
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

  const handleEventUpdated = () => {
    setEditingId(null);
    fetchEvents();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
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

    if (event.is_archived) return { text: 'არქივი', class: 'archived', color: 'default' };
    if (!event.is_active) return { text: 'არააქტიური', class: 'inactive', color: 'error' };
    if (now < startDate) return { text: 'მომავალი', class: 'upcoming', color: 'info' };
    if (now > endDate) return { text: 'დასრულებული', class: 'finished', color: 'success' };
    return { text: 'მიმდინარე', class: 'active', color: 'warning' };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">შეცდომა: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventNoteIcon fontSize="large" />
          {showArchivedOnly ? 'არქივი' : 'ივენთები'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showArchivedOnly}
                onChange={() => setShowArchivedOnly(!showArchivedOnly)}
              />
            }
            label={showArchivedOnly ? 'აქტიური ივენთები' : 'არქივი'}
          />

          {isAuthorizedForManagement && !showArchivedOnly && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEditingId(0)}
              size="large"
            >
              ივენთის დამატება
            </Button>
          )}
        </Box>
      </Box>

      {/* Event Form Modal */}
      {editingId !== null && isAuthorizedForManagement && (
        <EventForm
          isOpen={editingId !== null}
          onClose={() => setEditingId(null)}
          onSubmit={async (formData) => {
            try {
              const token = localStorage.getItem('token');
              const method = editingId === 0 ? 'POST' : 'PUT';
              const url = editingId === 0 ? '/api/annual-services' : `/api/annual-services/${editingId}`;

              const submitData = {
                service_name: formData.service_name,
                exhibition_id: formData.exhibition_id || null,
                start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
                end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
                start_time: formData.start_time ? formData.start_time.toTimeString().split(' ')[0].substring(0, 5) : null,
                end_time: formData.end_time ? formData.end_time.toTimeString().split(' ')[0].substring(0, 5) : null
              };

              const response = await fetch(url, {
                method,
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(submitData)
              });

              if (response.ok) {
                const result = await response.json();
                showNotification(result.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
                fetchEvents();
                setEditingId(null);
              } else {
                const error = await response.json();
                showNotification(error.message || 'შეცდომა მონაცემების შენახვისას', 'error');
              }
            } catch (error) {
              showNotification('შეცდომა სერვერთან კავშირისას', 'error');
            }
          }}
          editingEvent={editingId !== 0 ? events.find(e => e.id === editingId) : null}
          exhibitions={[]}
        />
      )}


      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ფილტრები და ძიება
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="ძიება"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ძიება სახელით..."
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>წელი</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="წელი"
              >
                <MenuItem value="">ყველა წელი</MenuItem>
                {getAvailableYears().map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>თვე</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="თვე"
              >
                <MenuItem value="">ყველა თვე</MenuItem>
                {months.map(month => (
                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>სტატუსი</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="სტატუსი"
              >
                <MenuItem value="">ყველა სტატუსი</MenuItem>
                <MenuItem value="upcoming">მომავალი</MenuItem>
                <MenuItem value="active">მიმდინარე</MenuItem>
                <MenuItem value="finished">დასრულებული</MenuItem>
                <MenuItem value="archived">არქივი</MenuItem>
                <MenuItem value="inactive">არააქტიური</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<ClearIcon />}
                size="small"
              >
                გასუფთავება
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                startIcon={<SortIcon />}
                size="small"
              >
                {sortDirection === 'desc' ? 'ახალი→ძველი' : 'ძველი→ახალი'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          ნაპოვნია: {filteredEvents.length} {showArchivedOnly ? 'არქივული' : 'აქტიური'} ივენთი
        </Typography>
      </Paper>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {showArchivedOnly
              ? 'არქივში ივენთები არ მოიძებნა.'
              : (events.length === 0 ? 'ივენთები არ მოიძებნა.' : 'ფილტრების შესაბამისი ივენთები არ მოიძებნა.')}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredEvents.map((event) => {
            const status = getStatusBadge(event);
            return (
              <Grid item xs={12} md={6} lg={4} key={event.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ cursor: 'pointer', color: 'primary.main' }}
                        onClick={() => viewEventDetails(event)}
                      >
                        {event.service_name}
                      </Typography>
                      <Chip
                        label={status.text}
                        color={status.color}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {event.description}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>დაწყება:</strong> {formatDateTime(event.start_date, event.start_time)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>დასრულება:</strong> {formatDateTime(event.end_date, event.end_time)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>ტიპი:</strong> {event.service_type}
                      </Typography>
                      <Typography variant="body2">
                        <strong>სივრცეები:</strong> {event.spaces_count || 0}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box>
                      <Tooltip title="მონაწილეები">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowParticipants(true);
                          }}
                        >
                          <PeopleIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="ფაილები">
                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedEventForFiles(event);
                            setShowFileManager(true);
                          }}
                        >
                          <FolderIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {isAuthorizedForManagement && (
                      <Box>
                        {!showArchivedOnly && (
                          <Tooltip title="რედაქტირება">
                            <IconButton
                              color="primary"
                              onClick={() => setEditingId(event.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        {status.class === 'finished' && !event.is_archived && (
                          <>
                            <Tooltip title="დასრულება">
                              <IconButton
                                color="success"
                                onClick={() => {
                                  setSelectedEventForCompletion(event);
                                  setShowEventCompletion(true);
                                }}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="არქივში გადატანა">
                              <IconButton
                                color="warning"
                                onClick={() => handleArchive(event.id)}
                              >
                                <ArchiveIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {showArchivedOnly && event.is_archived && (
                          <Tooltip title="არქივიდან აღდგენა">
                            <IconButton
                              color="info"
                              onClick={() => handleRestore(event.id)}
                            >
                              <RestoreIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        {isAuthorizedForDeletion && (
                          <Tooltip title="წაშლა">
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(event.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Event Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEvent?.service_name}
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ pt: 1 }}>
              <Typography paragraph>
                <strong>აღწერა:</strong> {selectedEvent.description}
              </Typography>
              <Typography paragraph>
                <strong>წელი:</strong> {selectedEvent.year_selection}
              </Typography>
              <Typography paragraph>
                <strong>ტიპი:</strong> {selectedEvent.service_type}
              </Typography>
              <Typography paragraph>
                <strong>თარიღები:</strong> {formatDateTime(selectedEvent.start_date, selectedEvent.start_time)} - {formatDateTime(selectedEvent.end_date, selectedEvent.end_time)}
              </Typography>

              {selectedEvent.spaces && selectedEvent.spaces.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    გამოყენებული სივრცეები:
                  </Typography>
                  {selectedEvent.spaces.map(space => (
                    <Chip
                      key={space.id}
                      label={`${space.building_name} - ${space.category}${space.area_sqm ? ` (${space.area_sqm} მ²)` : ''}`}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}

              {selectedEvent.bookings && selectedEvent.bookings.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    მონაწილე კომპანიები ({selectedEvent.bookings.length}):
                  </Typography>
                  {selectedEvent.bookings.map(booking => (
                    <Chip
                      key={booking.id}
                      label={`${booking.company_name} - ${booking.status}`}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            დახურვა
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Participants Modal */}
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

      {/* Event Completion Modal */}
      {showEventCompletion && selectedEventForCompletion && (
        <EventCompletion
          eventId={selectedEventForCompletion.id}
          eventName={selectedEventForCompletion.service_name}
          onClose={() => {
            setShowEventCompletion(false);
            setSelectedEventForCompletion(null);
          }}
          onSuccess={() => {
            showNotification('ივენთი წარმატებით დასრულდა!', 'success');
            fetchEvents();
          }}
        />
      )}

      {/* Event File Manager Modal */}
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
    </Container>
  );
};

export default EventsList;