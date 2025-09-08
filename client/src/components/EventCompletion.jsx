
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  Stack
} from '@mui/material';
import {
  Close,
  Warning,
  Assessment,
  People,
  Business,
  AttachMoney
} from '@mui/icons-material';

const EventCompletion = ({ eventId, eventName, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchEventStatistics();
  }, [eventId]);

  const fetchEventStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
        
        // სტატისტიკის გამოთვლა
        const totalParticipants = data.length;
        const totalBooths = data.filter(p => p.booth_number).length;
        const totalRevenue = data.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0);
        
        setStatistics({
          totalParticipants,
          totalBooths,
          totalRevenue
        });
      }
    } catch (error) {
      console.error('Error fetching event statistics:', error);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        const result = await response.json();
        alert('ივენთი წარმატებით დასრულდა და მონაცემები არქივირდა!');
        onSuccess(result.report);
        onClose();
      } else {
        const error = await response.json();
        alert(`შეცდომა: ${error.message}`);
      }
    } catch (error) {
      console.error('Error completing event:', error);
      alert('სერვერის შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          <Typography variant="h6">ივენთის დასრულება</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* ივენთის ინფორმაცია */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 3,
            backgroundColor: '#f8f9fa',
            borderRadius: 2
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
            {eventName}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                elevation={2}
                sx={{
                  textAlign: 'center',
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2
                }}
              >
                <People sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  მონაწილეები
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {statistics.totalParticipants || 0}
                </Typography>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                elevation={2}
                sx={{
                  textAlign: 'center',
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2
                }}
              >
                <Business sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  სტენდები
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                  {statistics.totalBooths || 0}
                </Typography>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Card
                elevation={2}
                sx={{
                  textAlign: 'center',
                  p: 2,
                  backgroundColor: 'white',
                  borderRadius: 2
                }}
              >
                <AttachMoney sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  მთლიანი შემოსავალი
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {statistics.totalRevenue?.toFixed(2) || '0.00'} ₾
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        <Divider sx={{ my: 3 }} />

        {/* შენიშვნების ველი */}
        <Box component="form" onSubmit={handleComplete}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="შენიშვნები (არასავალდებულო)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="შეიყვანეთ დამატებითი შენიშვნები ივენთის შესახებ..."
            sx={{ mb: 3 }}
          />

          {/* გაფრთხილების შეტყობინება */}
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{
              mb: 3,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              გაფრთხილება:
            </Typography>
            <Typography variant="body2" component="div">
              ივენთის დასრულების შემდეგ:
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>ყველა მონაწილე და მათი მონაცემები არქივირდება</li>
                <li>ივენთი გადაინაცვლებს არქივში</li>
                <li>ეს მოქმედება შეუქცევადია</li>
              </Box>
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ minWidth: 120 }}
          >
            გაუქმება
          </Button>
          <Button
            onClick={handleComplete}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'დამუშავება...' : 'ივენთის დასრულება'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default EventCompletion;
