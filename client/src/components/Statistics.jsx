
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  EventAvailable as EventAvailableIcon
} from '@mui/icons-material';
import { statisticsAPI } from '../services/api';

const Statistics = ({ showNotification }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await statisticsAPI.getOverview();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
      showNotification('სტატისტიკის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  const StatCard = ({ title, value, icon, color, trend, description }) => (
    <Card 
      elevation={3} 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        },
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        borderLeft: 4,
        borderLeftColor: color
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
          {trend && (
            <Chip 
              icon={<TrendingUpIcon />} 
              label={`+${trend}%`} 
              color="success" 
              size="small" 
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: color, mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'medium', mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <DashboardIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            სტატისტიკა და ანალიტიკა
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="სულ ღონისძიებები"
              value={stats?.totalEvents || 0}
              icon={<EventIcon sx={{ fontSize: 48 }} />}
              color="#1976d2"
              description="ყველა რეგისტრირებული ღონისძიება"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="კომპანიები"
              value={stats?.totalCompanies || 0}
              icon={<BusinessIcon sx={{ fontSize: 48 }} />}
              color="#2e7d32"
              description="რეგისტრირებული კომპანიების რაოდენობა"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="მონაწილეები"
              value={stats?.totalParticipants || 0}
              icon={<PeopleIcon sx={{ fontSize: 48 }} />}
              color="#ed6c02"
              description="ღონისძიებებში რეგისტრირებული მონაწილეები"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="სრული შემოსავალი"
              value={`${stats?.totalRevenue || 0} ₾`}
              icon={<MoneyIcon sx={{ fontSize: 48 }} />}
              color="#d32f2f"
              description="ყველა ღონისძიებიდან მიღებული შემოსავალი"
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <EventAvailableIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                აქტიური ღონისძიებები
              </Typography>
            </Box>
            
            {stats?.activeEvents && stats.activeEvents.length > 0 ? (
              <List>
                {stats.activeEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <EventIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {event.service_name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {event.exhibition_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.start_date && new Date(event.start_date).toLocaleDateString('ka-GE')}
                              {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString('ka-GE')}`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < stats.activeEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                აქტიური ღონისძიებები არ მოიძებნა
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AssignmentIcon sx={{ fontSize: 32, color: 'success.main', mr: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ბოლო ღონისძიებები
              </Typography>
            </Box>
            
            {stats?.recentEvents && stats.recentEvents.length > 0 ? (
              <List>
                {stats.recentEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <EventIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {event.service_name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              მონაწილეები: {event.participant_count || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.created_at && new Date(event.created_at).toLocaleDateString('ka-GE')}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < stats.recentEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                ბოლო ღონისძიებები არ მოიძებნა
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Statistics;
