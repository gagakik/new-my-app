import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Chip,
  useTheme,
  alpha,
  Fade,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarIcon,
  Notes as NotesIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { exhibitionsAPI, companiesAPI, bookingsAPI } from '../services/api';

const BookingForm = ({ bookingToEdit, onBookingUpdated, showNotification }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    exhibitionId: '',
    companyId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  const [exhibitions, setExhibitions] = useState([]);
  const [companies, setCompanies] = useState([]);

  const isEditing = !!bookingToEdit;

  const fetchData = async () => {
    try {
      setDataLoading(true);

      const [exhibitionsData, companiesData] = await Promise.all([
        exhibitionsAPI.getAll(),
        companiesAPI.getAll()
      ]);

      setExhibitions(exhibitionsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('მონაცემების ჩატვირთვისას დაფიქსირდა შეცდომა');
      showNotification('მონაცემების ჩატვირთვისას დაფიქსირდა შეცდომა', 'error');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (isEditing) {
      setFormData({
        exhibitionId: bookingToEdit.exhibition_id || '',
        companyId: bookingToEdit.company_id || '',
        bookingDate: bookingToEdit.booking_date ? bookingToEdit.booking_date.split('T')[0] : '',
        startTime: bookingToEdit.start_time || '',
        endTime: bookingToEdit.end_time || '',
        notes: bookingToEdit.notes || ''
      });
    } else {
      setFormData({
        exhibitionId: '',
        companyId: '',
        bookingDate: '',
        startTime: '',
        endTime: '',
        notes: ''
      });
    }
  }, [bookingToEdit, isEditing]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const bookingData = {
      exhibition_id: parseInt(formData.exhibitionId),
      company_id: parseInt(formData.companyId),
      booking_date: formData.bookingDate,
      start_time: formData.startTime,
      end_time: formData.endTime,
      notes: formData.notes,
    };

    try {
      let data;
      if (isEditing) {
        data = await bookingsAPI.update(bookingToEdit.id, bookingData);
      } else {
        data = await bookingsAPI.create(bookingData);
      }

      showNotification(data.message || (isEditing ? 'ჯავშანი წარმატებით განახლდა!' : 'ჯავშანი წარმატებით დაემატა!'), 'success');
      onBookingUpdated();
    } catch (error) {
      setError(error.message);
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onBookingUpdated();
  };

  if (dataLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper
          elevation={8}
          sx={{
            p: 6,
            borderRadius: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <CircularProgress
            size={60}
            sx={{
              color: theme.palette.primary.main,
              mb: 3
            }}
          />
          <Typography variant="h6" color="text.secondary">
            მონაცემები იტვირთება...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Fade in timeout={600}>
        <Paper
          elevation={12}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              color: 'white',
              p: 4,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                pointerEvents: 'none'
              }
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <EventIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                {isEditing ? 'ჯავშნის რედაქტირება' : 'ახალი ჯავშნის დამატება'}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.9,
                  fontWeight: 400
                }}
              >
                {isEditing ? 'არსებული ჯავშნის მონაცემების განახლება' : 'ახალი ჯავშნის რეგისტრაცია სისტემაში'}
              </Typography>
            </Box>
          </Box>

          {/* Form Content */}
          <Box sx={{ p: 4 }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.5rem'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Exhibition Selection */}
                <Grid item xs={12} md={6}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.secondary.main, 0.3),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardHeader
                      avatar={<EventIcon color="secondary" />}
                      title={
                        <Typography variant="h6" color="secondary" fontWeight={600}>
                          გამოფენა
                        </Typography>
                      }
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <TextField
                        fullWidth
                        select
                        value={formData.exhibitionId}
                        onChange={handleInputChange('exhibitionId')}
                        required
                        variant="outlined"
                        disabled={loading}
                        placeholder="აირჩიეთ გამოფენა"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EventIcon color="action" />
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>აირჩიეთ გამოფენა</em>
                        </MenuItem>
                        {exhibitions.map(exhibition => (
                          <MenuItem key={exhibition.id} value={exhibition.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon fontSize="small" />
                              {exhibition.exhibition_name}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Company Selection */}
                <Grid item xs={12}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.info.main, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.info.main, 0.3),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardHeader
                      avatar={<BusinessIcon color="info" />}
                      title={
                        <Typography variant="h6" color="info.main" fontWeight={600}>
                          კომპანია
                        </Typography>
                      }
                      action={
                        <Tooltip title="მონაცემების განახლება">
                          <IconButton onClick={fetchData} disabled={dataLoading}>
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <TextField
                        fullWidth
                        select
                        value={formData.companyId}
                        onChange={handleInputChange('companyId')}
                        required
                        variant="outlined"
                        disabled={loading}
                        placeholder="აირჩიეთ კომპანია"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BusinessIcon color="action" />
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>აირჩიეთ კომპანია</em>
                        </MenuItem>
                        {companies.map(company => (
                          <MenuItem key={company.id} value={company.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <BusinessIcon fontSize="small" />
                              {company.company_name}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Date and Time Section */}
                <Grid item xs={12}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.success.main, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.success.main, 0.3),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardHeader
                      avatar={<CalendarIcon color="success" />}
                      title={
                        <Typography variant="h6" color="success.main" fontWeight={600}>
                          თარიღი და დრო
                        </Typography>
                      }
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="ჯავშნის თარიღი"
                            type="date"
                            value={formData.bookingDate}
                            onChange={handleInputChange('bookingDate')}
                            required
                            variant="outlined"
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarIcon color="action" />
                                </InputAdornment>
                              )
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="დაწყების დრო"
                            type="time"
                            value={formData.startTime}
                            onChange={handleInputChange('startTime')}
                            required
                            variant="outlined"
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTimeIcon color="action" />
                                </InputAdornment>
                              )
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="დასრულების დრო"
                            type="time"
                            value={formData.endTime}
                            onChange={handleInputChange('endTime')}
                            required
                            variant="outlined"
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTimeIcon color="action" />
                                </InputAdornment>
                              )
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Notes Section */}
                <Grid item xs={12}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      border: `2px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.warning.main, 0.3),
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[8]
                      }
                    }}
                  >
                    <CardHeader
                      avatar={<NotesIcon color="warning" />}
                      title={
                        <Typography variant="h6" color="warning.main" fontWeight={600}>
                          დამატებითი ინფორმაცია
                        </Typography>
                      }
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                      <TextField
                        fullWidth
                        label="კომენტარი"
                        multiline
                        rows={4}
                        value={formData.notes}
                        onChange={handleInputChange('notes')}
                        variant="outlined"
                        disabled={loading}
                        placeholder="დამატებითი კომენტარი ან შენიშვნები..."
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                              <NotesIcon color="action" />
                            </InputAdornment>
                          )
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Action Buttons */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      sx={{
                        px: 6,
                        py: 2,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        borderRadius: 3,
                        minWidth: 200,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        boxShadow: theme.shadows[8],
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: theme.shadows[12],
                          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
                        },
                        '&:active': {
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      {loading ? 'იტვირთება...' : (isEditing ? 'განახლება' : 'დამატება')}
                    </Button>

                    <Button
                      type="button"
                      variant="outlined"
                      size="large"
                      onClick={handleCancel}
                      disabled={loading}
                      startIcon={<CancelIcon />}
                      sx={{
                        px: 6,
                        py: 2,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        borderRadius: 3,
                        minWidth: 200,
                        borderWidth: 2,
                        borderColor: theme.palette.grey[400],
                        color: theme.palette.grey[700],
                        '&:hover': {
                          borderWidth: 2,
                          borderColor: theme.palette.grey[600],
                          backgroundColor: alpha(theme.palette.grey[500], 0.08),
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[4]
                        },
                        '&:active': {
                          transform: 'translateY(0)'
                        },
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      გაუქმება
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

export default BookingForm;