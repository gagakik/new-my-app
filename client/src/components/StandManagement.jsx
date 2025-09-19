
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Slider,
  FormHelperText,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Construction,
  Engineering,
  CheckCircle,
  Warning,
  Schedule,
  Business,
  ExpandMore,
  Upload,
  Assignment,
  BuildCircle,
  Description
} from '@mui/icons-material';

const StandManagement = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [stands, setStands] = useState([]);
  const [filteredStands, setFilteredStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStandForm, setShowStandForm] = useState(false);
  const [editingStand, setEditingStand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    booth_number: '',
    company_name: '',
    stand_status: 'დაგეგმილი',
    design_notes: '',
    construction_notes: '',
    special_requirements: '',
    start_date: '',
    deadline: '',
    completion_percentage: 0
  });
  const [designFiles, setDesignFiles] = useState([]);

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'operations' ||
    userRole === 'manager';

  const standStatuses = [
    { value: 'დაგეგმილი', color: '#2196f3', icon: <Assignment /> },
    { value: 'დიზაინის ეტაპი', color: '#ff9800', icon: <Description /> },
    { value: 'მშენებლობა დაწყებული', color: '#9c27b0', icon: <Construction /> },
    { value: 'მშენებლობა მიმდინარეობს', color: '#3f51b5', icon: <Construction /> },
    { value: 'ელექტრობის მოწყობა', color: '#673ab7', icon: <Engineering /> },
    { value: 'დასრულების ეტაპი', color: '#009688', icon: <Construction /> },
    { value: 'დასრულებული', color: '#4caf50', icon: <CheckCircle /> },
    { value: 'ჩაბარებული', color: '#8bc34a', icon: <CheckCircle /> },
    { value: 'გადაუდებელი ყურადღება', color: '#f44336', icon: <Warning /> }
  ];

  useEffect(() => {
    fetchStands();
  }, [eventId]);

  useEffect(() => {
    let filtered = stands;

    if (searchTerm) {
      filtered = filtered.filter(stand =>
        stand.booth_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stand.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(stand => stand.stand_status === statusFilter);
    }

    setFilteredStands(filtered);
  }, [stands, searchTerm, statusFilter]);

  const fetchStands = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStands(data);
        setFilteredStands(data);
      } else {
        showNotification('სტენდების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('სტენდების მიღების შეცდომა:', error);
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, showNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const method = editingStand ? 'PUT' : 'POST';
      const url = editingStand
        ? `/api/events/${eventId}/stands/${editingStand.id}`
        : `/api/events/${eventId}/stands`;

      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      designFiles.forEach((file, index) => {
        submitData.append(`design_file_${index}`, file);
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
        fetchStands();
        resetForm();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'შეცდომა მოთხოვნის დამუშავებისას', 'error');
      }
    } catch (error) {
      console.error('შეცდომა:', error);
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleEdit = (stand) => {
    setEditingStand(stand);
    setFormData({
      booth_number: stand.booth_number || '',
      company_name: stand.company_name || '',
      stand_status: stand.stand_status || 'დაგეგმილი',
      design_notes: stand.design_notes || '',
      construction_notes: stand.construction_notes || '',
      special_requirements: stand.special_requirements || '',
      start_date: stand.start_date ? stand.start_date.split('T')[0] : '',
      deadline: stand.deadline ? stand.deadline.split('T')[0] : '',
      completion_percentage: stand.completion_percentage || 0
    });
    setShowStandForm(true);
  };

  const handleDelete = async (standId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ სტენდის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands/${standId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('სტენდი წარმატებით წაიშალა', 'success');
        fetchStands();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'სტენდის წაშლა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('წაშლის შეცდომა:', error);
      showNotification('შეცდომა წაშლისას', 'error');
    }
  };

  const updateStandStatus = async (standId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/stands/${standId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stand_status: newStatus })
      });

      if (response.ok) {
        showNotification('სტატუსი განახლდა', 'success');
        fetchStands();
      } else {
        showNotification('სტატუსის განახლება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('სტატუსის განახლების შეცდომა:', error);
      showNotification('შეცდომა სტატუსის განახლებისას', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      booth_number: '',
      company_name: '',
      stand_status: 'დაგეგმილი',
      design_notes: '',
      construction_notes: '',
      special_requirements: '',
      start_date: '',
      deadline: '',
      completion_percentage: 0
    });
    setDesignFiles([]);
    setEditingStand(null);
    setShowStandForm(false);
  };

  const getStatusColor = (status) => {
    const statusConfig = standStatuses.find(s => s.value === status);
    return statusConfig ? statusConfig.color : '#2196f3';
  };

  const getStatusIcon = (status) => {
    const statusConfig = standStatuses.find(s => s.value === status);
    return statusConfig ? statusConfig.icon : <Schedule />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          იტვირთება...
        </Typography>
      </Box>
    );
  }

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: { 
          height: '95vh',
          borderRadius: 3
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box display="flex" alignItems="center">
          <Construction sx={{ mr: 2 }} />
          <Typography variant="h5" component="div">
            {eventName} - სტენდების მენეჯმენტი ({filteredStands.length} / {stands.length})
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Search and Filter Section */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="ძიება სტენდის ნომრით ან კომპანიით..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>სტატუსის ფილტრი</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="სტატუსის ფილტრი"
                  startAdornment={<FilterList sx={{ mr: 1 }} />}
                >
                  <MenuItem value="">ყველა სტატუსი</MenuItem>
                  {standStatuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>{status.value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {isAuthorizedForManagement && (
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    resetForm();
                    setShowStandForm(true);
                  }}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                    }
                  }}
                >
                  ახალი სტენდი
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Stand Form Dialog */}
        <Dialog 
          open={showStandForm} 
          onClose={resetForm} 
          maxWidth="md" 
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', color: 'white' }}>
            <Box display="flex" alignItems="center">
              {editingStand ? <Edit sx={{ mr: 2 }} /> : <Add sx={{ mr: 2 }} />}
              {editingStand ? 'სტენდის რედაქტირება' : 'ახალი სტენდის დამატება'}
            </Box>
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="სტენდის ნომერი"
                    value={formData.booth_number}
                    onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                    required
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="კომპანია"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>სტატუსი</InputLabel>
                    <Select
                      value={formData.stand_status}
                      onChange={(e) => setFormData({...formData, stand_status: e.target.value})}
                      label="სტატუსი"
                    >
                      {standStatuses.map(status => (
                        <MenuItem key={status.value} value={status.value}>{status.value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography gutterBottom>დასრულების პროცენტი: {formData.completion_percentage}%</Typography>
                    <Slider
                      value={formData.completion_percentage}
                      onChange={(e, newValue) => setFormData({...formData, completion_percentage: newValue})}
                      min={0}
                      max={100}
                      step={5}
                      marks
                      valueLabelDisplay="auto"
                      color="primary"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="დაწყების თარიღი"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="დასრულების ვადა"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="დიზაინის შენიშვნები"
                    value={formData.design_notes}
                    onChange={(e) => setFormData({...formData, design_notes: e.target.value})}
                    multiline
                    rows={3}
                    placeholder="დიზაინის მოთხოვნები, მასალები, ფერები..."
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="მშენებლობის შენიშვნები"
                    value={formData.construction_notes}
                    onChange={(e) => setFormData({...formData, construction_notes: e.target.value})}
                    multiline
                    rows={3}
                    placeholder="მშენებლობის მიმდინარეობა, პრობლემები, შესწორებები..."
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="სპეციალური მოთხოვნები"
                    value={formData.special_requirements}
                    onChange={(e) => setFormData({...formData, special_requirements: e.target.value})}
                    multiline
                    rows={2}
                    placeholder="განსაკუთრებული ელექტრობა, წყალი, კონდიციონერი..."
                    variant="outlined"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<Upload />}
                    fullWidth
                    sx={{ py: 2, borderStyle: 'dashed' }}
                  >
                    დიზაინის ფაილების ატვირთვა
                    <input
                      type="file"
                      accept="image/*,.pdf,.dwg,.3ds"
                      multiple
                      hidden
                      onChange={(e) => setDesignFiles(Array.from(e.target.files))}
                    />
                  </Button>
                  <FormHelperText>მხარდაჭერილია: JPG, PNG, PDF, DWG, 3DS</FormHelperText>
                  {designFiles.length > 0 && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      არჩეულია {designFiles.length} ფაილი
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={resetForm} color="inherit">
                გაუქმება
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                sx={{ 
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)'
                  }
                }}
              >
                {editingStand ? 'განახლება' : 'დამატება'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Stands Grid */}
        {filteredStands.length === 0 ? (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Construction sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              სტენდები ჯერ არ არის დამატებული ამ ივენთისთვის
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredStands.map(stand => (
              <Grid item xs={12} md={6} lg={4} key={stand.id}>
                <Card 
                  elevation={3}
                  sx={{ 
                    height: '100%',
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    borderLeft: `4px solid ${getStatusColor(stand.stand_status)}`,
                    background: `linear-gradient(135deg, ${getStatusColor(stand.stand_status)}10 0%, ${getStatusColor(stand.stand_status)}05 100%)`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${getStatusColor(stand.stand_status)}40`,
                      background: `linear-gradient(135deg, ${getStatusColor(stand.stand_status)}20 0%, ${getStatusColor(stand.stand_status)}10 100%)`
                    }
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" component="div" color="primary" fontWeight="bold">
                          სტენდი #{stand.booth_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Business sx={{ mr: 1, fontSize: 16 }} />
                          {stand.company_name}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getStatusIcon(stand.stand_status)}
                        label={stand.stand_status}
                        size="small"
                        variant="filled"
                        sx={{ 
                          backgroundColor: getStatusColor(stand.stand_status),
                          color: 'white',
                          fontWeight: 'bold',
                          '& .MuiChip-icon': {
                            color: 'white'
                          }
                        }}
                      />
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" fontWeight="bold">
                          პროგრესი
                        </Typography>
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                          {stand.completion_percentage}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={stand.completion_percentage} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatusColor(stand.stand_status)
                          }
                        }}
                      />
                    </Box>

                    {(stand.start_date || stand.deadline) && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          თარიღები:
                        </Typography>
                        {stand.start_date && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Schedule sx={{ mr: 1, fontSize: 16 }} />
                            დაწყება: {new Date(stand.start_date).toLocaleDateString('ka-GE')}
                          </Typography>
                        )}
                        {stand.deadline && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Warning sx={{ mr: 1, fontSize: 16 }} />
                            ვადა: {new Date(stand.deadline).toLocaleDateString('ka-GE')}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {(stand.design_notes || stand.construction_notes) && (
                      <Accordion sx={{ mt: 2, boxShadow: 'none', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 'auto' }}>
                          <Typography variant="subtitle2" color="primary">
                            შენიშვნები
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 0, pt: 0 }}>
                          {stand.design_notes && (
                            <Box mb={1}>
                              <Typography variant="caption" color="primary" fontWeight="bold">
                                დიზაინი:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {stand.design_notes}
                              </Typography>
                            </Box>
                          )}
                          {stand.construction_notes && (
                            <Box>
                              <Typography variant="caption" color="primary" fontWeight="bold">
                                მშენებლობა:
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {stand.construction_notes}
                              </Typography>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </CardContent>

                  {isAuthorizedForManagement && (
                    <CardActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>სტატუსის შეცვლა</InputLabel>
                        <Select
                          value={stand.stand_status}
                          onChange={(e) => updateStandStatus(stand.id, e.target.value)}
                          label="სტატუსის შეცვლა"
                        >
                          {standStatuses.map(status => (
                            <MenuItem key={status.value} value={status.value}>{status.value}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <Stack direction="row" spacing={1} width="100%">
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Edit />}
                          onClick={() => handleEdit(stand)}
                          size="small"
                        >
                          რედაქტირება
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDelete(stand.id)}
                          size="small"
                        >
                          წაშლა
                        </Button>
                      </Stack>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StandManagement;
