
import React, { useState, useEffect, useRef } from 'react';
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
  Paper,
  Container,
  Fade,
  Card,
  CardContent,
  Stack,
  Badge,
  useTheme,
  alpha,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Close, 
  ChevronLeft, 
  ChevronRight, 
  Today,
  Event as EventIcon,
  Schedule,
  LocationOn,
  AccessTime
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { DayCalendarSkeleton } from '@mui/x-date-pickers/DayCalendarSkeleton';
import dayjs from 'dayjs';
import axios from 'axios';
import { toast } from 'react-toastify';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', md: '80%', lg: '70%' },
  maxHeight: '95vh',
  overflowY: 'auto',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
};

const CalendarPage = () => {
  const theme = useTheme();
  const requestAbortController = useRef(null);
  const [events, setEvents] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedDays, setHighlightedDays] = useState([]);
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
    fetchHighlightedDays(currentMonth);
    
    return () => requestAbortController.current?.abort();
  }, []);

  useEffect(() => {
    updateSelectedDateEvents();
  }, [selectedDate, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/annual-services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      const filteredEvents = response.data.filter((event) => {
        const eventEndDate = new Date(event.end_date);
        return eventEndDate >= currentDate;
      });

      setEvents(filteredEvents);
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

  // ახალი ფუნქცია - ღონისძიებების მონაცემების სიმულაცია
  const fetchHighlightedDays = (date) => {
    const controller = new AbortController();
    
    // სიმულაცია - ღონისძიებების დღეების პოვნა
    const simulatedFetch = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const daysInMonth = date.daysInMonth();
        const eventDays = [];
        
        // მოვძებნოთ რეალური ღონისძიებები ამ თვეში
        events.forEach(event => {
          const eventStart = dayjs(event.start_date);
          const eventEnd = dayjs(event.end_date);
          const currentYear = date.year();
          const currentMonthNum = date.month();
          
          // შეამოწმოთ ყველა დღე ამ თვეში
          for (let day = 1; day <= daysInMonth; day++) {
            const checkDate = dayjs().year(currentYear).month(currentMonthNum).date(day);
            if (checkDate.isBetween(eventStart, eventEnd, 'day', '[]')) {
              eventDays.push(day);
            }
          }
        });
        
        resolve({ daysToHighlight: [...new Set(eventDays)] });
      }, 200);

      controller.signal.onabort = () => {
        clearTimeout(timeout);
        reject(new DOMException('aborted', 'AbortError'));
      };
    });

    simulatedFetch
      .then(({ daysToHighlight }) => {
        setHighlightedDays(daysToHighlight);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error fetching highlighted days:', error);
        }
      });

    requestAbortController.current = controller;
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'ივენთი':
        return { bg: '#1976d2', light: alpha('#1976d2', 0.1) };
      case 'გამოფენა':
        return { bg: '#d32f2f', light: alpha('#d32f2f', 0.1) };
      case 'კონფერენცია':
        return { bg: '#2e7d32', light: alpha('#2e7d32', 0.1) };
      case 'ფესტივალი':
        return { bg: '#7b1fa2', light: alpha('#7b1fa2', 0.1) };
      case 'გაქირავება':
        return { bg: '#f57f17', light: alpha('#f57f17', 0.1) };
      default:
        return { bg: '#424242', light: alpha('#424242', 0.1) };
    }
  };

  const updateSelectedDateEvents = () => {
    const dateStr = selectedDate.format('YYYY-MM-DD');
    const dayEvents = events.filter(event => {
      const eventStart = dayjs(event.start_date).format('YYYY-MM-DD');
      const eventEnd = dayjs(event.end_date).format('YYYY-MM-DD');
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
    setSelectedDateEvents(dayEvents);
  };

  const isEventDay = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return events.some(event => {
      const eventStart = dayjs(event.start_date).format('YYYY-MM-DD');
      const eventEnd = dayjs(event.end_date).format('YYYY-MM-DD');
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const getDateEvents = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return events.filter(event => {
      const eventStart = dayjs(event.start_date).format('YYYY-MM-DD');
      const eventEnd = dayjs(event.end_date).format('YYYY-MM-DD');
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const formatDisplayDate = (date) => {
    if (!date) return 'არ არის მითითებული';
    try {
      return dayjs(date).format('DD/MM/YYYY');
    } catch (error) {
      console.error('Date display formatting error:', error);
      return 'თარიღის ფორმატირების შეცდომა';
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleMonthChange = (date) => {
    if (requestAbortController.current) {
      requestAbortController.current.abort();
    }

    setCurrentMonth(date);
    setIsLoading(true);
    setHighlightedDays([]);
    fetchHighlightedDays(date);
  };

  const handlePreviousMonth = () => {
    const prevMonth = currentMonth.subtract(1, 'month');
    setCurrentMonth(prevMonth);
    handleMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = currentMonth.add(1, 'month');
    setCurrentMonth(nextMonth);
    handleMonthChange(nextMonth);
  };

  const handleToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
    handleMonthChange(today);
  };

  const handleDateClick = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    setFormData(prev => ({
      ...prev,
      start_date: dateStr,
      end_date: dateStr,
      start_time: '09:00',
      end_time: '18:00'
    }));
    setSelectedSpaces([]);
    setSelectedEvent(null);
    setOpenModal(true);
  };

  const handleEditEvent = (event) => {
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      return dayjs(dateString).format('YYYY-MM-DD');
    };

    setFormData({
      service_name: event.service_name || '',
      description: event.description || '',
      start_date: formatDateForInput(event.start_date),
      end_date: formatDateForInput(event.end_date),
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      service_type: event.service_type || 'ივენთი',
      exhibition_id: event.exhibition_id || '',
      year_selection: event.year_selection || new Date().getFullYear(),
    });

    if (event.spaces) {
      setSelectedSpaces(event.spaces.map(space => space.id));
    } else {
      setSelectedSpaces([]);
    }

    setSelectedEvent(event);
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

      await axios.delete(`/api/annual-services/${eventId}`, {
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

      if (!formData.service_name || !formData.start_date || !formData.end_date || !formData.start_time || !formData.end_time) {
        toast.error('გთხოვთ შეავსოთ ყველა სავალდებულო ველი');
        return;
      }

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

      let response;
      if (selectedEvent && selectedEvent.id) {
        response = await axios.put(`/api/annual-services/${selectedEvent.id}`, eventData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        toast.success('ღონისძიება წარმატებით განახლდა');
      } else {
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
      // განახლება კალენდრის ვიზუალისთვის
      handleMonthChange(currentMonth);
    } catch (error) {
      console.error('Error saving event:', error);
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

  // განაახლებული CustomDay კომპონენტი
  const ServerDay = (props) => {
    const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props;
    const dayEvents = getDateEvents(day);
    const hasEvents = dayEvents.length > 0;
    
    const isHighlighted = !outsideCurrentMonth && highlightedDays.indexOf(day.date()) >= 0;

    return (
      <Badge
        key={day.toString()}
        overlap="circular"
        badgeContent={isHighlighted ? '📅' : (hasEvents ? dayEvents.length : undefined)}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '10px',
            minWidth: '16px',
            height: '16px',
            backgroundColor: hasEvents ? getEventColor(dayEvents[0]?.service_type).bg : theme.palette.primary.main
          }
        }}
      >
        <PickersDay
          {...other}
          outsideCurrentMonth={outsideCurrentMonth}
          day={day}
          sx={{
            backgroundColor: hasEvents ? alpha(getEventColor(dayEvents[0]?.service_type).bg, 0.1) : 'transparent',
            border: (hasEvents || isHighlighted) ? `2px solid ${hasEvents ? getEventColor(dayEvents[0]?.service_type).bg : theme.palette.primary.main}` : 'none',
            fontWeight: (hasEvents || isHighlighted) ? 'bold' : 'normal',
            '&:hover': {
              backgroundColor: hasEvents ? alpha(getEventColor(dayEvents[0]?.service_type).bg, 0.2) : alpha(theme.palette.primary.main, 0.1)
            }
          }}
          onClick={() => handleDateClick(day)}
        />
      </Badge>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Fade in timeout={600}>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {/* Header */}
            <Box sx={{ 
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              p: 3
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  📅 კალენდარი
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenModal(true)}
                  sx={{ 
                    bgcolor: alpha('#fff', 0.2), 
                    '&:hover': { bgcolor: alpha('#fff', 0.3) },
                    borderRadius: 2
                  }}
                >
                  ახალი ღონისძიება
                </Button>
              </Box>

              {/* Color Legend */}
              <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center">
                {[
                  { type: 'ივენთი', color: '#1976d2' },
                  { type: 'გამოფენა', color: '#d32f2f' },
                  { type: 'კონფერენცია', color: '#2e7d32' },
                  { type: 'ფესტივალი', color: '#7b1fa2' },
                  { type: 'გაქირავება', color: '#f57f17' }
                ].map(({ type, color }) => (
                  <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, backgroundColor: color, borderRadius: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }}>{type}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Main Calendar Layout */}
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Calendar */}
                <Grid item xs={12} md={8}>
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    {/* Custom Calendar Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 3,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      borderRadius: 2,
                      p: 2
                    }}>
                      <IconButton 
                        onClick={handlePreviousMonth}
                        sx={{ 
                          backgroundColor: theme.palette.primary.main,
                          color: 'white',
                          '&:hover': { backgroundColor: theme.palette.primary.dark }
                        }}
                      >
                        <ChevronLeft />
                      </IconButton>
                      
                      <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        {currentMonth.format('MMMM YYYY')}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Today />}
                          onClick={handleToday}
                          sx={{ borderRadius: 2 }}
                        >
                          დღეს
                        </Button>
                        <IconButton 
                          onClick={handleNextMonth}
                          sx={{ 
                            backgroundColor: theme.palette.primary.main,
                            color: 'white',
                            '&:hover': { backgroundColor: theme.palette.primary.dark }
                          }}
                        >
                          <ChevronRight />
                        </IconButton>
                      </Box>
                    </Box>

                    <DateCalendar
                      value={selectedDate}
                      onChange={handleDateChange}
                      loading={isLoading}
                      onMonthChange={handleMonthChange}
                      renderLoading={() => <DayCalendarSkeleton />}
                      slots={{ day: ServerDay }}
                      slotProps={{
                        day: {
                          highlightedDays,
                        },
                      }}
                      sx={{
                        width: '100%',
                        '& .MuiPickersCalendarHeader-root': {
                          display: 'none' // Hide default header since we have custom one
                        },
                        '& .MuiDayCalendar-header': {
                          '& .MuiTypography-root': {
                            fontWeight: 600,
                            color: theme.palette.primary.main,
                            fontSize: '1rem'
                          }
                        },
                        '& .MuiPickersDay-root': {
                          fontSize: '1rem',
                          margin: '2px',
                          width: '40px',
                          height: '40px'
                        }
                      }}
                    />
                  </Paper>
                </Grid>

                {/* Selected Date Events */}
                <Grid item xs={12} md={4}>
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: 'fit-content' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      📅 {selectedDate.format('DD MMMM YYYY')}
                    </Typography>
                    
                    {selectedDateEvents.length > 0 ? (
                      <List>
                        {selectedDateEvents.map((event, index) => (
                          <React.Fragment key={event.id}>
                            <ListItem
                              sx={{
                                backgroundColor: getEventColor(event.service_type).light,
                                borderRadius: 2,
                                mb: 1,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: alpha(getEventColor(event.service_type).bg, 0.2) }
                              }}
                              onClick={() => {
                                setSelectedEvent(event);
                                setOpenViewModal(true);
                              }}
                            >
                              <ListItemIcon>
                                <Avatar sx={{ bgcolor: getEventColor(event.service_type).bg, width: 32, height: 32 }}>
                                  <EventIcon sx={{ fontSize: 18 }} />
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {event.service_name}
                                  </Typography>
                                }
                                secondary={
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                    <Chip 
                                      label={event.service_type} 
                                      size="small" 
                                      sx={{ 
                                        bgcolor: getEventColor(event.service_type).bg,
                                        color: 'white',
                                        fontSize: '10px'
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                                      {event.start_time} - {event.end_time}
                                    </Typography>
                                  </Stack>
                                }
                              />
                            </ListItem>
                            {index < selectedDateEvents.length - 1 && <Divider sx={{ my: 1 }} />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <EventIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          ამ დღეს ღონისძიებები არ არის დაგეგმილი
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => handleDateClick(selectedDate)}
                          sx={{ mt: 2, borderRadius: 2 }}
                        >
                          ღონისძიების დამატება
                        </Button>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Add/Edit Event Modal */}
            <Modal open={openModal} onClose={handleCloseModal}>
              <Box sx={style}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedEvent && selectedEvent.id ? '✏️ ღონისძიების რედაქტირება' : '➕ ახალი ღონისძიება'}
                  </Typography>
                  <IconButton onClick={handleCloseModal} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                    <Close />
                  </IconButton>
                </Box>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="ღონისძიების სახელი"
                        name="service_name"
                        value={formData.service_name}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
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
                        variant="outlined"
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
                          <MenuItem value="ფესტივალი">ფესტივალი</MenuItem>
                          <MenuItem value="გაქირავება">გაქირავება</MenuItem>
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
                        <Button 
                          onClick={handleCloseModal}
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        >
                          გაუქმება
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={loading}
                          sx={{ borderRadius: 2 }}
                        >
                          {selectedEvent && selectedEvent.id ? '💾 განახლება' : '💾 შენახვა'}
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
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    👁️ ღონისძიების დეტალები
                  </Typography>
                  <IconButton onClick={() => setOpenViewModal(false)}>
                    <Close />
                  </IconButton>
                </Box>

                {selectedEvent && (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: getEventColor(selectedEvent.service_type).bg }}>
                          <EventIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {selectedEvent.service_name}
                          </Typography>
                          <Chip 
                            label={selectedEvent.service_type} 
                            size="small" 
                            sx={{ 
                              bgcolor: getEventColor(selectedEvent.service_type).bg,
                              color: 'white'
                            }}
                          />
                        </Box>
                      </Box>
                      
                      {selectedEvent.description && (
                        <Typography variant="body1" color="text.secondary" paragraph>
                          {selectedEvent.description}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>

                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Schedule sx={{ color: theme.palette.primary.main }} />
                        <Typography variant="subtitle2" color="text.secondary">დაწყება:</Typography>
                      </Box>
                      <Typography variant="body1">
                        {formatDisplayDate(selectedEvent.start_date)} - {selectedEvent.start_time}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Schedule sx={{ color: theme.palette.error.main }} />
                        <Typography variant="subtitle2" color="text.secondary">დასრულება:</Typography>
                      </Box>
                      <Typography variant="body1">
                        {formatDisplayDate(selectedEvent.end_date)} - {selectedEvent.end_time}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                        <Button
                          variant="contained"
                          startIcon={<Edit />}
                          onClick={() => handleEditEvent(selectedEvent)}
                          sx={{ borderRadius: 2 }}
                        >
                          რედაქტირება
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteEvent(selectedEvent.id)}
                          disabled={loading}
                          sx={{ borderRadius: 2 }}
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
    </LocalizationProvider>
  );
};

export default CalendarPage;
