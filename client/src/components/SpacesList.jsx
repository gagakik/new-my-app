
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  CalendarToday,
  Close
} from '@mui/icons-material';
import SpaceForm from './SpaceForm';

const SpacesList = ({ showNotification, userRole }) => {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // განსაზღვრეთ, აქვს თუ არა მომხმარებელს სივრცეების მართვის უფლება
  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'manager';

  const fetchSpaces = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა სივრცეების ნახვისთვის');
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/spaces', { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ სივრცეების ნახვის უფლება');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'სივრცეების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setSpaces(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა სივრცეების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ სივრცის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const response = await fetch(`/api/spaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('სივრცე წარმატებით წაიშალა!', 'success');
        fetchSpaces();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (space) => {
    setEditingId(space.id);
    setShowForm(true);
  };

  const handleAddSpaceClick = () => {
    setEditingId(0);
    setShowForm(true);
  };

  const handleSpaceUpdated = () => {
    setEditingId(null);
    setShowForm(false);
    fetchSpaces();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" variant="filled">
          შეცდომა: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 3
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          სივრცეების სია
        </Typography>
        
        {isAuthorizedForManagement && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddSpaceClick}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              ახალი სივრცის დამატება
            </Button>
          </Box>
        )}
      </Paper>

      {spaces.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            სივრცეები არ მოიძებნა.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Desktop Table View */}
          {!isMobile ? (
            <TableContainer 
              component={Paper} 
              elevation={3}
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#495057', justifyContent: 'center' }}>კატეგორია</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#495057' }}>შენობის დასახელება</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#495057' }}>აღწერილობა</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#495057' }}>ფართობი (კვ.მ)</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#495057' }}>განახლებულია</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#495057' }}>მოქმედებები</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spaces.map((space, index) => (
                    <TableRow 
                      key={space.id}
                      sx={{ 
                        '&:nth-of-type(even)': { backgroundColor: '#f8f9fa' },
                        '&:hover': { 
                          backgroundColor: '#e3f2fd',
                          transition: 'background-color 0.3s ease'
                        }
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={space.category} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {space.building_name}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        {space.description}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {space.area_sqm || 'არ არის მითითებული'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {space.updated_by && space.updated_at && (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Person sx={{ fontSize: 16, mr: 0.5, color: '#6c757d' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                                {space.updated_by}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarToday sx={{ fontSize: 14, mr: 0.5, color: '#6c757d' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(space.updated_at).toLocaleDateString('ka-GE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAuthorizedForManagement && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={() => handleEditClick(space)}
                              sx={{
                                color: '#ffffffff',
                                '&:hover': {
                                  backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Edit fontSize="small" />
                            </Button>
                            <Button
                              size="small"
                              onClick={() => handleDelete(space.id)}
                              sx={{
                                color: '#ffffffff',
                                background: 'rgba(220, 53, 69, 1)',
                                '&:hover': {
                                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Delete fontSize="small" />
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Mobile Card View */
            <Grid container spacing={3}>
              {spaces.map((space) => (
                <Grid item xs={12} key={space.id}>
                  <Card 
                    elevation={3}
                    sx={{ 
                      borderRadius: 3,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, color: '#343a40' }}>
                          {space.building_name}
                        </Typography>
                        <Chip 
                          label={space.category} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#495057' }}>
                            ფართობი:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {space.area_sqm || 'არ არის მითითებული'} კვ.მ
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#495057' }}>
                            აღწერილობა:
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right', maxWidth: '60%' }}>
                            {space.description}
                          </Typography>
                        </Box>
                      </Box>

                      {space.updated_by && space.updated_at && (
                        <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Person sx={{ fontSize: 16, mr: 0.5, color: '#6c757d' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                              {space.updated_by}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarToday sx={{ fontSize: 14, mr: 0.5, color: '#6c757d' }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(space.updated_at).toLocaleDateString('ka-GE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                    
                    {isAuthorizedForManagement && (
                      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<Edit />}
                          onClick={() => handleEditClick(space)}
                          sx={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: 2,
                            px: 3,
                            '&:hover': {
                              backgroundColor: '#218838',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          რედაქტირება
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Delete />}
                          onClick={() => handleDelete(space.id)}
                          sx={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            borderRadius: 2,
                            px: 3,
                            '&:hover': {
                              backgroundColor: '#c82333',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          წაშლა
                        </Button>
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Form Dialog */}
      <Dialog 
        open={showForm} 
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: isMobile ? 0 : 3,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingId === 0 ? 'ახალი სივრცის დამატება' : 'სივრცის რედაქტირება'}
          </Typography>
          <IconButton 
            onClick={handleCloseForm}
            sx={{ 
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ 
            maxHeight: isMobile ? 'calc(100vh - 120px)' : '70vh', 
            overflowY: 'auto',
            p: 3
          }}>
            <SpaceForm 
              spaceToEdit={editingId === 0 ? null : spaces.find(s => s.id === editingId)}
              onFormClose={handleCloseForm}
              onSpaceUpdated={handleSpaceUpdated}
              showNotification={showNotification}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default SpacesList;
