
import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete
} from '@mui/icons-material';
import ExhibitionForm from './ExhibitionForm';

const ExhibitionsList = ({ showNotification, userRole }) => {
  const [exhibitions, setExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isAuthorizedForManagement = 
    userRole === 'admin' || 
    userRole === 'sales' || 
    userRole === 'marketing';

  const fetchExhibitions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token'); 

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა გამოფენების ნახვისთვის');
      }

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/exhibitions', {
        headers: headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ ივენთების ნახვის უფლება');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      console.log('მიღებული გამოფენების მონაცემები:', data);
      if (data.length > 0) {
        console.log('პირველი გამოფენის price_per_sqm:', data[0].price_per_sqm);
      }
      setExhibitions(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა გამოფენების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchExhibitions();
  }, [fetchExhibitions]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ გამოფენის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const response = await fetch(`/api/exhibitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('გამოფენა წარმატებით წაიშალა!', 'success');
        setExhibitions(exhibitions.filter((exhibition) => exhibition.id !== id));
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification('დაფიქსირდა შეცდომა სერვერთან კავშირისას.', 'error');
    }
  };

  const handleEditClick = (exhibition) => {
    setEditingId(exhibition.id);
  };

  const handleExhibitionUpdated = () => {
    setEditingId(null);
    fetchExhibitions();
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>იტვირთება...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">შეცდომა: {error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4}}>
      <Paper elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 3
        }} >
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          color: 'white',
          fontWeight: 700,
          textAlign: 'center',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          mb: 4
        }}>
          გამოფენების სია
        </Typography>

        {/* ახალი გამოფენის დამატების ღილაკი */}
        {isAuthorizedForManagement && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setEditingId(0)}
              sx={{ 
                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)' }
              }}
            >
              ახალი გამოფენის დამატება
            </Button>
          </Box>
        )}

        {/* გამოფენის ფორმა */}
        {editingId !== null && isAuthorizedForManagement && (
          <ExhibitionForm 
            exhibitionToEdit={exhibitions.find(e => e.id === editingId)} 
            onExhibitionUpdated={handleExhibitionUpdated} 
            showNotification={showNotification} 
          />
        )}

        {/* გამოფენების სია */}
        {exhibitions.length === 0 ? (
          <Typography textAlign="center" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            გამოფენები არ მოიძებნა.
          </Typography>
        ) : (
          <>
            {/* Desktop Table View */}
            {!isMobile ? (
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.1)' }}>
                      <TableCell align="center"><strong>დასახელება</strong></TableCell>
                      <TableCell align="center"><strong>მენეჯერი</strong></TableCell>
                      <TableCell align="center"><strong>განახლებულია</strong></TableCell>
                      {isAuthorizedForManagement && <TableCell align="center"><strong>მოქმედებები</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{ backgroundColor: 'rgba(102, 126, 234, 0.02)' }}>
                    {exhibitions.map((exhibition, index) => (
                      <TableRow 
                        key={exhibition.id}
                        hover
                        sx={{ 
                          '&:nth-of-type(even)': { 
                            backgroundColor: 'rgba(102, 126, 234, 0.02)' 
                          }
                        }}
                      >
                        <TableCell align="center">
                          <Typography sx={{ fontWeight: 600, color: '#313030ff' }}>
                            ID-{exhibition.id} {exhibition.exhibition_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{exhibition.manager}</TableCell>
                        <TableCell align="center">
                          {exhibition.updated_by && exhibition.updated_at ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {exhibition.updated_by}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(exhibition.updated_at).toLocaleDateString('ka-GE', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        {isAuthorizedForManagement && (
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="რედაქტირება">
                                <IconButton
                                variant="contained"
                                  size="small"
                                  onClick={() => handleEditClick(exhibition)}
                                  sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.2s ease'
                                      }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="წაშლა">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(exhibition.id)}
                                  color="error"
                              sx={{
                                    background: '#ffffffff',
                                    color: '#000000ff',
                                    textTransform: 'none',
                                    boxShadow: '0 0 5px #745ba7', 
                                    px: 1,
                                    py: 1,
                                    borderRadius: 2,
                                    '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#ff0000ff'} ,
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Mobile Card View */
              <Grid container spacing={2}>
                {exhibitions.map(exhibition => (
                  <Grid item xs={12} key={exhibition.id}>
                    <Card elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
                          {exhibition.exhibition_name}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          <strong>მენეჯერი:</strong> {exhibition.manager}
                        </Typography>
                        {exhibition.updated_by && exhibition.updated_at && (
                          <Typography color="text.secondary">
                            <strong>განახლებულია:</strong> {exhibition.updated_by} - {' '}
                            {new Date(exhibition.updated_at).toLocaleDateString('ka-GE', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Typography>
                        )}
                      </CardContent>
                      {isAuthorizedForManagement && (
                        <CardActions>
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => handleEditClick(exhibition)}
                          >
                            რედაქტირება
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Delete />}
                            color="error"
                            onClick={() => handleDelete(exhibition.id)}
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
      </Paper>
    </Container>
  );
};

export default ExhibitionsList;
