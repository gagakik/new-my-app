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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
  EventNote as EventNoteIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import EventForm from './EventForm';
import EventParticipants from './EventParticipants';
import EventCompletion from './EventCompletion';
import EventFileManager from './EventFileManager';
import { servicesAPI } from '../services/api';
import api from '../services/api';

const EventsList = ({ showNotification, userRole }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
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
      setLoading(true);
      const data = await servicesAPI.getAll();
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

  const fetchExhibitions = useCallback(async () => {
    try {
      const response = await servicesAPI.getExhibitions();
      setExhibitions(response || []);
    } catch (err) {
      console.error('გამოფენების ჩატვირთვის შეცდომა:', err);
      showNotification('გამოფენების ჩატვირთვა ვერ მოხერხდა', 'error');
    }
  }, [showNotification]);

  useEffect(() => {
    fetchEvents();
    fetchExhibitions();
  }, [fetchEvents, fetchExhibitions]);

  // ფილტრაციის და სორტირების ერთიანი ლოგიკა
  useEffect(() => {
    let filtered = [...events];

    // არქივის ფილტრი
    if (showArchivedOnly) {
      filtered = filtered.filter(event => event.is_archived);
    } else {
      filtered = filtered.filter(event => !event.is_archived);
    }

    // ძიების ფილტრი
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(event =>
        event.service_name?.toLowerCase().includes(search) ||
        event.description?.toLowerCase().includes(search) ||
        event.service_type?.toLowerCase().includes(search)
      );
    }

    // წლის ფილტრი
    if (selectedYear) {
      filtered = filtered.filter(event => {
        const eventYear = new Date(event.start_date).getFullYear();
        return eventYear.toString() === selectedYear;
      });
    }

    // თვის ფილტრი
    if (selectedMonth) {
      filtered = filtered.filter(event => {
        const eventMonth = new Date(event.start_date).getMonth() + 1;
        return eventMonth.toString() === selectedMonth;
      });
    }

    // სტატუსის ფილტრი
    if (statusFilter) {
      filtered = filtered.filter(event => {
        const status = getStatusBadge(event);
        return status.class === statusFilter;
      });
    }

    // სორტირება
    filtered.sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);

      if (sortDirection === 'desc') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

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
    // არ ვასუფთავებთ showArchivedOnly და sortDirection-ს
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის წაშლა?');
    if (!isConfirmed) return;

    try {
      await servicesAPI.delete(id);
      showNotification('ივენთი წარმატებით წაიშალა!', 'success');
      fetchEvents();
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleArchive = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივში გადატანა?');
    if (!isConfirmed) return;

    try {
      await servicesAPI.archive(id);
      showNotification('ივენთი წარმატებით არქივში გადაიტანა!', 'success');
      fetchEvents();
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleRestore = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ივენთის არქივიდან აღდგენა?');
    if (!isConfirmed) return;

    try {
      const response = await servicesAPI.restoreEvent(id);

      if (response.ok) {
        showNotification('ივენთი წარმატებით აღდგა არქივიდან!', 'success');
        fetchEvents();
      } else {
        const errorData = await response.json();
        showNotification(`არქივიდან აღდგენა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('დაფიქსირდა შეცდომა სერvერთან კავშირისას.', 'error');
    }
  };

  const viewEventDetails = async (event) => {
    try {
      const details = await servicesAPI.getDetails(event.id);
      setSelectedEvent(details);
      setShowDetails(true);
    } catch (error) {
      showNotification('შეცდომა ივენთის დეტალების ჩატვირთვისას', 'error');
    }
  };

  const handleEventUpdated = () => {
    setEditingId(null);
    fetchEvents();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
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

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/import/companies/template', {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'companies-template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('შაბლონი ჩამოიტვირთა', 'success');
    } catch (error) {
      showNotification(`შეცდომა: ${error.response?.data?.message || error.message}`, 'error');
    }
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

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadTemplate}
            size="large"
            sx={{ backgroundColor: '#2196F3' }} // Example blue color
          >
            შაბლონის გადმოწერა
          </Button>
        </Box>
      </Box>

      {/* Event Form Modal */}
      {editingId !== null && isAuthorizedForManagement && (
        <EventForm
          isOpen={editingId !== null}
          onClose={() => setEditingId(null)}
          onSubmit={async (formData) => {
            try {
              const submitData = {
                service_name: formData.service_name,
                exhibition_id: formData.exhibition_id || null,
                start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
                end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null,
                start_time: formData.start_time ? formData.start_time.toTimeString().split(' ')[0].substring(0, 5) : null,
                end_time: formData.end_time ? formData.end_time.toTimeString().split(' ')[0].substring(0, 5) : null
              };

              if (editingId === 0) {
                await servicesAPI.create(submitData);
                showNotification('ივენთი წარმატებით შეიქმნა!', 'success');
              } else {
                await servicesAPI.update(editingId, submitData);
                showNotification('ივენთი წარმატებით განახლდა!', 'success');
              }

              fetchEvents();
              setEditingId(null);
            } catch (error) {
              console.error('Error submitting event:', error);
              showNotification(`შეცდომა: ${error.response?.data?.message || error.message}`, 'error');
            }
          }}
          editingEvent={editingId !== 0 ? events.find(e => e.id === editingId) : null}
          exhibitions={exhibitions}
        />
      )}


      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ფილტრები და ძიება
        </Typography>

        <div className="filters-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          <TextField
            fullWidth
            label="ძიება"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ძიება სახელით..."
            size="small"
          />

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

          <FormControl fullWidth size="small" sx={{ minWidth: 150 }}>
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

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
              size="small"
              sx={{ color: 'white' }}
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
        </div>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          ნაპოვნია: {filteredEvents.length} {showArchivedOnly ? 'არქივული' : 'აქტიური'} ივენთი
        </Typography>
      </Paper>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {showArchivedOnly
              ? 'არქივში ივენთები არ მოიძებნა.'
              : (events.length === 0 ? 'ივენთები არ მოიძებნა.' : 'ფილტრების შესაბამისი ივენთები არ მოიძებნა.')}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>ივენთის სახელი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>დაწყება</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>დასრულება</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>ტიპი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>სივრცეები</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>სტატუსი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white', textAlign: 'center' }}>მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.map((event) => {
                const status = getStatusBadge(event);
                return (
                  <TableRow
                    key={event.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:nth-of-type(odd)': { bgcolor: 'action.selected' }
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 'medium',
                            cursor: 'pointer',
                            color: 'primary.main',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => viewEventDetails(event)}
                        >
                          {event.service_name}
                        </Typography>
                        {event.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.8rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {event.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(event.start_date, event.start_time)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(event.end_date, event.end_time)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {event.service_type}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography variant="body2">
                        {event.spaces_count || 0}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip
                        label={status.text}
                        color={status.color}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Tooltip title="მონაწილეები">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowParticipants(true);
                            }}
                          >
                            <PeopleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="ფაილები">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedEventForFiles(event);
                              setShowFileManager(true);
                            }}
                          >
                            <FolderIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {isAuthorizedForManagement && (
                          <>
                            {!showArchivedOnly && (
                              <Tooltip title="რედაქტირება">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => setEditingId(event.id)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {status.class === 'finished' && !event.is_archived && (
                              <>
                                <Tooltip title="დასრულება">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedEventForCompletion(event);
                                      setShowEventCompletion(true);
                                    }}
                                  >
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="არქივში გადატანა">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleArchive(event.id)}
                                  >
                                    <ArchiveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            {showArchivedOnly && event.is_archived && (
                              <Tooltip title="არქივიდან აღდგენა">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleRestore(event.id)}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {isAuthorizedForDeletion && (
                              <Tooltip title="წაშლა">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(event.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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