
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  EventAvailable as EventIcon
} from '@mui/icons-material';

const EventReports = ({ eventId, eventName, showNotification }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchReportData();
    }
  }, [eventId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/reports`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportType) => {
    try {
      const response = await fetch(`/api/events/${eventId}/reports/${reportType}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${eventName}_${reportType}_report.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('რეპორტი წარმატებით გადმოიწერა', 'success');
      } else {
        showNotification('რეპორტის გადმოწერა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      showNotification('რეპორტის გადმოწერა ვერ მოხერხდა', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!reportData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        მონაცემები არ არის ხელმისაწვდომი
      </Alert>
    );
  }

  const {
    totalParticipants = 0,
    totalRevenue = 0,
    paidParticipants = 0,
    pendingPayments = 0,
    participantsByCategory = [],
    revenueByCategory = []
  } = reportData;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold'
      }}>
        <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        {eventName} - ანგარიშები
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {totalParticipants}
                  </Typography>
                  <Typography variant="body2">
                    მონაწილეები
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div">
                    ₾{totalRevenue.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    მთლიანი შემოსავალი
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {paidParticipants}
                  </Typography>
                  <Typography variant="body2">
                    გადახდილი
                  </Typography>
                </Box>
                <EventIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div">
                    {pendingPayments}
                  </Typography>
                  <Typography variant="body2">
                    მოლოდინში
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          რეპორტების გადმოწერა
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => downloadReport('participants')}
              fullWidth
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                }
              }}
            >
              მონაწილეების ჩამონათვალი
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => downloadReport('financial')}
              fullWidth
              sx={{ 
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                }
              }}
            >
              ფინანსური ანგარიში
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => downloadReport('detailed')}
              fullWidth
              sx={{ 
                background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #138496 0%, #117a8b 100%)'
                }
              }}
            >
              დეტალური ანგარიში
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Category Statistics */}
      {participantsByCategory.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            სტატისტიკა კატეგორიების მიხედვით
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>კატეგორია</strong></TableCell>
                  <TableCell><strong>მონაწილეები</strong></TableCell>
                  <TableCell><strong>შემოსავალი</strong></TableCell>
                  <TableCell><strong>სტატუსი</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {participantsByCategory.map((category, index) => {
                  const revenue = revenueByCategory.find(r => r.category === category.category);
                  return (
                    <TableRow key={index}>
                      <TableCell>{category.category}</TableCell>
                      <TableCell>{category.count}</TableCell>
                      <TableCell>₾{revenue ? revenue.amount.toFixed(2) : '0.00'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={category.count > 0 ? 'აქტიური' : 'არარქტიური'}
                          color={category.count > 0 ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default EventReports;
