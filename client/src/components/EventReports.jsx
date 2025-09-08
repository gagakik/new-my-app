
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  Container,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment,
  Download,
  PictureAsPdf,
  TableChart,
  TrendingUp,
  People,
  AttachMoney,
  Event,
  CheckCircle,
  Schedule,
  Business
} from '@mui/icons-material';

const EventReports = ({ showNotification }) => {
  const [reportType, setReportType] = useState('participants');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState([]);
  const [eventFinancials, setEventFinancials] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchUserStatistics();
    fetchEventFinancials();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('ივენთების მიღების შეცდომა:', error);
    }
  };

  const fetchUserStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/user-companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('იუზერების სტატისტიკის მიღების შეცდომა:', error);
    }
  };

  const fetchEventFinancials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/event-financials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventFinancials(data);
      }
    } catch (error) {
      console.error('ივენთების ფინანსური ანალიზის მიღების შეცდომა:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedEvent && reportType !== 'summary') {
      showNotification('გთხოვთ აირჩიოთ ივენთი', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        type: reportType,
        eventId: selectedEvent,
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      const response = await fetch(`/api/reports/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        showNotification('რეპორტი წარმატებით შეიქმნა', 'success');
      } else {
        const errorText = await response.text();
        console.error('Report error:', response.status, errorText);
        showNotification('რეპორტის შექმნა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('რეპორტის შექმნა ვერ მოხერხდა:', error);
      showNotification('რეპორტის შექმნა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    if (!reportData) return;

    const fileName = `report_${reportType}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      exportToCSV(reportData, fileName);
    } else if (format === 'pdf') {
      exportToPDF(reportData, fileName);
    }
  };

  const exportToCSV = (data, fileName) => {
    if (!data.participants) return;

    const headers = ['კომპანია', 'ქვეყანა', 'სტატუსი', 'გადახდა', 'თანხა', 'რეგისტრაცია'];
    const csvContent = [
      headers.join(','),
      ...data.participants.map(p => [
        p.company_name,
        p.country,
        p.registration_status,
        p.payment_status,
        p.payment_amount || 0,
        new Date(p.registration_date).toLocaleDateString('ka-GE')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    showNotification('PDF ექსპორტი მომზადების ეტაპზეა', 'info');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'paid': return 'success';
      default: return 'default';
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color === 'primary' ? '#1976d2' : 
                                              color === 'success' ? '#2e7d32' :
                                              color === 'warning' ? '#ed6c02' :
                                              color === 'error' ? '#d32f2f' : '#1976d2'} 0%, ${
                      color === 'primary' ? '#1565c0' : 
                      color === 'success' ? '#1b5e20' :
                      color === 'warning' ? '#e65100' :
                      color === 'error' ? '#c62828' : '#1565c0'} 100%)`,
        color: 'white',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {icon}
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderReportData = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'participants':
        return (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="სულ მონაწილეები"
                  value={reportData.totalParticipants || 0}
                  icon={<People sx={{ fontSize: 40 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="დადასტურებული"
                  value={reportData.confirmedParticipants || 0}
                  icon={<CheckCircle sx={{ fontSize: 40 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="გადახდილი"
                  value={reportData.paidParticipants || 0}
                  icon={<AttachMoney sx={{ fontSize: 40 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="შემოსავალი"
                  value={`€${reportData.totalRevenue || '0.00'}`}
                  icon={<TrendingUp sx={{ fontSize: 40 }} />}
                  color="success"
                />
              </Grid>
            </Grid>

            {reportData.participants && reportData.participants.length > 0 && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People />
                    მონაწილეები
                  </Typography>
                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>კომპანია</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>ქვეყანა</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>სტატუსი</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>გადახდის სტატუსი</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>თანხა</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.participants.map((participant, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {participant.company_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{participant.country}</TableCell>
                            <TableCell>
                              <Chip 
                                label={participant.registration_status}
                                color={getStatusColor(participant.registration_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={participant.payment_status}
                                color={getStatusColor(participant.payment_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                €{parseFloat(participant.payment_amount || 0).toFixed(2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 'financial':
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatCard
                title="მოსალოდნელი შემოსავალი"
                value={`€${reportData.expectedRevenue || '0.00'}`}
                icon={<Schedule sx={{ fontSize: 40 }} />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="ფაქტიური შემოსავალი"
                value={`€${reportData.actualRevenue || '0.00'}`}
                icon={<TrendingUp sx={{ fontSize: 40 }} />}
                color="success"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                title="დავალიანება"
                value={`€${reportData.overdueAmount || '0.00'}`}
                icon={<AttachMoney sx={{ fontSize: 40 }} />}
                color="error"
              />
            </Grid>
          </Grid>
        );

      case 'summary':
        return (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="სულ ივენთები"
                  value={reportData.totalEvents || 0}
                  icon={<Event sx={{ fontSize: 40 }} />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="აქტიური ივენთები"
                  value={reportData.activeEvents || 0}
                  icon={<CheckCircle sx={{ fontSize: 40 }} />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="სულ მონაწილეები"
                  value={reportData.totalParticipants || 0}
                  icon={<People sx={{ fontSize: 40 }} />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="ჯამური შემოსავალი"
                  value={`€${reportData.totalRevenue || '0.00'}`}
                  icon={<TrendingUp sx={{ fontSize: 40 }} />}
                  color="success"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business />
                      იუზერების სტატისტიკა
                    </Typography>
                    {userStats && userStats.length > 0 ? (
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>იუზერი</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>კომპანიები</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>ბოლო განახლება</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userStats.map((user, index) => (
                              <TableRow key={index} hover>
                                <TableCell>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {user.username}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={user.companies_count} color="primary" size="small" />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {user.last_update_date ? new Date(user.last_update_date).toLocaleDateString('ka-GE') : 'N/A'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">იუზერების მონაცემები ვერ მოიძებნა</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Assessment />
                      ივენთების ფინანსური ანალიზი
                    </Typography>
                    {eventFinancials && eventFinancials.length > 0 ? (
                      <>
                        <Card variant="outlined" sx={{ mb: 2, p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                          <Typography variant="h6" color="success.contrastText">
                            ჯამური შემოსავალი
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 'bold' }} color="success.contrastText">
                            €{parseFloat(eventFinancials.reduce((sum, event) => sum + parseFloat(event.total_paid || 0), 0)).toFixed(2)}
                          </Typography>
                        </Card>
                        <TableContainer sx={{ maxHeight: 300 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ივენთი</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>მონაწილეები</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>ჯამი</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {eventFinancials.map((event, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                      {event.event_name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip label={event.participants_count} color="primary" size="small" />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      €{parseFloat(event.total_expected || 0).toFixed(2)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    ) : (
                      <Alert severity="info">ფინანსური მონაცემები ვერ მოიძებნა</Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderSpecialReports = () => {
    if (reportType === 'user-companies') {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business />
              იუზერების მიერ დარეგისტრირებული კომპანიები
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>იუზერი</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>დარეგისტრირებული კომპანიები</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ბოლო განახლება</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ბოლო განახლების თარიღი</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userStats.map((user, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Chip label={user.companies_count} color="primary" />
                      </TableCell>
                      <TableCell>{user.last_updated_by || '-'}</TableCell>
                      <TableCell>
                        {user.last_update_date ? new Date(user.last_update_date).toLocaleDateString('ka-GE') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      );
    }

    if (reportType === 'event-financials') {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment />
              ივენთების ფინანსური ანალიზი
            </Typography>
            <Card variant="outlined" sx={{ mb: 3, p: 3, textAlign: 'center', bgcolor: 'success.light' }}>
              <Typography variant="h6" color="success.contrastText">
                ჯამური შემოსავალი ყველა ივენთიდან
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }} color="success.contrastText">
                €{parseFloat(eventFinancials.reduce((sum, event) => sum + parseFloat(event.total_paid || 0), 0)).toFixed(2)}
              </Typography>
            </Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>ივენთი</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>მონაწილეები</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>გადახდილი თანხა</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>მომლოდინე გადახდა</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ჯამი</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventFinancials.map((event, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {event.event_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={event.participants_count} color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>
                          €{parseFloat(event.total_paid || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                          €{parseFloat(event.total_pending || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          €{parseFloat(event.total_expected || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2,
          mb: 3
        }}
      >
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ fontSize: 40 }} />
          ივენთების რეპორტები
        </Typography>
      </Paper>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            რეპორტის პარამეტრები
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>რეპორტის ტიპი</InputLabel>
                <Select
                  value={reportType}
                  label="რეპორტის ტიპი"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="participants">მონაწილეების ანალიზი</MenuItem>
                  <MenuItem value="financial">ფინანსური ანალიზი</MenuItem>
                  <MenuItem value="summary">ზოგადი მიმოხილვა</MenuItem>
                  <MenuItem value="user-companies">იუზერების კომპანიები</MenuItem>
                  <MenuItem value="event-financials">ივენთების ფინანსები</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {!['summary', 'user-companies', 'event-financials'].includes(reportType) && (
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>ივენთი</InputLabel>
                  <Select
                    value={selectedEvent}
                    label="ივენთი"
                    onChange={(e) => setSelectedEvent(e.target.value)}
                  >
                    <MenuItem value="">აირჩიეთ ივენთი</MenuItem>
                    {events.map(event => (
                      <MenuItem key={event.id} value={event.id}>
                        {event.service_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="საწყისი თარიღი"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="ბოლო თარიღი"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="contained"
              onClick={generateReport}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
              sx={{ minWidth: 160 }}
            >
              {loading ? 'იქმნება...' : 'რეპორტის შექმნა'}
            </Button>

            {reportData && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => exportReport('csv')}
                  startIcon={<TableChart />}
                  color="success"
                >
                  CSV ექსპორტი
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => exportReport('pdf')}
                  startIcon={<PictureAsPdf />}
                  color="error"
                >
                  PDF ექსპორტი
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {['user-companies', 'event-financials'].includes(reportType) ? 
        renderSpecialReports() : 
        renderReportData()
      }
    </Container>
  );
};

export default EventReports;
