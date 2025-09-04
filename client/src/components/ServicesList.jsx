
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Alert,
  Tooltip,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Event as EventIcon,
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import ServiceForm from './ServiceForm';
import EventParticipants from './EventParticipants';
import { servicesAPI } from '../services/api';

const ServicesList = ({ showNotification }) => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [openParticipants, setOpenParticipants] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    filterServices();
  }, [services, searchTerm, statusFilter, showArchived]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await servicesAPI.getAll();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('სერვისების ჩატვირთვა ვერ მოხერხდა');
      showNotification('სერვისების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterServices = () => {
    let filtered = services.filter(service => 
      (showArchived ? service.is_archived : !service.is_archived)
    );

    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.exhibition_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter);
    }

    setFilteredServices(filtered);
  };

  const handleCreateService = () => {
    setEditingService(null);
    setOpenForm(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setOpenForm(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ სერვისის წაშლა?')) {
      try {
        await servicesAPI.delete(id);
        showNotification('სერვისი წარმატებით წაიშალა', 'success');
        fetchServices();
      } catch (error) {
        console.error('Error deleting service:', error);
        showNotification('სერვისის წაშლა ვერ მოხერხდა', 'error');
      }
    }
  };

  const handleArchiveService = async (id) => {
    try {
      await servicesAPI.archive(id);
      showNotification('სერვისი დაარქივდა', 'success');
      fetchServices();
    } catch (error) {
      console.error('Error archiving service:', error);
      showNotification('სერვისის დაარქივება ვერ მოხერხდა', 'error');
    }
  };

  const handleViewParticipants = (service) => {
    setSelectedService(service);
    setOpenParticipants(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'აქტიური';
      case 'completed': return 'დასრულებული';
      case 'cancelled': return 'გაუქმებული';
      default: return 'უცნობი';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            წლიური სერვისები
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateService}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
              }
            }}
          >
            ახალი სერვისი
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="ძიება..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              }}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>სტატუსი</InputLabel>
              <Select
                value={statusFilter}
                label="სტატუსი"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">ყველა</MenuItem>
                <MenuItem value="active">აქტიური</MenuItem>
                <MenuItem value="completed">დასრულებული</MenuItem>
                <MenuItem value="cancelled">გაუქმებული</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant={showArchived ? "contained" : "outlined"}
              onClick={() => setShowArchived(!showArchived)}
              startIcon={<ArchiveIcon />}
              fullWidth
              sx={{ height: '56px' }}
            >
              {showArchived ? 'აქტიური' : 'არქივი'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              startIcon={<ClearIcon />}
              fullWidth
              sx={{ height: '56px' }}
            >
              გასუფთავება
            </Button>
          </Grid>
        </Grid>

        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>სერვისის სახელი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>გამოფენა</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>თარიღი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>სტატუსი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      სერვისები ვერ მოიძებნა
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow 
                    key={service.id} 
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'action.hover',
                        transform: 'scale(1.01)',
                        transition: 'all 0.2s ease'
                      } 
                    }}
                  >
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {service.service_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {service.exhibition_name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.start_date ? new Date(service.start_date).toLocaleDateString('ka-GE') : 'N/A'}
                        {service.end_date && ` - ${new Date(service.end_date).toLocaleDateString('ka-GE')}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusLabel(service.status)} 
                        color={getStatusColor(service.status)}
                        size="small"
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="მონაწილეები">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewParticipants(service)}
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.light', color: 'white' }
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="რედაქტირება">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditService(service)}
                            sx={{ 
                              color: 'info.main',
                              '&:hover': { bgcolor: 'info.light', color: 'white' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {showArchived ? (
                          <Tooltip title="აღდგენა">
                            <IconButton 
                              size="small" 
                              onClick={() => handleArchiveService(service.id)}
                              sx={{ 
                                color: 'success.main',
                                '&:hover': { bgcolor: 'success.light', color: 'white' }
                              }}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="დაარქივება">
                            <IconButton 
                              size="small" 
                              onClick={() => handleArchiveService(service.id)}
                              sx={{ 
                                color: 'warning.main',
                                '&:hover': { bgcolor: 'warning.light', color: 'white' }
                              }}
                            >
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="წაშლა">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteService(service.id)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.light', color: 'white' }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {openForm && (
          <ServiceForm
            open={openForm}
            onClose={() => setOpenForm(false)}
            onSuccess={() => {
              setOpenForm(false);
              fetchServices();
            }}
            service={editingService}
            showNotification={showNotification}
          />
        )}

        {openParticipants && selectedService && (
          <EventParticipants
            open={openParticipants}
            onClose={() => setOpenParticipants(false)}
            eventId={selectedService.id}
            eventName={selectedService.service_name}
            showNotification={showNotification}
          />
        )}
      </Paper>
    </Container>
  );
};

export default ServicesList;
