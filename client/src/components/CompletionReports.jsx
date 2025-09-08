
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  CircularProgress,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Stack,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack,
  Assessment,
  People,
  AttachMoney,
  Business,
  Event,
  Archive
} from '@mui/icons-material';

const CompletionReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/event-completion-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        console.error('Error fetching reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/event-completion-reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'გადახდილი':
        return 'success';
      case 'მომლოდინე':
        return 'warning';
      case 'გაუქმებული':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            იტვირთება...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {selectedReport ? (
        <Paper elevation={3} sx={{ overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: 'white',
              p: 3
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => setSelectedReport(null)}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: alpha('#ffffff', 0.1)
                  }
                }}
              >
                <ArrowBack />
              </IconButton>
              <Box flex={1}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                  {selectedReport.event_name}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 1 }}>
                  <Event sx={{ mr: 1, verticalAlign: 'middle' }} />
                  დასრულდა: {formatDate(selectedReport.completion_date)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Summary Cards */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              მოკლე ანგარიში
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {selectedReport.total_participants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      მონაწილეები
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Business sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {selectedReport.total_booths}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      სტენდები
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {selectedReport.total_revenue?.toFixed(2)} ₾
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      მთლიანი შემოსავალი
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card elevation={2}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {selectedReport.total_equipment_revenue?.toFixed(2)} ₾
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      აღჭურვილობის შემოსავალი
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Notes Section */}
          {selectedReport.notes && (
            <>
              <Divider />
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                  შენიშვნები
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedReport.notes}
                  </Typography>
                </Paper>
              </Box>
            </>
          )}

          {/* Participants Table */}
          <Divider />
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              არქივირებული მონაწილეები
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>კომპანია</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>სტენდი</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ზომა (მ²)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>გადახდის სტატუსი</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>თანხა</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedReport.archived_participants?.map((participant) => (
                    <TableRow key={participant.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {participant.company_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{participant.booth_number || '-'}</TableCell>
                      <TableCell>{participant.booth_size || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={participant.payment_status}
                          color={getPaymentStatusColor(participant.payment_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {participant.payment_amount?.toFixed(2)} ₾
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      ) : (
        <Box>
          <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
            <Archive sx={{ mr: 2, verticalAlign: 'middle' }} />
            დასრულებული ივენთების ანგარიშები
          </Typography>

          {reports.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Archive sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                დასრულებული ივენთები არ არის
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {reports.map((report) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={report.id}>
                  <Card elevation={2} sx={{ height: '100%' }}>
                    <CardActionArea
                      onClick={() => fetchReportDetails(report.id)}
                      sx={{ height: '100%', p: 0 }}
                    >
                      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                          <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', flex: 1 }}>
                            {report.event_name}
                          </Typography>
                          <Chip
                            label={formatDate(report.completion_date)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>

                        <Box sx={{ flex: 1 }}>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                მონაწილეები:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {report.total_participants}
                              </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                შემოსავალი:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                {report.total_revenue?.toFixed(2)} ₾
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="text.secondary">
                          შექმნა: {report.created_by_username}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
    </Container>
  );
};

export default CompletionReports;
