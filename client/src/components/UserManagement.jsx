
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Alert,
  Tooltip,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManagerIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { usersAPI } from '../services/api';

const UserManagement = ({ showNotification, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('მომხმარებლების ჩატვირთვა ვერ მოხერხდა');
      showNotification('მომხმარებლების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'user' });
    setOpenForm(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData = { username: formData.username, role: formData.role };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersAPI.update(editingUser.id, updateData);
        showNotification('მომხმარებელი წარმატებით განახლდა', 'success');
      } else {
        await usersAPI.create(formData);
        showNotification('მომხმარებელი წარმატებით შეიქმნა', 'success');
      }
      setOpenForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showNotification(
        editingUser ? 'მომხმარებლის განახლება ვერ მოხერხდა' : 'მომხმარებლის შექმნა ვერ მოხერხდა',
        'error'
      );
    }
  };

  const handleDeleteUser = async (id) => {
    if (currentUser.userId === id) {
      showNotification('საკუთარი ანგარიშის წაშლა შეუძლებელია', 'error');
      return;
    }

    if (window.confirm('დარწმუნებული ხართ, რომ გსურთ ამ მომხმარებლის წაშლა?')) {
      try {
        await usersAPI.delete(id);
        showNotification('მომხმარებელი წარმატებით წაიშალა', 'success');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('მომხმარებლის წაშლა ვერ მოხერხდა', 'error');
      }
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <AdminIcon color="error" />;
      case 'manager': return <ManagerIcon color="warning" />;
      default: return <PersonIcon color="primary" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'ადმინისტრატორი';
      case 'manager': return 'მენეჯერი';
      case 'user': return 'მომხმარებელი';
      default: return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            მომხმარებლების მართვა
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)'
              }
            }}
          >
            ახალი მომხმარებელი
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="ძიება მომხმარებლის სახელით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>როლი</InputLabel>
              <Select
                value={roleFilter}
                label="როლი"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">ყველა</MenuItem>
                <MenuItem value="admin">ადმინისტრატორი</MenuItem>
                <MenuItem value="manager">მენეჯერი</MenuItem>
                <MenuItem value="user">მომხმარებელი</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
              }}
              startIcon={<ClearIcon />}
              fullWidth
              sx={{ height: '56px' }}
            >
              გასუფთავება
            </Button>
          </Grid>
        </Grid>

        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>მომხმარებელი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>როლი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>შექმნის თარიღი</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="h6" color="text.secondary">
                      მომხმარებლები ვერ მოიძებნა
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow 
                    key={user.id} 
                    sx={{ 
                      '&:hover': { 
                        bgcolor: 'action.hover',
                        transform: 'scale(1.01)',
                        transition: 'all 0.2s ease'
                      } 
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {user.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ka-GE') : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="რედაქტირება">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditUser(user)}
                            sx={{ 
                              color: 'info.main',
                              '&:hover': { bgcolor: 'info.light', color: 'white' }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="წაშლა">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={currentUser.userId === user.id}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { bgcolor: 'error.light', color: 'white' },
                              '&:disabled': { color: 'action.disabled' }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'მომხმარებლის რედაქტირება' : 'ახალი მომხმარებლის შექმნა'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="მომხმარებლის სახელი"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="პაროლი"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                margin="normal"
                required={!editingUser}
                helperText={editingUser ? "ცარიელი ტოვება შემთხვევაში პაროლი არ შეიცვლება" : ""}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>როლი</InputLabel>
                <Select
                  value={formData.role}
                  label="როლი"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="user">მომხმარებელი</MenuItem>
                  <MenuItem value="manager">მენეჯერი</MenuItem>
                  <MenuItem value="admin">ადმინისტრატორი</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>
              გაუქმება
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.username || (!editingUser && !formData.password)}
            >
              {editingUser ? 'განახლება' : 'შექმნა'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default UserManagement;
