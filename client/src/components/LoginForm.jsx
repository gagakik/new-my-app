import React, { useState } from 'react';
import { Container, Paper, Box, TextField, Button, Typography, Alert, IconButton, InputAdornment } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './AuthForms.css'; // This CSS file might be redundant now if all styling is done via MUI sx prop
import { authAPI } from '../services/api';

const LoginForm = ({ onLogin, showNotification }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // This function is intended to be called by the parent component to handle successful login.
  // It receives role, token, userId, and username as arguments.
  const onLoginSuccess = (role, token, userId, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ userId, username, role }));
    if (showNotification) {
      showNotification(`წარმატებით შეხვედით, ${username}!`, 'success');
    }
    onLogin({ userId, username, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login({ username, password });

      onLoginSuccess(data.role, data.token, data.userId, data.username);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('შეცდომა შესვლისას:', error);

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
          <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            შესვლა
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
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
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
              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0056b3 0%, #004085 100%)'
              }
            }}
          >
            {loading ? 'შესვლა...' : 'შესვლა'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginForm;