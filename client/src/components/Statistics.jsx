
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';

const Statistics = ({ showNotification, userRole }) => {
  const [stats, setStats] = useState({
    companies: 0,
    spaces: 0,
    exhibitions: 0,
  });
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    fetchGeneralStatistics();
  }, []);

  const fetchGeneralStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ არის', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/statistics/general', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Statistics data:', data);
        setStats(data);
      } else {
        const errorText = await response.text();
        console.error('Statistics error response:', errorText);
        
        if (response.status === 403) {
          showNotification('წვდომა აკრძალულია. შესაძლოა ტოკენი ვადაგასული იყოს.', 'error');
        } else {
          showNotification(`სტატისტიკის ჩატვირთვა ვერ მოხერხდა (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('სტატისტიკის შეცდომა:', error);
      showNotification('სტატისტიკის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  const statsData = [
    {
      title: 'კომპანიები',
      value: stats.companies,
      icon: '🏢',
      description: 'რეგისტრირებული კომპანიები',
      gradient: 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)',
      bgColor: 'rgba(255, 193, 7, 0.1)'
    },
    {
      title: 'სივრცეები',
      value: stats.spaces,
      icon: '🏛️',
      description: 'ხელმისაწვდომი სივრცეები',
      gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      bgColor: 'rgba(102, 126, 234, 0.1)'
    },
    {
      title: 'გამოფენები',
      value: stats.exhibitions,
      icon: '🎨',
      description: 'ორგანიზებული გამოფენები',
      gradient: 'linear-gradient(135deg, #DC3545 0%, #FFC107 100%)',
      bgColor: 'rgba(220, 53, 69, 0.1)'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        align="center"
        sx={{ 
          mb: 6, 
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        ზოგადი სტატისტიკა
      </Typography>

      <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
        {statsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              elevation={8}
              sx={{
                borderRadius: 3,
                background: stat.bgColor,
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px) scale(1.02)',
                  boxShadow: theme.shadows[20],
                  '&::before': {
                    opacity: 1
                  }
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: stat.gradient,
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  zIndex: -1
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  sx={{
                    fontSize: '3.5rem',
                    mb: 2,
                    display: 'block',
                    transform: 'scale(1)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)'
                    }
                  }}
                >
                  {stat.icon}
                </Box>
                
                <Typography 
                  variant="h6" 
                  component="h3"
                  sx={{ 
                    fontWeight: 600,
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: 'text.primary'
                  }}
                >
                  {stat.title}
                </Typography>
                
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1
                  }}
                >
                  {stat.value}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontWeight: 500,
                    opacity: 0.8
                  }}
                >
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Statistics;
