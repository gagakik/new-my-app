import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import {
  Box,
  Typography,
  Modal,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Container,
  Fade,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Close } from '@mui/icons-material';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { toast } from 'react-toastify';

const localizer = momentLocalizer(moment);

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', md: '70%', lg: '60%' },
  maxHeight: '90vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    service_name: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    service_type: 'ივენთი',
    exhibition_id: '',
    year_selection: new Date().getFullYear(),
  });
  const [exhibitions, setExhibitions] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchExhibitions();
    fetchSpaces();
    generateYears();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/annual-services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // დღის დასაწყისი

      // ფილტრავს მხოლოდ მიმდინარე და მომავალი ივენთები
      const filteredEvents = response.data.filter((event) => {
        const eventEndDate = new Date(event.end_date);
        return eventEndDate >= currentDate;
      });

      const formattedEvents = filteredEvents.map((event) => ({
        id: event.id,
        title: `${event.service_name} (${event.service_type})`,
        start: new Date(`${event.start_date}T${event.start_time || '00:00'}`),
        end: new Date(`${event.end_date}T${event.end_time || '23:59'}`),
        resource: event,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('ივენთების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const fetchExhibitions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/exhibitions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setExhibitions(response.data);
    } catch (error) {
      console.error('Error fetching exhibitions:', error);
    }
  };

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/spaces', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSpaces(response.data);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    }
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const yearsArray = [];
    for (let i = currentYear - 5; i <= currentYear + 10; i++) {
      yearsArray.push(i);
    }
    setYears(yearsArray);
  };

  // Format date for display without timezone conversion
  const formatDisplayDate = (date) => {
    if (!date) return 'არ არის მითითებული';

    try {
      let dateString = date;

      // Convert to YYYY-MM-DD format first
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateString = `${year}-${month}-${day}`;
      } else if (typeof date === 'string' && date.includes('T')) {
        dateString = date.split('T')[0];
      }

      // Format to DD/MM/YYYY
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }

      return dateString;
    } catch (error) {
      console.error('Date display formatting error:', error);
      return 'თარიღის ფორმატირების შეცდომა';
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setOpenViewModal(true);
  };

  const handleEditEvent = (event) => {
    const eventData = event.resource;

    // თარიღების სწორი ფორმატირება UTC-დან
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';

      // თუ ISO string-ია (UTC ფორმატი)
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const utcDate = new Date(dateString);
        const year = utcDate.getUTCFullYear();
        const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // თუ უკვე სწორი ფორმატშია
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }

      return dateString;
    };

    setFormData({
      service_name: eventData.service_name || '',
      description: eventData.description || '',
      start_date: formatDateForInput(eventData.start_date),
      end_date: formatDateForInput(eventData.end_date),
      start_time: eventData.start_time || '',
      end_time: eventData.end_time || '',
      service_type: eventData.service_type || 'ივენთი',
      exhibition_id: eventData.exhibition_id || '',
      year_selection: eventData.year_selection || new Date().getFullYear(),
    });

    // ასევე ვამატებთ spaces ინფორმაციას რედაქტირებისთვის
    if (eventData.spaces) {
      setSelectedSpaces(eventData.spaces.map(space => space.id));
    } else {
      setSelectedSpaces([]);
    }

    setSelectedEvent(eventData);
    setOpenViewModal(false);
    setOpenModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ ღონისძიების წაშლა?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.delete(`/api/annual-services/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('ღონისძიება წარმატებით წაიშალა');
      setOpenViewModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('ღონისძიების წაშლა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = ({ start, end }) => {
    const startDate = moment(start).format('YYYY-MM-DD');
    const endDate = moment(end).format('YYYY-MM-DD');

    // თუ ერთი და იგივე დღეა, მაშინ ვამატებთ დროსაც
    let startTime = '09:00';
    let endTime = '18:00';

    if (moment(start).format('YYYY-MM-DD') === moment(end).format('YYYY-MM-DD')) {
      startTime = moment(start).format('HH:mm');
      endTime = moment(end).format('HH:mm');
    }

    setFormData({
      service_name: '',
      description: '',
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      service_type: 'ივენთი',
      exhibition_id: '',
      year_selection: new Date().getFullYear(),
    });
    setSelectedSpaces([]);
    setSelectedEvent(null);
    setOpenModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Validate required fields
      if (!formData.service_name || !formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) {
        toast.error('გთხოვთ შეავსოთ ყველა სავალდებულო ველი');
        return;
      }

      // Validate date and time logic
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      if (endDateTime <= startDateTime) {
        toast.error('დასრულების დრო უნდა იყოს დაწყების დროზე გვიან');
        return;
      }

      const eventData = {
        service_name: formData.service_name,
        description: formData.description || '',
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        service_type: formData.service_type || 'ივენთი',
        year_selection: formData.year_selection || new Date().getFullYear(),
        exhibition_id: formData.exhibition_id || null,
        is_active: true,
        selected_spaces: selectedSpaces || []
      };

      console.log('Sending event data:', eventData);

      let response;
      if (selectedEvent && selectedEvent.id) {
        // რედაქტირება
        response = await axios.put(`/api/annual-services/${selectedEvent.id}`, eventData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        toast.success('ღონისძიება წარმატებით განახლდა');
      } else {
        // ახალი შექმნა
        response = await axios.post('/api/annual-services', eventData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        toast.success('ღონისძიება წარმატებით შეიქმნა');
      }

      setOpenModal(false);
      fetchEvents();
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'ღონისძიების შენახვა ვერ მოხერხდა';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      description: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      service_type: 'ივენთი',
      exhibition_id: '',
      year_selection: new Date().getFullYear(),
    });
    setSelectedSpaces([]);
    setSelectedEvent(null);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    resetForm();
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    const eventType = event.resource?.service_type || 'ივენთი';
    
    // Different colors for different event types
    const getEventColor = (type) => {
      switch (type) {
        case 'ივენთი':
          return '#3174ad'; // Blue
        case 'გამოფენა':
          return '#ad5131'; // Red/Orange
        case 'კონფერენცია':
          return '#2e7d32'; // Green
        case 'ფესტივალი':
          return '#7b1fa2'; // Purple
        case 'გაქირავება':
          return '#f57f17'; // Amber
        default:
          return '#424242'; // Grey
      }
    };

    const backgroundColor = getEventColor(eventType);

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        fontWeight: '500',
        padding: '2px 4px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    };
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Fade in timeout={600}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
              📅 კალენდარი
            </Typography>
            
            {/* Color Legend */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: '#3174ad', borderRadius: 1 }} />
                <Typography variant="caption">ივენთი</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: '#ad5131', borderRadius: 1 }} />
                <Typography variant="caption">გამოფენა</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: '#2e7d32', borderRadius: 1 }} />
                <Typography variant="caption">კონფერენცია</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: '#7b1fa2', borderRadius: 1 }} />
                <Typography variant="caption">ფესტივალი</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 16, height: 16, backgroundColor: '#f57f17', borderRadius: 1 }} />
                <Typography variant="caption">გაქირავება</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ height: 600, mt: 3 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              eventPropGetter={eventStyleGetter}
              messages={{
                next: "შემდეგი",
                previous: "წინა",
                today: "დღეს",
                month: "თვე",
                week: "კვირა",
                day: "დღე",
                agenda: "დღის წესრიგი",
                date: "თარიღი",
                time: "დრო",
                event: "ღონისძიება",
                noEventsInRange: "ამ პერიოდში ღონისძიებები არ არის",
                showMore: total => `+ კიდევ ${total}`
              }}
            />
          </Box>

          {/* Add Event Modal */}
          <Modal open={openModal} onClose={handleCloseModal}>
            <Box sx={style}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  {selectedEvent && selectedEvent.id ? 'ღონისძიების რედაქტირება' : 'ახალი ღონისძიება'}
                </Typography>
                <IconButton onClick={handleCloseModal}>
                  <Close />
                </IconButton>
              </Box>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ღონისძიების სახელი"
                      name="service_name"
                      value={formData.service_name}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="აღწერა"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      multiline
                      rows={3}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="დაწყების თარიღი"
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="დასრულების თარიღი"
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="დაწყების დრო"
                      name="start_time"
                      type="time"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="დასრულების დრო"
                      name="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>ღონისძიების ტიპი</InputLabel>
                      <Select
                        name="service_type"
                        value={formData.service_type}
                        onChange={handleInputChange}
                        label="ღონისძიების ტიპი"
                      >
                        <MenuItem value="ივენთი">ივენთი</MenuItem>
                        <MenuItem value="გამოფენა">გამოფენა</MenuItem>
                        <MenuItem value="კონფერენცია">კონფერენცია</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>წელი</InputLabel>
                      <Select
                        name="year_selection"
                        value={formData.year_selection}
                        onChange={handleInputChange}
                        label="წელი"
                      >
                        {years.map(year => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                      <Button onClick={handleCloseModal}>
                        გაუქმება
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                      >
                        {selectedEvent && selectedEvent.id ? 'განახლება' : 'შენახვა'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Box>
          </Modal>

          {/* View Event Modal */}
          <Modal open={openViewModal} onClose={() => setOpenViewModal(false)}>
            <Box sx={style}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">ღონისძიების დეტალები</Typography>
                <IconButton onClick={() => setOpenViewModal(false)}>
                  <Close />
                </IconButton>
              </Box>

              {selectedEvent && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>{selectedEvent.service_name}</Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {selectedEvent.description}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">დაწყების თარიღი:</Typography>
                    <Typography variant="body1">{formatDisplayDate(selectedEvent.start_date)}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">დასრულების თარიღი:</Typography>
                    <Typography variant="body1">{formatDisplayDate(selectedEvent.end_date)}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">დაწყების დრო:</Typography>
                    <Typography variant="body1">{selectedEvent.start_time}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">დასრულების დრო:</Typography>
                    <Typography variant="body1">{selectedEvent.end_time}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">ტიპი:</Typography>
                    <Chip label={selectedEvent.service_type} size="small" />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">წელი:</Typography>
                    <Typography variant="body1">{selectedEvent.year_selection}</Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                      <Button
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => handleEditEvent({ resource: selectedEvent })}
                        sx={{ backgroundColor: '#1976d2' }}
                      >
                        რედაქტირება
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<Delete />}
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                        sx={{ backgroundColor: '#d32f2f' }}
                        disabled={loading}
                      >
                        წაშლა
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Modal>
        </Paper>
      </Fade>
    </Container>
  );
};

export default CalendarPage;