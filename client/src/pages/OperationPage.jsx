import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Badge
} from '@mui/material';
import {
  Business,
  Phone,
  Email,
  Straighten,
  Add,
  Edit,
  Delete,
  CloudUpload,
  Image,
  Description,
  Construction,
  CheckCircle,
  Warning,
  Info,
  Assignment,
  Event as EventIcon,
  CalendarToday,
  LocationOn,
  ArrowBack,
  Image as ImageIcon
} from '@mui/icons-material';

const OperationPage = ({ showNotification }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stands, setStands] = useState([]);
  const [selectedStand, setSelectedStand] = useState(null);

  const processImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `http://localhost:5173${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  };
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showStandForm, setShowStandForm] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showDesignDialog, setShowDesignDialog] = useState(false);
  const [allEquipment, setAllEquipment] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [contactPersons, setContactPersons] = useState([]);
  const [formData, setFormData] = useState({
    booth_number: '',
    company_name: '',
    company_id: '',
    area: '',
    booth_type: 'რიგითი',
    booth_category: 'ოქტანორმის სტენდები',
    price_per_sqm: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    status: 'დაგეგმილი',
    notes: ''
  });
  const [equipmentData, setEquipmentData] = useState({
    equipment_id: '',
    quantity: 1,
    notes: ''
  });
  const [designFiles, setDesignFiles] = useState([]);
  const [designDescription, setDesignDescription] = useState('');
  const [error, setError] = useState(null);

  const standStatuses = [
    { value: 'დაგეგმილი', color: '#2196f3', icon: <Assignment /> },
    { value: 'დიზაინის ეტაპი', color: '#ff9800', icon: <Description /> },
    { value: 'მშენებლობა დაწყებული', color: '#9c27b0', icon: <Construction /> },
    { value: 'მშენებლობა მიმდინარეობს', color: '#3f51b5', icon: <Construction /> },
    { value: 'დასრულებული', color: '#4caf50', icon: <CheckCircle /> },
    { value: 'ჩაბარებული', color: '#8bc34a', icon: <CheckCircle /> },
    { value: 'გადაუდებელი ყურადღება', color: '#f44336', icon: <Warning /> }
  ];

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/annual-services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // ფილტრავთ მხოლოდ აქტიური და მომავალი ივენთები
        const now = new Date();
        const activeAndUpcomingEvents = data.filter(event => {
          const endDate = new Date(event.end_date);
          return !event.is_archived && endDate >= now;
        });
        setEvents(activeAndUpcomingEvents);
      } else {
        setError('ივენთების ჩატვირთვის შეცდომა');
        showNotification('ივენთების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (_error) {
      console.error('Error fetching events:', _error);
      setError('სერვერთან კავშირის შეცდომა');
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);


  const fetchStands = useCallback(async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStands(data);
        if (data.length > 0) {
          setSelectedStand(data[0]);
        } else {
          setSelectedStand(null);
        }
      } else {
        showNotification('სტენდების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (_error) {
      console.error('Error fetching stands:', _error);
      setLoading(false);
      showNotification('შეცდომა სტენდების ჩატვირთვისას', 'error');
    }
  }, [showNotification]);

  const fetchEquipment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllEquipment(data);
      }
    } catch (_error) {
      console.error('აღჭურვილობის მიღების შეცდომა:', _error);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        console.error('კომპანიების მიღება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('კომპანიების მიღების შეცდომა:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchEquipment();
    fetchCompanies();
  }, [fetchEvents, fetchEquipment, fetchCompanies]);

  useEffect(() => {
    if (selectedEvent) {
      fetchStands(selectedEvent.id);
    }
  }, [selectedEvent, fetchStands]);

  const handleStandSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${selectedEvent.id}/stands`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification('სტენდი წარმატებით დამატებულია', 'success');
        fetchStands(selectedEvent.id);
        setShowStandForm(false);
        resetForm();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'შეცდომა სტენდის დამატებისას', 'error');
      }
    } catch (_error) {
      console.error('შეცდომა:', _error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleEquipmentAdd = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${selectedEvent.id}/stands/${selectedStand.id}/equipment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(equipmentData)
      });

      if (response.ok) {
        showNotification('აღჭურვილობა წარმატებით დამატებულია', 'success');
        fetchStands(selectedEvent.id);
        setShowEquipmentDialog(false);
        setEquipmentData({ equipment_id: '', quantity: 1, notes: '' });
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'შეცდომა აღჭურვილობის დამატებისას', 'error');
      }
    } catch (_error) {
      console.error('შეცდომა:', _error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleDesignUpload = async () => {
    if (!designFiles.length) {
      showNotification('გთხოვთ, აირჩიოთ ფაილები', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();

      designFiles.forEach((file, index) => {
        uploadFormData.append('design_files', file);
      });

      if (designDescription) {
        uploadFormData.append('description', designDescription);
      }

      const response = await fetch(`/api/events/${selectedEvent.id}/stands/${selectedStand.id}/design`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (response.ok) {
        showNotification('დიზაინის ფაილები წარმატებით ატვირთულია', 'success');
        fetchStands(selectedEvent.id);
        setShowDesignDialog(false);
        setDesignFiles([]);
        setDesignDescription('');
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'შეცდომა ფაილების ატვირთვისას', 'error');
      }
    } catch (_error) {
      console.error('შეცდომა:', _error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleDesignDelete = async (designId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${selectedEvent.id}/stands/${selectedStand.id}/design/${designId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('დიზაინის ფაილი წაშლილია', 'success');
        fetchStands(selectedEvent.id);
      } else {
        showNotification('ფაილის წაშლა ვერ მოხერხდა', 'error');
      }
    } catch (_error) {
      console.error('შეცდომა:', _error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleStatusChange = async (standId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${selectedEvent.id}/stands/${standId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showNotification('სტატუსი წარმატებით განახლდა', 'success');
        fetchStands(selectedEvent.id);
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'სტატუსის განახლება ვერ მოხერხდა', 'error');
      }
    } catch (_error) {
      console.error('სტატუსის განახლების შეცდომა:', _error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleCompanySelection = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setSelectedCompany(company);
      setContactPersons(company.contact_persons || []);
      setFormData(prev => ({
        ...prev,
        company_id: companyId,
        company_name: company.company_name,
        contact_person: '',
        contact_phone: '',
        contact_email: ''
      }));
    }
  };

  const handleContactPersonSelection = (contactIndex) => {
    if (contactPersons[contactIndex]) {
      const contact = contactPersons[contactIndex];
      setFormData(prev => ({
        ...prev,
        contact_person: contact.name || '',
        contact_phone: contact.phone || '',
        contact_email: contact.email || ''
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      booth_number: '',
      company_name: '',
      company_id: '',
      area: '',
      booth_type: 'რიგითი',
      booth_category: 'ოქტანორმის სტენდები',
      price_per_sqm: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      status: 'დაგეგმილი',
      notes: ''
    });
    setSelectedCompany(null);
    setContactPersons([]);
  };

  const getStatusInfo = (status) => {
    return standStatuses.find(s => s.value === status) || standStatuses[0];
  };

  const getEventStatus = (event) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = new Date(event.start_date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(event.end_date);
    endDate.setHours(23, 59, 59, 999);

    if (now < startDate) {
      return { text: 'მომავალი', color: 'info' };
    }

    if (now <= endDate) {
      return { text: 'მიმდინარე', color: 'success' };
    }

    return { text: 'დასრულებული', color: 'default' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ka-GE');
    } catch (_error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>ივენთების ჩატვირთვა...</Typography>
      </Container>
    );
  }

  // თუ ივენთი არაა არჩეული, აჩვენოს ივენთების სია
  if (!selectedEvent) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Typography variant="h4" gutterBottom>
            🏗️ სტენდების ოპერაციული მართვა
          </Typography>
          <Typography variant="h6">
            აირჩიეთ ივენთი სტენდების მართვისთვის
          </Typography>
        </Paper>

        {events.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              მიმდინარე ან მომავალი ივენთები არ მოიძებნა
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {events.map((event) => {
              const eventStatus = getEventStatus(event);
              return (
                <Grid xs={12} md={6} key={event.id}>
                  <Card
                    elevation={3}
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                      },
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      borderLeft: '4px solid #667eea'
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <CardContent sx={{ pb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: '#667eea',
                            flex: 1,
                            mr: 1,
                            lineHeight: 1.3
                          }}
                        >
                          {event.service_name}
                        </Typography>
                        <Chip
                          label={eventStatus.text}
                          color={eventStatus.color}
                          size="small"
                          sx={{ borderRadius: 2, fontWeight: 500 }}
                        />
                      </Box>

                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>დაწყება:</strong> {formatDate(event.start_date)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            <strong>დასრულება:</strong> {formatDate(event.end_date)}
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
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    );
  }

  // ივენთი არჩეული - აჩვენოს სტენდების მართვა
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eeaa 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton
            onClick={() => {
              setSelectedEvent(null);
              setStands([]);
              setSelectedStand(null);
            }}
            sx={{ color: 'white', mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" gutterBottom>
              🏗️ სტენდების ოპერაციული მართვა
            </Typography>
            <Typography variant="h6">
              ივენთი: {selectedEvent.service_name}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setShowStandForm(true)}
            sx={{ color: 'white', borderColor: 'white', mr: 2 }}
          >
            ახალი სტენდი
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* სტენდების სია */}
        <Grid xs={12} md={4}>
          <Paper elevation={3} sx={{ height: '70vh', overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">სტენდები ({stands.length})</Typography>
            </Box>
            {stands.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Construction sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  ამ ივენთზე სტენდები არ არის დამატებული
                </Typography>
              </Box>
            ) : (
              <List>
                {stands.map((stand, index) => {
                  const statusInfo = getStatusInfo(stand.status);
                  return (
                    <React.Fragment key={stand.id}>
                      <ListItem
                        button
                        selected={selectedStand?.id === stand.id}
                        onClick={() => setSelectedStand(stand)}
                        sx={{
                          '&.Mui-selected': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText'
                          },
                          borderLeft: `4px solid ${statusInfo.color}`,
                          backgroundColor: `${statusInfo.color}15`,
                          '&:hover': {
                            backgroundColor: `${statusInfo.color}25`
                          }
                        }}
                      >
                        <Avatar sx={{ bgcolor: statusInfo.color, mr: 2 }}>
                          {statusInfo.icon}
                        </Avatar>
                        <ListItemText
                          primary={`სტენდი ${stand.booth_number || `#${stand.id}`}`}
                          secondary={
                            <Box>
                              <Typography variant="body2">{stand.company_name}</Typography>
                              {stand.area && (
                                <Typography variant="caption" display="block">
                                  ფართობი: {stand.area} მ²
                                </Typography>
                              )}
                              {stand.booth_category && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {stand.booth_category}
                                </Typography>
                              )}
                              <FormControl size="small" sx={{ mt: 1, minWidth: 120 }}>
                                <Select
                                  value={stand.status}
                                  onChange={(e) => handleStatusChange(stand.id, e.target.value)}
                                  size="small"
                                  sx={{
                                    bgcolor: statusInfo.color,
                                    color: 'white',
                                    borderRadius: 2,
                                    fontWeight: 'bold',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                      border: 'none'
                                    },
                                    '& .MuiSelect-icon': {
                                      color: 'white'
                                    },
                                    '&:hover': {
                                      bgcolor: statusInfo.color,
                                      filter: 'brightness(1.1)'
                                    }
                                  }}
                                >
                                  {standStatuses.map((status) => (
                                    <MenuItem key={status.value} value={status.value}>
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {status.icon}
                                        <Typography sx={{ ml: 1 }}>{status.value}</Typography>
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < stands.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* სტენდის დეტალები */}
        <Grid xs={12} md={8}>
          {selectedStand ? (
            <Paper elevation={3} sx={{ height: '70vh', overflow: 'auto' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab label="ძირითადი ინფორმაცია" />
                  <Tab label="აღჭურვილობა" />
                  <Tab label="დიზაინი" />
                  <Tab label="ფოტოები" />
                </Tabs>
              </Box>

              {/* ძირითადი ინფორმაცია */}
              {activeTab === 0 && (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid xs={12} md={6}>
                      <Card elevation={2}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="primary">
                            <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                            სტენდის ინფორმაცია
                          </Typography>
                          <Typography variant="body1"><strong>სტენდის ნომერი:</strong> {selectedStand.booth_number || 'N/A'}</Typography>
                          <Typography variant="body1"><strong>კომპანია:</strong> {selectedStand.company_name}</Typography>
                          <Typography variant="body1">
                            <Straighten sx={{ mr: 1, verticalAlign: 'middle' }} />
                            <strong>ფართობი:</strong> {selectedStand.area || 'N/A'} მ²
                          </Typography>
                          <Typography variant="body1"><strong>სტენდის ტიპი:</strong> {selectedStand.booth_type || 'N/A'}</Typography>
                          <Typography variant="body1"><strong>კატეგორია:</strong> {selectedStand.booth_category || 'N/A'}</Typography>

                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>სტატუსი:</strong>
                            </Typography>
                            <FormControl size="small">
                              <Select
                                value={selectedStand.status}
                                onChange={(e) => handleStatusChange(selectedStand.id, e.target.value)}
                                size="small"
                                sx={{
                                  bgcolor: getStatusInfo(selectedStand.status).color,
                                  color: 'white',
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    border: 'none'
                                  },
                                  '& .MuiSelect-icon': {
                                    color: 'white'
                                  }
                                }}
                              >
                                {standStatuses.map((status) => (
                                  <MenuItem key={status.value} value={status.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {status.icon}
                                      <Typography sx={{ ml: 1 }}>{status.value}</Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                          {selectedStand.package_name && (
                            <Typography variant="body1" sx={{ mt: 1 }}>
                              <strong>პაკეტი:</strong> {selectedStand.package_name}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid xs={12} md={6}>
                      <Card elevation={2}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="primary">
                            საკონტაქტო ინფორმაცია
                          </Typography>
                          <Typography variant="body1">
                            <strong>საკონტაქტო პირი:</strong> {selectedStand.contact_person || selectedStand.company_contact_person || 'N/A'}
                          </Typography>
                          <Typography variant="body1">
                            <Phone sx={{ mr: 1, verticalAlign: 'middle' }} />
                            <strong>ტელეფონი:</strong> {selectedStand.contact_phone || selectedStand.company_phone || 'N/A'}
                          </Typography>
                          <Typography variant="body1">
                            <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                            <strong>ელ-ფოსტა:</strong> {selectedStand.contact_email || selectedStand.company_email || 'N/A'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {selectedStand.notes && (
                      <Grid xs={12}>
                        <Alert severity="info">
                          <Typography variant="body2">
                            <strong>შენიშვნები:</strong> {selectedStand.notes}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}

              {/* აღჭურვილობა */}
              {activeTab === 1 && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6">სტენდის აღჭურვილობა</Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setShowEquipmentDialog(true)}
                      size="small"
                    >
                      აღჭურვილობის დამატება
                    </Button>
                  </Box>

                  {selectedStand.stand_equipment && selectedStand.stand_equipment.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedStand.stand_equipment.map((equipment, index) => (
                        <Grid xs={12} sm={6} md={4} key={index}>
                          <Card elevation={2}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                {equipment.image_url ? (
                                  <Avatar
                                    src={processImageUrl(equipment.image_url)}
                                    alt={equipment.equipment_name}
                                    variant="rounded"
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      border: '2px solid #e0e6ed',
                                      mr: 2
                                    }}
                                    onError={(e) => {
                                      console.error('სურათის ჩატვირთვის შეცდომა:', equipment.image_url);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Avatar
                                    variant="rounded"
                                    sx={{
                                      width: 60,
                                      height: 60,
                                      backgroundColor: '#f0f0f0',
                                      border: '2px solid #e0e6ed',
                                      mr: 2
                                    }}
                                  >
                                    <ImageIcon sx={{ color: '#999' }} />
                                  </Avatar>
                                )}
                                <Box>
                                  <Typography variant="h6" color="primary">
                                    {equipment.equipment_name}
                                  </Typography>
                                  <Typography variant="body2">
                                    რაოდენობა: {equipment.quantity}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      ამ სტენდზე აღჭურვილობა არ არის მინიჭებული
                    </Alert>
                  )}
                </Box>
              )}

              {/* დიზაინი */}
              {activeTab === 2 && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h6">დიზაინის ფაილები</Typography>
                    <Button
                      variant="contained"
                      startIcon={<CloudUpload />}
                      onClick={() => setShowDesignDialog(true)}
                      size="small"
                    >
                      ფაილის ატვირთვა
                    </Button>
                  </Box>

                  {selectedStand.stand_designs && selectedStand.stand_designs.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedStand.stand_designs.map((design, index) => {
                        const fileExtension = design.design_url ? design.design_url.split('.').pop().toLowerCase() : '';
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

                        return (
                          <Grid xs={12} sm={6} md={4} key={index}>
                            <Card elevation={2}>
                              <CardContent sx={{ p: 2 }}>
                                {isImage ? (
                                  <Box
                                    sx={{
                                      width: '100%',
                                      height: 200,
                                      overflow: 'hidden',
                                      borderRadius: 1,
                                      mb: 2,
                                      cursor: 'pointer',
                                      position: 'relative'
                                    }}
                                    onClick={() => window.open(design.design_url, '_blank')}
                                  >
                                    <img
                                      src={design.design_url}
                                      alt={design.description}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <Box
                                      sx={{
                                        display: 'none',
                                        width: '100%',
                                        height: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'grey.200',
                                        color: 'grey.600'
                                      }}
                                    >
                                      <Image sx={{ fontSize: 48 }} />
                                    </Box>
                                  </Box>
                                ) : (
                                  <Box
                                    sx={{
                                      width: '100%',
                                      height: 200,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bgcolor: 'grey.100',
                                      borderRadius: 1,
                                      mb: 2,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => window.open(design.design_url, '_blank')}
                                  >
                                    <Stack alignItems="center" spacing={1}>
                                      <Description sx={{ fontSize: 48, color: 'grey.500' }} />
                                      <Typography variant="caption" color="grey.600">
                                        .{fileExtension.toUpperCase()}
                                      </Typography>
                                    </Stack>
                                  </Box>
                                )}

                                <Typography variant="caption" color="text.secondary" display="block">
                                  ატვირთულია: {new Date(design.uploaded_at).toLocaleDateString('ka-GE')}
                                </Typography>

                                {design.uploaded_by && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    ატვირთვა: {design.uploaded_by}
                                  </Typography>
                                )}
                              </CardContent>

                              <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                                <Button
                                  size="small"
                                  startIcon={<Image />}
                                  onClick={() => window.open(design.design_url, '_blank')}
                                >
                                  ნახვა
                                </Button>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDesignDelete(design.design_id)}
                                >
                                  <Delete />
                                </IconButton>
                              </CardActions>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      დიზაინის ფაილები არ არის ატვირთული
                    </Alert>
                  )}
                </Box>
              )}

              {/* ფოტოები */}
              {activeTab === 3 && (
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>სტენდის ფოტოები</Typography>

                  {selectedStand.stand_photos && selectedStand.stand_photos.length > 0 ? (
                    <ImageList cols={3} gap={8}>
                      {selectedStand.stand_photos.map((photo, index) => (
                        <ImageListItem key={index}>
                          <img
                            src={photo.photo_url}
                            alt={photo.description}
                            loading="lazy"
                            style={{ height: 200, objectFit: 'cover' }}
                          />
                          <ImageListItemBar
                            title={photo.description}
                            subtitle={new Date(photo.uploaded_at).toLocaleDateString('ka-GE')}
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  ) : (
                    <Alert severity="info">
                      სტენდის ფოტოები არ არის ატვირთული
                    </Alert>
                  )}
                </Box>
              )}
            </Paper>
          ) : (
            <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box>
                <Construction sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  აირჩიეთ სტენდი დეტალების სანახავად
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ახალი სტენდის ფორმა */}
      <Dialog open={showStandForm} onClose={() => setShowStandForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>ახალი სტენდის დამატება</DialogTitle>
        <form onSubmit={handleStandSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="სტენდის ნომერი"
                  value={formData.booth_number}
                  onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                  required
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>კომპანია</InputLabel>
                  <Select
                    value={formData.company_id}
                    onChange={(e) => handleCompanySelection(e.target.value)}
                    label="კომპანია"
                  >
                    <MenuItem value="">
                      <em>აირჩიეთ კომპანია</em>
                    </MenuItem>
                    {companies.map(company => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.company_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ფართობი (მ²)"
                  type="number"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  required
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>სტენდის ტიპი</InputLabel>
                  <Select
                    value={formData.booth_type || 'რიგითი'}
                    onChange={(e) => setFormData({...formData, booth_type: e.target.value})}
                    label="სტენდის ტიპი"
                  >
                    <MenuItem value="რიგითი">რიგითი</MenuItem>
                    <MenuItem value="კუთხური">კუთხური</MenuItem>
                    <MenuItem value="თავისუფალი">თავისუფალი</MenuItem>
                    <MenuItem value="ღია">ღია</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>კატეგორია</InputLabel>
                  <Select
                    value={formData.booth_category || 'ოქტანორმის სტენდები'}
                    onChange={(e) => setFormData({...formData, booth_category: e.target.value})}
                    label="კატეგორია"
                  >
                    <MenuItem value="ოქტანორმის სტენდები">ოქტანორმის სტენდები</MenuItem>
                    <MenuItem value="ღია ფართობი">ღია ფართობი</MenuItem>
                    <MenuItem value="პრემიუმ სტენდი">პრემიუმ სტენდი</MenuItem>
                    <MenuItem value="სპეციალური სტენდი">სპეციალური სტენდი</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ფასი მ²-ზე (₾)"
                  type="number"
                  value={formData.price_per_sqm || ''}
                  onChange={(e) => setFormData({...formData, price_per_sqm: e.target.value})}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>სტატუსი</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    label="სტატუსი"
                  >
                    {standStatuses.map(status => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>საკონტაქტო პირი</InputLabel>
                  <Select
                    value={contactPersons.findIndex(p => p.name === formData.contact_person)}
                    onChange={(e) => handleContactPersonSelection(e.target.value)}
                    label="საკონტაქტო პირი"
                    disabled={!selectedCompany || contactPersons.length === 0}
                  >
                    <MenuItem value={-1}>
                      <em>აირჩიეთ საკონტაქტო პირი</em>
                    </MenuItem>
                    {contactPersons.map((person, index) => (
                      <MenuItem key={index} value={index}>
                        {person.name} {person.position ? `- ${person.position}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ტელეფონი"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  InputProps={{
                    readOnly: !!selectedCompany && contactPersons.length > 0
                  }}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="ელ-ფოსტა"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  InputProps={{
                    readOnly: !!selectedCompany && contactPersons.length > 0
                  }}
                />
              </Grid>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="შენიშვნები"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStandForm(false)}>გაუქმება</Button>
            <Button type="submit" variant="contained">შენახვა</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* აღჭურვილობის დამატების ფორმა */}
      <Dialog open={showEquipmentDialog} onClose={() => setShowEquipmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>აღჭურვილობის დამატება</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <FormControl fullWidth>
                <InputLabel>აღჭურვილობა</InputLabel>
                <Select
                  value={equipmentData.equipment_id}
                  onChange={(e) => setEquipmentData({...equipmentData, equipment_id: e.target.value})}
                  label="აღჭურვილობა"
                >
                  {allEquipment.map(equipment => (
                    <MenuItem key={equipment.id} value={equipment.id}>
                      {equipment.code_name} - ₾{equipment.price}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="რაოდენობა"
                type="number"
                value={equipmentData.quantity}
                onChange={(e) => setEquipmentData({...equipmentData, quantity: parseInt(e.target.value)})}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label="შენიშვნები"
                multiline
                rows={2}
                value={equipmentData.notes}
                onChange={(e) => setEquipmentData({...equipmentData, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEquipmentDialog(false)}>გაუქმება</Button>
          <Button onClick={handleEquipmentAdd} variant="contained">დამატება</Button>
        </DialogActions>
      </Dialog>

      {/* დიზაინის ფაილების ატვირთვის ფორმა */}
      <Dialog open={showDesignDialog} onClose={() => setShowDesignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>დიზაინის ფაილების ატვირთვა</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUpload />}
              >
                ფაილების არჩევა
                <input
                  type="file"
                  multiple
                  hidden
                  accept=".jpg,.jpeg,.png,.pdf,.dwg,.3ds"
                  onChange={(e) => setDesignFiles(Array.from(e.target.files))}
                />
              </Button>
              {designFiles.length > 0 && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                  არჩეულია {designFiles.length} ფაილი
                </Typography>
              )}
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label="აღწერა"
                value={designDescription}
                onChange={(e) => setDesignDescription(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDesignDialog(false)}>გაუქმება</Button>
          <Button onClick={handleDesignUpload} variant="contained">ატვირთვა</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OperationPage;