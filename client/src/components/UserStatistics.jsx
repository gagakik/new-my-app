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
  Person as PersonIcon,
  Event as EventIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { statisticsAPI } from '../services/api';

const UserStatistics = ({ showNotification, userRole, userId }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserStatistics();
  }, [userId]);

  const fetchUserStatistics = async () => {
    try {
      setLoading(true);
      const data = await statisticsAPI.getOverview();
      // Filter data based on user role if needed
      setStatistics(data);
    } catch (err) {
      setError(err.message);
      showNotification('შეცდომა სტატისტიკების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">შეცდომა: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PersonIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          ჩემი სტატისტიკა
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* User Activity Summary */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="primary.main">
                {statistics?.user_events || 0}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                შექმნილი ივენთები
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <BusinessIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="success.main">
                {statistics?.user_companies || 0}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                დამატებული კომპანიები
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="warning.main">
                {statistics?.user_registrations || 0}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                რეგისტრაციები
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="info.main">
                {userRole}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                მომხმარებლის როლი
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                უახლესი აქტივობა
              </Typography>
              <Alert severity="info">
                მომხმარებლის აქტივობის დეტალური სტატისტიკა მალე იქნება ხელმისაწვდომი.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserStatistics;

const UserStatistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserStatistics();
  }, []);

  const fetchUserStatistics = async () => {
    try {
      const response = await statisticsAPI.getOverview();
      setStatistics(response.data || response);
    } catch (error) {
      console.error('სტატისტიკის შეცდომა:', error);
      setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>იტვირთება...</div>;
  if (error) return <div>შეცდომა: {error}</div>;

  return (
    <div className="user-statistics">
      <h2>მომხმარებლების სტატისტიკა</h2>
      <div className="statistics-summary">
        <h3>მიმოხილვა</h3>
        <p>სულ მომხმარებელი: {statistics.length}</p>
        <p>სულ შექმნილი კომპანია: {statistics.reduce((sum, stat) => sum + parseInt(stat.companies_created || 0), 0)}</p>
        <p>სულ შექმნილი აღჭურვილობა: {statistics.reduce((sum, stat) => sum + parseInt(stat.equipment_created || 0), 0)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>მომხმარებელი</th>
            <th>როლი</th>
            <th>შექმნილი კომპანიები</th>
            <th>შექმნილი აღჭურვილობა</th>
            <th>შექმნილი სივრცეები</th>
            <th>შექმნილი გამოფენები</th>
          </tr>
        </thead>
        <tbody>
          {statistics.map(stat => (
            <tr key={stat.id}>
              <td>{stat.username}</td>
              <td>{stat.role}</td>
              <td><strong>{stat.companies_created || 0}</strong></td>
              <td>{stat.equipment_created || 0}</td>
              <td>{stat.spaces_created || 0}</td>
              <td>{stat.exhibitions_created || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserStatistics;