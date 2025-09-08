
import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { Login, PersonAdd } from '@mui/icons-material';

const AuthPage = ({ onLoginSuccess, showNotification }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? 'login' : 'register';
    
    console.log('Sending request to:', `/api/${endpoint}`);
    console.log('Request data:', { username, password: '*'.repeat(password.length) });
    
    // Validation
    if (!username.trim() || !password.trim()) {
      setError('მომხმარებლის სახელი და პაროლი აუცილებელია');
      return;
    }

    if (!isLoginView && password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        if (isLoginView) {
          showNotification(data.message, 'success');
          onLoginSuccess(data.role, data.token, data.userId, data.username);
        } else {
          showNotification('რეგისტრაცია წარმატებით დასრულდა. გთხოვთ, შეხვიდეთ სისტემაში.', 'success');
          setIsLoginView(true);
          setUsername('');
          setPassword('');
        }
      } else {
        setError(data.message || 'შეცდომა დაფიქსირდა');
      }
    } catch (error) {
      console.error('Network error:', error);
      setError('ქსელის შეცდომა. გთხოვთ, შეამოწმოთ ინტერნეტ კავშირი.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setIsLoginView(newValue === 0);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }} >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          boxShadow: (theme) => theme.shadows[10],
          transition: 'all 0.3s ease',
          '&:hover': { boxShadow: (theme) => theme.shadows[12] },
          height: '100%',
          minHeight: 500,
          marginBottom: 16
        }}
      >
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2 }} >
          {isLoginView ? (
            <Login 
              sx={{ 
                fontSize: 60, 
                color: 'primary.main',
                mb: 2
              }} 
            />
          ) : (
            <PersonAdd 
              sx={{ 
                fontSize: 60, 
                color: 'primary.main',
                mb: 2
              }} 
            />
          )}
          <Typography 
            variant="h4" 
            component="h1"
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 3
            }}
          >
            ავტორიზაცია
          </Typography>
        </Box>

        <Tabs
          value={isLoginView ? 0 : 1}
          onChange={handleTabChange}
          centered
          aria-label="basic tabs example"
          indicatorColor="#fff"
          variant="scrollable"
          scrollButtons="auto"
          size="large"
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '1rem',
              textTransform: 'none',
              color: '#fff'
            }
          }}
        >
          <Tab label="შესვლა" 
              icon={<Login />} 
              iconPosition="start"
              sx={{borderRadius: '8px 0 0 8px', color: '#fff'}}
          />
          <Tab label="რეგისტრაცია" icon={<PersonAdd />} iconPosition="start" sx={{borderRadius: '0 8px 8px 0', color: '#fff'}} />
        </Tabs>

        <Box sx={{ px: 4, pb: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="მომხმარებლის სახელი"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              margin="normal"
              variant="outlined"
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="პაროლი"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              variant="outlined"
              disabled={loading}
              helperText={!isLoginView ? 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო' : ''}
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (isLoginView ? <Login /> : <PersonAdd />)}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: (theme) => theme.shadows[8]
                },
                transition: 'all 0.3s ease'
              }}
            >
              {loading ? 'იტვირთება...' : (isLoginView ? 'შესვლა' : 'რეგისტრაცია')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthPage;
