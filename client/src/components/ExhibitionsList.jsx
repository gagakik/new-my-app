
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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import ExhibitionForm from './ExhibitionForm';

const ExhibitionsList = ({ showNotification }) => {
  const [exhibitions, setExhibitions] = useState([]);
  const [filteredExhibitions, setFilteredExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExhibitions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/exhibitions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExhibitions(data);
      } else {
        throw new Error('გამოფენების ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExhibitions();
  }, []);

  useEffect(() => {
    const filtered = exhibitions.filter(exhibition =>
      exhibition.exhibition_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exhibition.manager?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredExhibitions(filtered);
  }, [exhibitions, searchTerm]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ გამოფენის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exhibitions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showNotification('გამოფენა წარმატებით წაიშალა!', 'success');
        fetchExhibitions();
      } else {
        const errorData = await response.json();
        showNotification(`წაშლა ვერ მოხერხდა: ${errorData.message}`, 'error');
      }
    } catch (error) {
      showNotification('შეცდომა სერვერთან კავშირისას', 'error');
    }
  };

  const handleExhibitionUpdated = () => {
    setEditingId(null);
    fetchExhibitions();
  };

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
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon fontSize="large" />
          გამოფენები
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditingId(0)}
          size="large"
        >
          გამოფენის დამატება
        </Button>
      </Box>

      {/* Exhibition Form Modal */}
      {editingId !== null && (
        <ExhibitionForm
          exhibitionToEdit={exhibitions.find(e => e.id === editingId)}
          onExhibitionUpdated={handleExhibitionUpdated}
          showNotification={showNotification}
        />
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="ძიება"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ძიება გამოფენის სახელით ან მენეჯერით..."
        />
      </Paper>

      {/* Exhibitions Table */}
      {filteredExhibitions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {exhibitions.length === 0 ? 'გამოფენები არ მოიძებნა.' : 'ძიების შედეგად გამოფენები ვერ მოიძებნა.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>გამოფენის სახელი</TableCell>
                <TableCell>მენეჯერი</TableCell>
                <TableCell>ფასი მ²-ზე (₾)</TableCell>
                <TableCell>შექმნის თარიღი</TableCell>
                <TableCell align="center">მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExhibitions.map((exhibition) => (
                <TableRow key={exhibition.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {exhibition.exhibition_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {exhibition.manager || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="body2">
                        {exhibition.price_per_sqm || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(exhibition.created_at).toLocaleDateString('ka-GE')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="რედაქტირება">
                        <IconButton
                          color="primary"
                          onClick={() => setEditingId(exhibition.id)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="წაშლა">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(exhibition.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          სულ: {filteredExhibitions.length} გამოფენა
        </Typography>
      </Box>
    </Container>
  );
};

export default ExhibitionsList;
