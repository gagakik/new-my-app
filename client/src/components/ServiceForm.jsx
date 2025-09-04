import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { servicesAPI } from '../services/api';
import api from '../services/api';

const ServiceForm = ({ isOpen, onClose, onSubmit, editingService, exhibitions, showNotification }) => {
  const [formData, setFormData] = useState({
    service_name: '',
    exhibition_id: '',
    description: '',
    year_selection: new Date().getFullYear().toString(),
    service_type: 'ღონისძიება',
    start_date: null,
    end_date: null,
    start_time: null,
    end_time: null,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingService) {
      setFormData({
        service_name: editingService.service_name || '',
        exhibition_id: editingService.exhibition_id || '',
        description: editingService.description || '',
        year_selection: editingService.year_selection || new Date().getFullYear().toString(),
        service_type: editingService.service_type || 'ღონისძიება',
        start_date: editingService.start_date ? new Date(editingService.start_date) : null,
        end_date: editingService.end_date ? new Date(editingService.end_date) : null,
        start_time: editingService.start_time ? new Date(`1970-01-01T${editingService.start_time}`) : null,
        end_time: editingService.end_time ? new Date(`1970-01-01T${editingService.end_time}`) : null,
        is_active: editingService.is_active !== false
      });
    } else {
      setFormData({
        service_name: '',
        exhibition_id: '',
        description: '',
        year_selection: new Date().getFullYear().toString(),
        service_type: 'ღონისძიება',
        start_date: null,
        end_date: null,
        start_time: null,
        end_time: null,
        is_active: true
      });
    }
    setErrors({});
  }, [editingService, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.service_name?.trim()) {
      newErrors.service_name = 'სერვისის სახელი აუცილებელია';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'დაწყების თარიღი აუცილებელია';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'დასრულების თარიღი აუცილებელია';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      showNotification(`შეცდომა: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const serviceTypes = [
    'ღონისძიება',
    'გამოფენა',
    'კონფერენცია',
    'სემინარი',
    'ვორქშოპი',
    'კონცერტი',
    'პრეზენტაცია',
    'სხვა'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i - 2);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingService ? 'სერვისის რედაქტირება' : 'ახალი სერვისის დამატება'}
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="სერვისის სახელი"
                  value={formData.service_name}
                  onChange={(e) => handleChange('service_name', e.target.value)}
                  error={!!errors.service_name}
                  helperText={errors.service_name}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>სერვისის ტიპი</InputLabel>
                  <Select
                    value={formData.service_type}
                    onChange={(e) => handleChange('service_type', e.target.value)}
                    label="სერვისის ტიპი"
                  >
                    {serviceTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>წელი</InputLabel>
                  <Select
                    value={formData.year_selection}
                    onChange={(e) => handleChange('year_selection', e.target.value)}
                    label="წელი"
                  >
                    {years.map(year => (
                      <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Exhibition Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>დაკავშირებული გამოფენა (არასავალდებულო)</InputLabel>
                  <Select
                    value={formData.exhibition_id}
                    onChange={(e) => handleChange('exhibition_id', e.target.value)}
                    label="დაკავშირებული გამოფენა (არასავალდებულო)"
                  >
                    <MenuItem value="">არ არის დაკავშირებული</MenuItem>
                    {exhibitions?.map(exhibition => (
                      <MenuItem key={exhibition.id} value={exhibition.id}>
                        {exhibition.title} ({exhibition.location})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="აღწერა"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="სერვისის დეტალური აღწერა..."
                />
              </Grid>

              {/* Date and Time Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Chip label="თარიღები და დრო" />
                </Divider>
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="დაწყების თარიღი"
                  value={formData.start_date}
                  onChange={(date) => handleChange('start_date', date)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.start_date}
                      helperText={errors.start_date}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="დასრულების თარიღი"
                  value={formData.end_date}
                  onChange={(date) => handleChange('end_date', date)}
                  minDate={formData.start_date}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!errors.end_date}
                      helperText={errors.end_date}
                      required
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TimePicker
                  label="დაწყების დრო (არასავალდებულო)"
                  value={formData.start_time}
                  onChange={(time) => handleChange('start_time', time)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TimePicker
                  label="დასრულების დრო (არასავალდებულო)"
                  value={formData.end_time}
                  onChange={(time) => handleChange('end_time', time)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth />
                  )}
                />
              </Grid>

              {/* Active Status */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                    />
                  }
                  label="აქტიური სტატუსი"
                />
              </Grid>

              {/* Form Validation Summary */}
              {Object.keys(errors).length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="subtitle2">
                      გთხოვთ შეავსოთ ყველა საჭირო ველი:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {Object.values(errors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            გაუქმება
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              editingService ? 'განახლება' : 'შენახვა'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ServiceForm;

const ServiceForm = ({ serviceToEdit, onServiceUpdated, showNotification, onCancel }) => {
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceType, setServiceType] = useState('გამოფენა');
  const [isActive, setIsActive] = useState(true);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const isEditing = !!serviceToEdit;

  // Fetch available spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const response = await api.get('/spaces');
        setAvailableSpaces(response.data);
      } catch (error) {
        console.error('შეცდომა სივრცეების მიღებისას:', error);
      }
    };
    fetchSpaces();
  }, []);

  useEffect(() => {
    if (isEditing && serviceToEdit) {
      setServiceName(serviceToEdit.service_name || '');
      setDescription(serviceToEdit.description || '');
      setYearSelection(serviceToEdit.year_selection || new Date().getFullYear());
      setStartDate(serviceToEdit.start_date ? serviceToEdit.start_date.slice(0, 10) : '');
      setEndDate(serviceToEdit.end_date ? serviceToEdit.end_date.slice(0, 10) : '');
      setServiceType(serviceToEdit.service_type || 'გამოფენა');
      setIsActive(serviceToEdit.is_active !== undefined ? serviceToEdit.is_active : true);
      setSelectedSpaces(serviceToEdit.selected_spaces || []);
    } else {
      setServiceName('');
      setDescription('');
      setYearSelection(new Date().getFullYear());
      setStartDate('');
      setEndDate('');
      setServiceType('გამოფენა');
      setIsActive(true);
      setSelectedSpaces([]);
    }
  }, [serviceToEdit, isEditing]);

  const handleSpaceToggle = (spaceId) => {
    setSelectedSpaces(prev => 
      prev.includes(spaceId) 
        ? prev.filter(id => id !== spaceId)
        : [...prev, spaceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(endDate) <= new Date(startDate)) {
      showNotification('დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ', 'error');
      return;
    }

    const serviceData = {
      service_name: serviceName,
      description,
      year_selection: parseInt(yearSelection),
      start_date: startDate,
      end_date: endDate,
      service_type: serviceType,
      is_active: isActive,
      selected_spaces: selectedSpaces,
    };

    try {
      let response;
      if (isEditing) {
        response = await servicesAPI.update(serviceToEdit.id, serviceData);
      } else {
        response = await servicesAPI.create(serviceData);
      }

      showNotification(response.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
      onServiceUpdated();
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isEditing ? 'სერვისის რედაქტირება' : 'ახალი სერვისის დამატება'}</h3>
          <button 
            className="modal-close" 
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>სერვისის სახელი</label>
              <input 
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>აღწერა</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>წელი</label>
              <select 
                value={yearSelection} 
                onChange={(e) => setYearSelection(parseInt(e.target.value))}
                required
              >
                {generateYearOptions().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>დაწყების თარიღი</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>დასრულების თარიღი</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>სერვისის ტიპი</label>
              <select 
                value={serviceType} 
                onChange={(e) => setServiceType(e.target.value)}
                required
              >
                <option value="გამოფენა">გამოფენა</option>
                <option value="კონფერენცია">კონფერენცია</option>
                <option value="გაქირავება">გაქირავება</option>
                <option value="ივენთი">ივენთი</option>
              </select>
            </div>

            <div className="form-group">
              <label>სივრცეების არჩევა</label>
              <div className="spaces-selection">
                {availableSpaces.map(space => (
                  <label key={space.id} className="space-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSpaces.includes(space.id)}
                      onChange={() => handleSpaceToggle(space.id)}
                    />
                    <span>{space.building_name} - {space.category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                აქტიური სერვისი
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {isEditing ? 'განახლება' : 'დამატება'}
              </button>
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onCancel}
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;