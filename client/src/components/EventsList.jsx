import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Container,
  Divider,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Stack,
  Badge
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Archive,
  Restore,
  Group,
  FolderOpen,
  CheckCircle,
  Search,
  Clear,
  Sort,
  Event as EventIcon,
  Business,
  LocationOn,
  CalendarToday,
  Assessment,
  Close
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

  // ფილტრებისა და ძიების სტეიტები
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

      console.log('Fetching events from /api/annual-services');
      const response = await fetch('/api/annual-services', { headers });

      if (!response.ok) {
        console.error('Events API failed with status:', response.status);

        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }

        if (response.status === 500) {
          console.log('Server error, trying fallback to annual-services');
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

  useEffect(() => {
    if (!showArchivedOnly) {
      // შეგვიძლია აქ დავამატოთ კონკრეტული ფილტრების გასუფთავება
    }
  }, [showArchivedOnly]);

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
        fetchEvents();
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
    fetchEvents();
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">შეცდომა: {error}</Alert>
      </Container>
    );
  }

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

    // არქივი ყველაზე მაღალი პრიორიტეტის სტატუსია
    if (event.is_archived) {
      return { text: 'არქივი', class: 'archived', color: 'default' };
    }

    // არააქტიური ივენთი
    if (event.is_active === false || event.is_active === 0) {
      return { text: 'არააქტიური', class: 'inactive', color: 'error' };
    }

    // თარიღების შემოწმება
    if (now < startDate) {
      return { text: 'მომავალი', class: 'upcoming', color: 'info' };
    }

    if (now > endDate) {
      return { text: 'დასრულებული', class: 'finished', color: 'success' };
    }

    // თუ დღეს არის დაწყების და დასასრულის შორის
    return { text: 'მიმდინარე', class: 'active', color: 'warning' };
  };

  const toggleSortDirection = () => {
    setSortDirection(prevDirection => (prevDirection === 'desc' ? 'asc' : 'desc'));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <EventIcon sx={{ color: '#667eea' }} />
            {showArchivedOnly ? 'არქივი' : 'ივენთები'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showArchivedOnly}
                  onChange={(e) => setShowArchivedOnly(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#667eea'
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#667eea'
                    }
                  }}
                />
              }
              label={showArchivedOnly ? 'აქტიური ივენთების ნახვა' : 'არქივის ნახვა'}
            />

            {isAuthorizedForManagement && !showArchivedOnly && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setEditingId(0)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  px: 3,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                  }
                }}
              >
                ივენთის დამატება
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {editingId !== null && isAuthorizedForManagement && (
         <EventForm
            eventToEdit={events.find(e => e.id === editingId)}
            onEventUpdated={handleEventUpdated}
            showNotification={showNotification}
         />
      )}

      {/* Filters Section */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          border: '1px solid rgba(102, 126, 234, 0.1)'
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search sx={{ color: '#667eea' }} />
          ძიება და ფილტრაცია
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="ძიება"
              placeholder="ძიება სახელით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>წელი</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="წელი"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">ყველა წელი</MenuItem>
                {getAvailableYears().map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>თვე</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="თვე"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">ყველა თვე</MenuItem>
                {months.map(month => (
                  <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>სტატუსი</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="სტატუსი"
                sx={{ borderRadius: 2 }}
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
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={clearFilters}
                sx={{
                  borderRadius: 2,
                  borderColor: '#6c757d',
                  color: '#6c757d',
                  '&:hover': {
                    borderColor: '#5a6268',
                    backgroundColor: 'rgba(108, 117, 125, 0.04)'
                  }
                }}
              >
                გასუფთავება
              </Button>
              <Button
                variant="outlined"
                startIcon={<Sort />}
                onClick={toggleSortDirection}
                sx={{
                  borderRadius: 2,
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5a6fd8',
                    backgroundColor: 'rgba(102, 126, 234, 0.04)'
                  }
                }}
              >
                {sortDirection === 'desc' ? 'ახალი → ძველი' : 'ძველი → ახალი'}
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            backgroundColor: '#e3f2fd',
            border: '1px solid #90caf9'
          }}
        >
          <Typography variant="body2">
            <strong>ნაპოვნია:</strong> {filteredEvents.length} {showArchivedOnly ? 'არქივული' : 'აქტიური'} ივენთი
          </Typography>
        </Alert>
      </Paper>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={event.id}>
                <Card
                elevation={3}
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                  },
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                }}
              >
                <CardContent sx={{ pb: 2 }}>
                  {/* Event Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#667eea',
                        '&:hover': {
                          textDecoration: 'underline'
                        },
                        flex: 1,
                        mr: 1,
                        lineHeight: 1.3
                      }}
                      onClick={() => viewEventDetails(event)}
                    >
                      {event.service_name}
                    </Typography>
                    <Chip
                      label={status.text}
                      color={status.color}
                      size="small"
                      sx={{ borderRadius: 2, fontWeight: 500 }}
                    />
                  </Box>

                  {/* Event Details */}
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>დაწყება:</strong> {formatDateTime(event.start_date, event.start_time)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>დასრულება:</strong> {formatDateTime(event.end_date, event.end_time)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>სივრცეები:</strong> {event.spaces_count || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        <strong>ტიპი:</strong> {event.service_type}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>

                {/* Action Buttons */}
                <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="მონაწილეები">
                      <IconButton
                        size="small"
                        onClick={() => handleShowParticipants(event)}
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        <Group fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="ფაილების მართვა">
                      <IconButton
                        size="small"
                        onClick={() => handleShowFiles(event)}
                        sx={{
                          color: '#17a2b8',
                          '&:hover': {
                            backgroundColor: 'rgba(23, 162, 184, 0.1)'
                          }
                        }}
                      >
                        <FolderOpen fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>

                  {isAuthorizedForManagement && (
                      <>
                        {!showArchivedOnly && (
                          <Tooltip title="რედაქტირება">
                            <IconButton
                              size="small"
                              onClick={() => handleEditClick(event)}
                              sx={{
                                color: '#28a745',
                                '&:hover': {
                                  backgroundColor: 'rgba(40, 167, 69, 0.1)'
                                }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {status.class === 'finished' && !event.is_archived && (
                          <>
                            <Tooltip title="ივენთის დასრულება">
                              <IconButton
                                size="small"
                                onClick={() => handleCompleteEvent(event)}
                                sx={{
                                  color: '#17a2b8',
                                  '&:hover': {
                                    backgroundColor: 'rgba(23, 162, 184, 0.1)'
                                  }
                                }}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="არქივში გადატანა">
                              <IconButton
                                size="small"
                                onClick={() => handleArchive(event.id)}
                                sx={{
                                  color: '#6c757d',
                                  '&:hover': {
                                    backgroundColor: 'rgba(108, 117, 125, 0.1)'
                                  }
                                }}
                              >
                                <Archive fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {showArchivedOnly && event.is_archived && (
                          <Tooltip title="არქივიდან აღდგენა">
                            <IconButton
                              size="small"
                              onClick={() => handleRestore(event.id)}
                              sx={{
                                color: '#28a745',
                                '&:hover': {
                                  backgroundColor: 'rgba(40, 167, 69, 0.1)'
                                }
                              }}
                            >
                              <Restore fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {isAuthorizedForDeletion && (
                          <Tooltip title="წაშლა">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(event.id)}
                              sx={{
                                color: '#dc3545',
                                '&:hover': {
                                  backgroundColor: 'rgba(220, 53, 69, 0.1)'
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      )}

      {/* Event Details Modal */}
      {showDetails && selectedEvent && (
        <Dialog
          open={showDetails}
          onClose={() => setShowDetails(false)}
          maxWidth="md"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 3,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)'
            }
          }}
        >
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg, #667ee 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon />
              {selectedEvent.service_name}
            </Box>
            <IconButton
              onClick={() => setShowDetails(false)}
              sx={{ color: 'white' }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1 }}>აღწერა</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedEvent.description}</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">წელი</Typography>
                <Typography variant="body1">{selectedEvent.year_selection}</Typography>
              </Grid>

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">ტიპი</Typography>
                <Typography variant="body1">{selectedEvent.service_type}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">თარიღები</Typography>
                <Typography variant="body1">
                  {formatDateTime(selectedEvent.start_date, selectedEvent.start_time)} - {formatDateTime(selectedEvent.end_date, selectedEvent.end_time)}
                </Typography>
              </Grid>

              {selectedEvent.spaces && selectedEvent.spaces.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>გამოყენებული სივრცეები</Typography>
                  <Stack spacing={1}>
                    {selectedEvent.spaces.map(space => (
                      <Paper key={space.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1">
                          {space.building_name} - {space.category}
                          {space.area_sqm && ` (${space.area_sqm} მ²)`}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Grid>
              )}

              {selectedEvent.bookings && selectedEvent.bookings.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>მონაწილე კომპანიები ({selectedEvent.bookings.length})</Typography>
                  <Stack spacing={1}>
                    {selectedEvent.bookings.map(booking => (
                      <Paper key={booking.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1">
                          {booking.company_name} - <Chip label={booking.status} size="small" />
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        </Dialog>
      )}

      {/* Participants Modal */}
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
          eventName={selectedEventForCompletion.name}
          onClose={() => {
            setShowEventCompletion(false);
            setSelectedEventForCompletion(null);
          }}
          onSuccess={handleCompletionSuccess}
        />
      )}

      {/* File Manager Modal */}
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