
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
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Construction as ConstructionIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import EquipmentForm from './EquipmentForm';
import { equipmentAPI } from '../services/api';

const EquipmentList = ({ showNotification }) => {
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEquipment = async () => {
    try {
      const data = await equipmentAPI.getAll();
      setEquipment(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    const filtered = equipment.filter(item =>
      item.code_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEquipment(filtered);
  }, [equipment, searchTerm]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ აღჭურვილობის წაშლა?');
    if (!isConfirmed) return;

    try {
      await equipmentAPI.delete(id);
      showNotification('აღჭურვილობა წარმატებით წაიშალა!', 'success');
      fetchEquipment();
    } catch (error) {
      showNotification('შეცდომა სერვერთან კავშირისას', 'error');
    }
  };

  const handleEquipmentUpdated = () => {
    setEditingId(null);
    fetchEquipment();
  };

  const getStatusColor = (quantity) => {
    if (quantity === 0) return 'error';
    if (quantity < 5) return 'warning';
    return 'success';
  };

  const getStatusText = (quantity) => {
    if (quantity === 0) return 'არ არის';
    if (quantity < 5) return 'მცირე';
    return 'საკმარისი';
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
          <ConstructionIcon fontSize="large" />
          აღჭურვილობა
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditingId(0)}
          size="large"
        >
          აღჭურვილობის დამატება
        </Button>
      </Box>

      {/* Equipment Form Modal */}
      {editingId !== null && (
        <EquipmentForm
          equipmentToEdit={equipment.find(e => e.id === editingId)}
          onEquipmentUpdated={handleEquipmentUpdated}
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
          placeholder="ძიება კოდით ან აღწერით..."
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />
      </Paper>

      {/* Equipment Table */}
      {filteredEquipment.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {equipment.length === 0 ? 'აღჭურვილობა არ მოიძებნა.' : 'ძიების შედეგად აღჭურვილობა ვერ მოიძებნა.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>სურათი</TableCell>
                <TableCell>კოდი</TableCell>
                <TableCell>აღწერა</TableCell>
                <TableCell>რაოდენობა</TableCell>
                <TableCell>ფასი (₾)</TableCell>
                <TableCell>შექმნის თარიღი</TableCell>
                <TableCell align="center">მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Avatar
                      src={item.image_url}
                      alt={item.code_name}
                      sx={{ width: 50, height: 50 }}
                      variant="rounded"
                    >
                      <ConstructionIcon />
                    </Avatar>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {item.code_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {item.description 
                        ? (item.description.length > 80 
                          ? `${item.description.substring(0, 80)}...` 
                          : item.description)
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InventoryIcon fontSize="small" sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" fontWeight="medium">
                        {item.quantity}
                      </Typography>
                      <Chip
                        label={getStatusText(item.quantity)}
                        color={getStatusColor(item.quantity)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="body2">
                        {item.price || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(item.created_at).toLocaleDateString('ka-GE')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="რედაქტირება">
                        <IconButton
                          color="primary"
                          onClick={() => setEditingId(item.id)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="წაშლა">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(item.id)}
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
          სულ: {filteredEquipment.length} აღჭურვილობა
        </Typography>
      </Box>
    </Container>
  );
};

export default EquipmentList;
