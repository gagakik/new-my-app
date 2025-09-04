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
  Business as BusinessIcon
} from '@mui/icons-material';
import ExhibitionForm from './ExhibitionForm';
import api from '../services/api';

const ExhibitionsList = ({ showNotification }) => {
  const [exhibitions, setExhibitions] = useState([]);
  const [filteredExhibitions, setFilteredExhibitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchExhibitions = async () => {
    try {
      const response = await api.get('/exhibitions');
      setExhibitions(response.data);
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
      await api.delete(`/exhibitions/${id}`);
      showNotification('გამოფენა წარმატებით წაიშალა!', 'success');
      fetchExhibitions();
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