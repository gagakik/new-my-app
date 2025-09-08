
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Divider,
  Stack,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person,
  Badge,
  CalendarToday,
  Fingerprint,
  CheckCircle,
  AccessTime
} from '@mui/icons-material';

const UserProfile = ({ showNotification, userRole, userName, userId }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        // If API doesn't exist, use localStorage data
        setUserInfo({
          id: userId || localStorage.getItem('userId'),
          username: userName || localStorage.getItem('userName'),
          role: userRole || localStorage.getItem('userRole'),
          created_at: new Date().toISOString() // Default to current date
        });
      }
    } catch (error) {
      console.error('მომხმარებლის ინფორმაციის მიღების შეცდომა:', error);
      // Use localStorage data as fallback
      setUserInfo({
        id: userId || localStorage.getItem('userId'),
        username: userName || localStorage.getItem('userName'),
        role: userRole || localStorage.getItem('userRole'),
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'ადმინისტრატორი',
      'manager': 'მენეჯერი',
      'sales': 'გაყიდვები',
      'marketing': 'მარკეტინგი',
      'operation': 'ოპერაცია',
      'finance': 'ფინანსები',
      'user': 'მომხმარებელი'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const roleColors = {
      'admin': 'error',
      'manager': 'secondary',
      'sales': 'primary',
      'marketing': 'info',
      'operation': 'warning',
      'finance': 'success',
      'user': 'default'
    };
    return roleColors[role] || 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'უცნობი';
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={50} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          p: 4,
          mb: 3,
          borderRadius: 2
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Person sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              მომხმარებლის პროფილი
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              თქვენი ანგარიშის ინფორმაცია
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Profile Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 4 }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}
                >
                  {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {userInfo?.username}
                  </Typography>
                  <Chip
                    label={getRoleDisplayName(userInfo?.role)}
                    color={getRoleColor(userInfo?.role)}
                    icon={<Badge />}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      რეგისტრაციის თარიღი
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formatDate(userInfo?.created_at)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Fingerprint sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      მომხმარებლის ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {userInfo?.id}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                სტატისტიკა
              </Typography>

              <Stack spacing={3}>
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      სტატუსი
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                    აქტიური
                  </Typography>
                </Box>

                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTime sx={{ color: 'info.main', fontSize: 20 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      ბოლო შესვლა
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'info.main' }}>
                    ახლა
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserProfile;
