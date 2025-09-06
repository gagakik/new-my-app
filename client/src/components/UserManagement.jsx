
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { usersAPI } from '../services/api';

const UserManagement = ({ showNotification, userRole }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'მომხმარებლების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა მომხმარებლების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const isConfirmed = window.confirm(`ნამდვილად გსურთ მომხმარებლის როლის შეცვლა?`);
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser) {
        showNotification('მომხმარებელი ვერ მოიძებნა', 'error');
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          username: currentUser.username,
          role: newRole 
        }),
      });

      if (response.ok) {
        showNotification('როლი წარმატებით განახლდა!', 'success');
        fetchUsers();
      } else {
        const errorData = await response.json();
        showNotification(`როლის განახლება ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა როლის განახლებისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ მომხმარებლის წაშლა?');
    if (!isConfirmed) return;

    try {
      await usersAPI.delete(userId);
      showNotification('მომხმარებელი წარმატებით წაიშალა!', 'success');
      fetchUsers();
    } catch (error) {
      console.error('შეცდომა მომხმარებლის წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      <Typography 
        variant="h5" 
        component="h2" 
        gutterBottom 
        align="center"
        sx={{ mb: 4, color: 'primary.main', fontWeight: 300 }}
        backgroundColor="background.paper"
        padding={2}
        borderRadius={2}
        boxShadow={3}
        textAlign="center"
        border="1px solid"
        borderColor="divider"
      >
        მომხმარებლების მართვა
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!isMobile ? (
        // Desktop Table View
        <TableContainer 
          component={Paper} 
          elevation={3}
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Table aria-label="user management table" >
            <TableHead >
              <TableRow >
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>სახელი</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>როლი</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>მოქმედება</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user, index) => (
                <TableRow 
                  key={user.id}
                  hover
                  sx={{ 
                    '&:nth-of-type(even)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' }
                  }}
                >
                  <TableCell align="center">{user.id}</TableCell>
                  <TableCell align="center">{user.username}</TableCell>
                  <TableCell align="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        sx={{ fontSize: '0.9rem' }}
                      >
                        <MenuItem value="user">user</MenuItem>
                        <MenuItem value="admin">admin</MenuItem>
                        <MenuItem value="sales">sales</MenuItem>
                        <MenuItem value="marketing">marketing</MenuItem>
                        <MenuItem value="operation">operation</MenuItem>
                        <MenuItem value="finance">finance</MenuItem>
                        <MenuItem value="manager">manager</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() => handleRoleChange(user.id, user.role)}
                      sx={{ fontSize: '0.85rem' }}
                    >
                      განახლება
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        // Mobile Card View
        <Grid container spacing={2}>
          {users.map(user => (
            <Grid item xs={12} key={user.id}>
              <Card 
                elevation={3}
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h6" 
                    component="h3" 
                    gutterBottom
                    sx={{ color: 'primary.main', fontWeight: 600 }}
                  >
                    {user.username}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>ID:</Typography>
                      <Typography variant="body2">{user.id}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>ეიმეილი:</Typography>
                      <Typography variant="body2">{user.email}</Typography>
                    </Box>
                  </Box>

                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>როლი</InputLabel>
                    <Select
                      value={user.role}
                      label="როლი"
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      <MenuItem value="user">user</MenuItem>
                      <MenuItem value="admin">admin</MenuItem>
                      <MenuItem value="sales">sales</MenuItem>
                      <MenuItem value="marketing">marketing</MenuItem>
                      <MenuItem value="operation">operation</MenuItem>
                      <MenuItem value="finance">finance</MenuItem>
                      <MenuItem value="manager">manager</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    fullWidth
                    color="success"
                    onClick={() => handleRoleChange(user.id, user.role)}
                  >
                    განახლება
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default UserManagement;
