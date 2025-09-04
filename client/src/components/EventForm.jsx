import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const EventForm = ({ isOpen, onClose, onSubmit, editingEvent, exhibitions = [] }) => {
  const [formData, setFormData] = useState({
    service_name: '',
    exhibition_id: '',
    start_date: null,
    end_date: null,
    start_time: null,
    end_time: null
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingEvent) {
      setFormData({
        service_name: editingEvent.service_name || '',
        exhibition_id: editingEvent.exhibition_id || '',
        start_date: editingEvent.start_date ? new Date(editingEvent.start_date) : null,
        end_date: editingEvent.end_date ? new Date(editingEvent.end_date) : null,
        start_time: editingEvent.start_time ? new Date(`1970-01-01T${editingEvent.start_time}`) : null,
        end_time: editingEvent.end_time ? new Date(`1970-01-01T${editingEvent.end_time}`) : null
      });
    } else {
      setFormData({
        service_name: '',
        exhibition_id: '',
        start_date: null,
        end_date: null,
        start_time: null,
        end_time: null
      });
    }
    setError('');
  }, [editingEvent, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.service_name || !formData.start_date || !formData.end_date) {
      setError('გთხოვთ შეავსოთ ყველა საჭირო ველი');
      return;
    }

    if (formData.start_date > formData.end_date) {
      setError('დასაწყისის თარიღი არ უნდა იყოს დასასრულის თარიღზე მეტი');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (newValue, field) => {
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  const handleTimeChange = (newValue, field) => {
    setFormData(prev => ({ ...prev, [field]: newValue }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Typography variant="h6">
            {editingEvent ? 'ივენთის რედაქტირება' : 'ახალი ივენთის დამატება'}
          </Typography>
          <IconButton
            edge="end"
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                name="service_name"
                label="ივენთის სახელი"
                value={formData.service_name}
                onChange={handleChange}
                fullWidth
                required
                variant="outlined"
              />

              <FormControl fullWidth>
                <InputLabel>გამოფენა</InputLabel>
                <Select
                  name="exhibition_id"
                  value={formData.exhibition_id}
                  onChange={handleChange}
                  label="გამოფენა"
                >
                  <MenuItem value="">აირჩიეთ გამოფენა</MenuItem>
                  {exhibitions && Array.isArray(exhibitions) && exhibitions.map((exhibition) => (
                    <MenuItem key={exhibition.id} value={exhibition.id}>
                      {exhibition.exhibition_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="დაწყების თარიღი"
                  value={formData.start_date}
                  onChange={(newValue) => handleDateChange(newValue, 'start_date')}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />

                <DatePicker
                  label="დასრულების თარიღი"
                  value={formData.end_date}
                  onChange={(newValue) => handleDateChange(newValue, 'end_date')}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TimePicker
                  label="დაწყების საათი"
                  value={formData.start_time}
                  onChange={(newValue) => handleTimeChange(newValue, 'start_time')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />

                <TimePicker
                  label="დასრულების საათი"
                  value={formData.end_time}
                  onChange={(newValue) => handleTimeChange(newValue, 'end_time')}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              color="inherit"
            >
              გაუქმება
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                }
              }}
            >
              {editingEvent ? 'განახლება' : 'დამატება'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EventForm;