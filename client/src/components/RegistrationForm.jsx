import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Container
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { authAPI } from '../services/api';

const RegistrationForm = ({ showNotification }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('პაროლები არ ემთხვევა!');
      return;
    }

    if (password.length < 6) {
      setError('პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან');
      return;
    }

    setLoading(true);

    try {
      const data = await authAPI.register({ username, password });

      if (showNotification) {
        showNotification('რეგისტრაცია წარმატებით დასრულდა!', 'success');
      }
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('შეცდომა რეგისტრაციისას:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('დაფიქსირდა შეცდომა სერვერთან კავშირისას.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <PersonAddIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            რეგისტრაცია
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="სახელი"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="პაროლი"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            helperText="მინიმუმ 6 სიმბოლო"
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="გაიმეორეთ პაროლი"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              mt: 3, 
              mb: 2,
              py: 1.5,
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
              }
            }}
          >
            {loading ? 'რეგისტრაცია...' : 'რეგისტრაცია'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegistrationForm;