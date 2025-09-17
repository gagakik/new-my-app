import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Image as ImageIcon
} from '@mui/icons-material';
import EquipmentForm from './EquipmentForm';

const EquipmentList = ({ showNotification, userRole }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false); // State for showing the new form

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'operation';

  // fetchEquipment ფუნქცია მოთავსებულია useCallback-ში
  const fetchEquipment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('ტოკენი:', token ? 'არსებობს' : 'არ არსებობს');

      if (!token) {
        showNotification('ავტორიზაცია საჭიროა', 'error');
        return;
      }

      const response = await fetch('/api/equipment', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      } else if (response.status === 403) {
        showNotification('წვდომა აკრძალულია. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.', 'error');
        localStorage.removeItem('token');
        window.location.reload();
      } else {
        const errorText = await response.text();
        console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', response.status, errorText);
        showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა.', 'error');
      }
    } catch (error) {
      console.error('შეცდომა აღჭურვილობის მიღებისას:', error);
      showNotification('სერვისი დროებით მიუწვდომელია', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // ფილტრაცია ძიების ტერმინის მიხედვით
  const filteredEquipment = equipment.filter(item =>
    item.code_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ აღჭურვილობის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const response = await fetch(`/api/equipment/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('აღჭურვილობა წარმატებით წაიშალა!', 'success');
        setEquipment(equipment.filter((item) => item.id !== id));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setShowNewForm(false); // Close the new form if it was open
  };

  const handleEquipmentUpdated = () => {
    setEditingId(null);
    setShowNewForm(false); // Close the new form after update
    fetchEquipment();
  };

  // სურათის URL-ის დამუშავება
  const processImageUrl = (url) => {
    if (!url) return null;

    console.log('Processing image URL:', url);

    let cleanUrl = url;
    if (cleanUrl.startsWith('http://0.0.0.0:5000/uploads/')) {
      cleanUrl = cleanUrl.replace('http://0.0.0.0:5000/uploads/', '');
    } else if (cleanUrl.startsWith('/uploads/')) {
      cleanUrl = cleanUrl.replace('/uploads/', '');
    } else if (cleanUrl.startsWith('uploads/')) {
      cleanUrl = cleanUrl.replace('uploads/', '');
    }

    return `/uploads/${cleanUrl}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="primary">
            იტვირთება...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          შეცდომა: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white'
      }}>
        <Typography variant="h4" component="h1" sx={{ 
          textAlign: 'center',
          fontWeight: 600,
          mb: 4,
          textShadow: '0 2px 4px rgba(156, 156, 156, 0.3)'
        }}>
          აღჭურვილობის სია
        </Typography>

        {/* ძიების ველი */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <TextField
            variant="outlined"
            placeholder="ძებნა კოდური სახელით ან აღწერით..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ 
              maxWidth: 500,
              width: '100%',
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: 3
              }
            }}
            InputProps={{
              startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />
            }}
          />
        </Box>

        {isAuthorizedForManagement && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingId(null); // Ensure no item is being edited
                setShowNewForm(true); // Show the new form
              }}
              sx={{
                backgroundColor: 'white',
                color: '#000000ff',
                borderRadius: 25,
                px: 4,
                py: 1.5,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              ახალი აღჭურვილობის დამატება
            </Button>
          </Box>
        )}
      </Box>

      {editingId !== null && (
        <EquipmentForm
          equipmentToEdit={equipment.find(item => item.id === editingId)}
          onEquipmentUpdated={handleEquipmentUpdated}
          onCancel={() => setEditingId(null)}
          showNotification={showNotification}
          userRole={userRole}
        />
      )}

      {showNewForm && (
        <EquipmentForm
          equipmentToEdit={null} // No item to edit when adding new
          onEquipmentUpdated={() => {
            fetchEquipment();
            setShowNewForm(false);
          }}
          onCancel={() => setShowNewForm(false)}
          showNotification={showNotification}
          userRole={userRole}
        />
      )}

      {filteredEquipment.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? 'ძიების კრიტერიუმებით აღჭურვილობა არ მოიძებნა.' : 'აღჭურვილობა არ მოიძებნა.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            mt: 2,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '70vh',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px'
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '10px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#667eea',
              borderRadius: '10px',
              '&:hover': {
                backgroundColor: '#5a6fd8'
              }
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>სურათი</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>კოდური სახელი</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>აღწერა</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '1rem' }}>რაოდენობა</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: '1rem' }}>ფასი</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>შექმნა/განახლება</TableCell>
                {isAuthorizedForManagement && (
                  <TableCell align="center" sx={{ fontWeight: 600, fontSize: '1rem' }}>მოქმედებები</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow 
                  key={item.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: '#f5f7fa',
                    },
                    '&:nth-of-type(odd)': {
                      backgroundColor: '#fafbfc',
                    }
                  }}
                >
                  <TableCell>
                    {item.image_url ? (
                      <Avatar
                        src={processImageUrl(item.image_url)}
                        alt={item.code_name}
                        variant="rounded"
                        sx={{ 
                          width: 60, 
                          height: 60,
                          border: '2px solid #e0e6ed'
                        }}
                        onError={(e) => {
                          console.error('სურათის ჩატვირთვის შეცდომა:', item.image_url);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{ 
                          width: 60, 
                          height: 60,
                          backgroundColor: '#f0f0f0',
                          border: '2px solid #e0e6ed'
                        }}
                      >
                        <ImageIcon sx={{ color: '#999' }} />
                      </Avatar>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'primary.main',
                        fontSize: '1.1rem'
                      }}
                    >
                      {item.code_name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4
                      }}
                      title={item.description}
                    >
                      {item.description || 'აღწერა არ არის მითითებული'}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        color: item.quantity > 0 ? 'success.main' : 'error.main'
                      }}
                    >
                      {item.quantity}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        color: 'success.main'
                      }}
                    >
                      EUR {item.price}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {item.created_by && (
                        <Chip
                          label={`შექმნა: ${item.created_by}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                      {item.updated_by && item.updated_at && (
                        <Chip
                          label={`განახლდა: ${item.updated_by}`}
                          size="small"
                          variant="outlined"
                          color="success"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                      {item.created_at && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.created_at).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  {isAuthorizedForManagement && (
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          onClick={() => handleEditClick(item)}
                          size="small"
                          sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            mb: 0.5,
                            mr: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7' },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(item.id)}
                          size="small"
                          sx={{
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 0.5,
                            py: 0.5,
                            mb: 0.5,
                            mr: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#ff0000ff' },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default EquipmentList;