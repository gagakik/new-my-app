
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Event,
  Business,
  Store,
  AspectRatio,
  CheckCircle,
  Pending,
  Cancel,
  Info,
  LocationOn,
  Phone,
  Email
} from '@mui/icons-material';

const EventInfo = () => {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const data = {
      event: params.get('event'),
      company: params.get('company'),
      booth: params.get('booth'),
      size: params.get('size'),
      status: params.get('status')
    };
    
    setEventData(data);
    setLoading(false);
  }, [location]);

  const getStatusInGeorgian = (status) => {
    const statusMap = {
      'registered': 'რეგისტრირებული',
      'approved': 'დადასტურებული',
      'pending': 'მოლოდინში',
      'cancelled': 'გაუქმებული'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'registered': 'info',
      'approved': 'success',
      'pending': 'warning',
      'cancelled': 'error'
    };
    return colorMap[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'registered': <Info />,
      'approved': <CheckCircle />,
      'pending': <Pending />,
      'cancelled': <Cancel />
    };
    return iconMap[status] || <Info />;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (!eventData || !eventData.event) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          ივენთის ინფორმაცია ვერ მოიძებნა
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={4}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        {/* Header Section */}
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              mb: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            EXPO GEORGIA
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              opacity: 0.9,
              fontWeight: 300,
              letterSpacing: 1
            }}
          >
            Exhibition & Convention Center
          </Typography>
        </Box>

        {/* Event Details Card */}
        <Box sx={{ p: 3 }}>
          <Card 
            elevation={6}
            sx={{ 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                {/* Event Name */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 600,
                      mb: 1
                    }}
                  >
                    {eventData.event}
                  </Typography>
                  <Divider sx={{ mx: 'auto', width: '60%' }} />
                </Box>

                {/* Company Info */}
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '2px solid #667eea'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Business sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {eventData.company}
                    </Typography>
                  </Box>
                </Card>

                {/* Booth Information Grid */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
                        border: '1px solid #fc8181'
                      }}
                    >
                      <Stack spacing={1} alignItems="center">
                        <Store sx={{ color: '#e53e3e', fontSize: 32 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          სტენდის ნომერი
                        </Typography>
                        <Typography variant="h5" sx={{ color: '#e53e3e', fontWeight: 700 }}>
                          #{eventData.booth}
                        </Typography>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
                        border: '1px solid #68d391'
                      }}
                    >
                      <Stack spacing={1} alignItems="center">
                        <AspectRatio sx={{ color: '#38a169', fontSize: 32 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          სტენდის ზომა
                        </Typography>
                        <Typography variant="h5" sx={{ color: '#38a169', fontWeight: 700 }}>
                          {eventData.size} მ²
                        </Typography>
                      </Stack>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: '100%',
                        background: 'linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%)',
                        border: '1px solid #63b3ed'
                      }}
                    >
                      <Stack spacing={1} alignItems="center">
                        {getStatusIcon(eventData.status)}
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          სტატუსი
                        </Typography>
                        <Chip
                          label={getStatusInGeorgian(eventData.status)}
                          color={getStatusColor(eventData.status)}
                          variant="filled"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            px: 1
                          }}
                        />
                      </Stack>
                    </Card>
                  </Grid>
                </Grid>

                {/* Contact Information */}
                <Card 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                    border: '1px solid #cbd5e0'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'primary.main', 
                      fontWeight: 600, 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Info sx={{ color: 'primary.main' }} />
                    საკონტაქტო ინფორმაცია
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn sx={{ color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          მისამართი:
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        წერეთლის გამზ. №118, თბილისი
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Phone sx={{ color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          ტელეფონი:
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        +995 322 341 100
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Email sx={{ color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          Email:
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        info@expogeorgia.ge
                      </Typography>
                    </Grid>
                  </Grid>
                </Card>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventInfo;
