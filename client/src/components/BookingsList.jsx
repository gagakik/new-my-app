
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Box,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import BookingForm from './BookingForm';

const BookingsList = ({ showNotification, userRole }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  const fetchBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 
      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა');
      }

      const response = await fetch('/api/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა ჯავშნების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        showNotification('ჯავშნის სტატუსი წარმატებით განახლდა!', 'success');
        fetchBookings();
      } else {
        const errorData = await response.json();
        showNotification(`სტატუსის განახლება ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა სტატუსის განახლებისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleDeleteBooking = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ ჯავშნის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('ჯავშანი წარმატებით წაიშალა!', 'success');
        fetchBookings();
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა ჯავშნის წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };
  
  const handleBookingUpdated = () => {
    setEditingId(null);
    fetchBookings();
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          იტვირთება...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          შეცდომა: {error}
        </Alert>
      </Container>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const getStatusChip = (status) => {
    const statusMap = {
      pending: { label: 'მუშავდება', color: 'warning' },
      confirmed: { label: 'დადასტურებული', color: 'success' },
      cancelled: { label: 'გაუქმებული', color: 'error' },
      completed: { label: 'დასრულებული', color: 'default' }
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'default' };
    return (
      <Chip 
        label={statusInfo.label} 
        color={statusInfo.color}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Typography 
          variant="h4" 
          component="h2"
          align="center"
          sx={{
            mb: 4,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          ჯავშნები
        </Typography>
        
        {editingId !== null && (
           <Box sx={{ mb: 3 }}>
             <BookingForm 
                bookingToEdit={bookings.find(b => b.id === editingId)} 
                onBookingUpdated={handleBookingUpdated} 
                showNotification={showNotification} 
             />
           </Box>
        )}
        
        {bookings.length === 0 ? (
          <Alert severity="info" sx={{ textAlign: 'center' }}>
            ჯავშნები არ მოიძებნა.
          </Alert>
        ) : (
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 2,
              boxShadow: (theme) => theme.shadows[4]
            }}
          >
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow 
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>სერვისი</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>გამოფენა</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>კომპანია</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>ჯავშნის თარიღი</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>დრო</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 700 }}>სტატუსი</TableCell>
                  {isAuthorizedForManagement && (
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>მოქმედებები</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking, index) => (
                  <TableRow 
                    key={booking.id}
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(103, 126, 234, 0.1)',
                        transform: 'scale(1.001)',
                        transition: 'all 0.2s ease'
                      },
                    }}
                  >
                    <TableCell>{booking.service_name}</TableCell>
                    <TableCell>{booking.exhibition_name}</TableCell>
                    <TableCell>{booking.company_name}</TableCell>
                    <TableCell>{formatDate(booking.booking_date)}</TableCell>
                    <TableCell>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </TableCell>
                    <TableCell>{getStatusChip(booking.status)}</TableCell>
                    {isAuthorizedForManagement && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={booking.status}
                              onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                              variant="outlined"
                              size="small"
                            >
                              <MenuItem value="pending">მუშავდება</MenuItem>
                              <MenuItem value="confirmed">დადასტურებული</MenuItem>
                              <MenuItem value="completed">დასრულებული</MenuItem>
                              <MenuItem value="cancelled">გაუქმებული</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <Tooltip title="ჯავშნის რედაქტირება">
                            <IconButton
                              onClick={() => setEditingId(booking.id)}
                              color="primary"
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="ჯავშნის წაშლა">
                            <IconButton
                              onClick={() => handleDeleteBooking(booking.id)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default BookingsList;
