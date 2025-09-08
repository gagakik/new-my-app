
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import {
  People,
  Business,
  Build,
  Home,
  Event,
  TrendingUp
} from '@mui/icons-material';

const UserStatistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    fetchUserStatistics();
  }, []);

  const fetchUserStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/statistics/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('სტატისტიკის შეცდომა:', error);
      setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const summaryStats = [
    {
      title: 'სულ მომხმარებელი',
      value: statistics.length,
      icon: <People />,
      color: '#1976d2',
      gradient: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
    },
    {
      title: 'შექმნილი კომპანიები',
      value: statistics.reduce((sum, stat) => sum + parseInt(stat.companies_created || 0), 0),
      icon: <Business />,
      color: '#f57c00',
      gradient: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)'
    },
    {
      title: 'შექმნილი აღჭურვილობა',
      value: statistics.reduce((sum, stat) => sum + parseInt(stat.equipment_created || 0), 0),
      icon: <Build />,
      color: '#388e3c',
      gradient: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)'
    },
    {
      title: 'შექმნილი სივრცეები',
      value: statistics.reduce((sum, stat) => sum + parseInt(stat.spaces_created || 0), 0),
      icon: <Home />,
      color: '#7b1fa2',
      gradient: 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
          color: 'white',
          p: 4,
          mb: 4,
          borderRadius: 2
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TrendingUp sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              მომხმარებლების სტატისტიკა
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              დეტალური ანალიზი მომხმარებლების აქტივობისა
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              elevation={8}
              sx={{
                borderRadius: 3,
                background: alpha(stat.color, 0.1),
                border: `1px solid ${alpha(stat.color, 0.2)}`,
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px) scale(1.02)',
                  boxShadow: theme.shadows[20],
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: stat.gradient,
                }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: stat.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'white'
                  }}
                >
                  {React.cloneElement(stat.icon, { fontSize: 'large' })}
                </Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Table */}
      <Card elevation={8} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <People />
              დეტალური მიმოხილვა
            </Typography>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                    მომხმარებელი
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                    როლი
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main, textAlign: 'center' }}>
                    კომპანიები
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main, textAlign: 'center' }}>
                    აღჭურვილობა
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main, textAlign: 'center' }}>
                    სივრცეები
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main, textAlign: 'center' }}>
                    გამოფენები
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statistics.map((stat) => (
                  <TableRow 
                    key={stat.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04)
                      },
                      '&:nth-of-type(even)': {
                        backgroundColor: alpha(theme.palette.grey[500], 0.02)
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {stat.username}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                          color: theme.palette.secondary.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      >
                        {stat.role}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#f57c00',
                          display: 'inline-block',
                          minWidth: 32
                        }}
                      >
                        {stat.companies_created || 0}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#388e3c'
                        }}
                      >
                        {stat.equipment_created || 0}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#7b1fa2'
                        }}
                      >
                        {stat.spaces_created || 0}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: '#d32f2f'
                        }}
                      >
                        {stat.exhibitions_created || 0}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
};

export default UserStatistics;
