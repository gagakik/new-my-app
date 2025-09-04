import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Tab,
  Tabs,
  Card,
  CardContent,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Person as PersonIcon,
  Lock as LockIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { authAPI } from '../services/api';

function AuthPage({ onLoginSuccess, showNotification }) {
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authAPI.login(loginData);
      onLoginSuccess(data.role, data.token, data.userId, data.username);
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'შესვლა ვერ მოხერხდა';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      showNotification('პაროლები არ ემთხვევა', 'error');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        username: registerData.username,
        password: registerData.password,
        role: registerData.role
      });
      
      showNotification('რეგისტრაცია წარმატებით დასრულდა!', 'success');
      setActiveTab(0);
      setRegisterData({ username: '', password: '', confirmPassword: '', role: 'user' });
    } catch (error) {
      console.error('Register error:', error);
      const errorMessage = error.response?.data?.message || 'რეგისტრაცია ვერ მოხერხდა';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Expo Georgia Co
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              ღონისძიებების მართვის სისტემა
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="შესვლა" />
              <Tab label="რეგისტრაცია" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="მომხმარებლის სახელი"
                name="username"
                value={loginData.username}
                onChange={handleLoginChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="პაროლი"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={handleLoginChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'მიმდინარეობს...' : 'შესვლა'}
              </Button>
            </Box>
          )}

          {activeTab === 1 && (
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="მომხმარებლის სახელი"
                name="username"
                value={registerData.username}
                onChange={handleRegisterChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="პაროლი"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={registerData.password}
                onChange={handleRegisterChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="პაროლის დადასტურება"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                select
                label="როლი"
                name="role"
                value={registerData.role}
                onChange={handleRegisterChange}
                margin="normal"
                SelectProps={{
                  native: true,
                }}
              >
                <option value="user">მომხმარებელი</option>
                <option value="manager">მენეჯერი</option>
                <option value="admin">ადმინისტრატორი</option>
              </TextField>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? 'მიმდინარეობს...' : 'რეგისტრაცია'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default AuthPage;