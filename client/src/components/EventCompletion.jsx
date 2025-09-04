
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
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const EventCompletion = ({ eventId, eventName, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEventStatistics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/annual-services/${eventId}/statistics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setStatistics(data);
        } else {
          setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setError('სერვერთან კავშირის შეცდომა');
      } finally {
        setLoading(false);
      }
    };

    fetchEventStatistics();
  }, [eventId]);

  const handleComplete = async () => {
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/annual-services/${eventId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'ივენთის დასრულება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Error completing event:', error);
      setError('სერვერთან კავშირის შეცდომა');
    } finally {
      setSubmitting(false);
    }
  };

  const statItems = [
    { label: 'მონაწილეები', value: statistics.totalParticipants || 0, color: 'primary' },
    { label: 'კომპანიები', value: statistics.totalCompanies || 0, color: 'secondary' },
    { label: 'სტენდები', value: statistics.totalBooths || 0, color: 'success' },
    { label: 'შემოსავალი', value: `${statistics.totalRevenue || 0} ₾`, color: 'warning' }
  ];

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon />
          <Typography variant="h6">
            ივენთის დასრულება
          </Typography>
        </Box>
        <IconButton
          edge="end"
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {eventName}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Typography>სტატისტიკის ჩატვირთვა...</Typography>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {statItems.map((item, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Card sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        {item.label}
                      </Typography>
                      <Typography variant="h5" component="div" color={`${item.color}.main`}>
                        {item.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

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

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              გაფრთხილება: ივენთის დასრულების შემდეგ:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>ყველა მონაწილე და მათი მონაცემები არქივირდება</li>
              <li>ივენთი გადაიტანება არქივში</li>
              <li>რედაქტირება აღარ იქნება შესაძლებელი</li>
            </Box>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          disabled={submitting}
        >
          გაუქმება
        </Button>
        <Button
          onClick={handleComplete}
          variant="contained"
          disabled={submitting}
          sx={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
            }
          }}
        >
          {submitting ? 'დასრულება...' : 'დაასრულე ივენთი'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventCompletion;
