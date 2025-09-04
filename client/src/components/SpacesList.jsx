
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Domain as DomainIcon,
  Square as SquareIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import SpaceForm from './SpaceForm';
import api from '../services/api';

const SpacesList = ({ showNotification }) => {
  const [spaces, setSpaces] = useState([]);
  const [filteredSpaces, setFilteredSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  const fetchSpaces = async () => {
    try {
      const response = await api.get('/spaces');
      setSpaces(response.data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    let filtered = spaces;

    if (searchTerm) {
      filtered = filtered.filter(space =>
        space.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(space => space.category === categoryFilter);
    }

    if (buildingFilter) {
      filtered = filtered.filter(space => space.building_name === buildingFilter);
    }

    setFilteredSpaces(filtered);
  }, [spaces, searchTerm, categoryFilter, buildingFilter]);

  const getUniqueCategories = () => {
    const categories = spaces.map(space => space.category).filter(Boolean);
    return [...new Set(categories)].sort();
  };

  const getUniqueBuildings = () => {
    const buildings = spaces.map(space => space.building_name).filter(Boolean);
    return [...new Set(buildings)].sort();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setBuildingFilter('');
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ სივრცის წაშლა?');
    if (!isConfirmed) return;

    try {
      await api.delete(`/spaces/${id}`);
      showNotification('სივრცე წარმატებით წაიშალა!', 'success');
      fetchSpaces();
    } catch (error) {
      showNotification('შეცდომა სერვერთან კავშირისას', 'error');
    }
  };

  const handleSpaceUpdated = () => {
    setEditingId(null);
    fetchSpaces();
  };

  const getCategoryColor = (category) => {
    const colors = {
      'გამოფენის დარბაზი': 'primary',
      'კონფერენციის დარბაზი': 'secondary',
      'საოფისე სივრცე': 'success',
      'საცავი': 'warning',
      'სხვა': 'default'
    };
    return colors[category] || 'default';
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
          <DomainIcon fontSize="large" />
          სივრცეები
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditingId(0)}
          size="large"
        >
          სივრცის დამატება
        </Button>
      </Box>

      {/* Space Form Modal */}
      {editingId !== null && (
        <SpaceForm
          spaceToEdit={spaces.find(s => s.id === editingId)}
          onSpaceUpdated={handleSpaceUpdated}
          showNotification={showNotification}
        />
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ფილტრები და ძიება
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="ძიება"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ძიება შენობის სახელით ან აღწერით..."
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>კატეგორია</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="კატეგორია"
            >
              <MenuItem value="">ყველა კატეგორია</MenuItem>
              {getUniqueCategories().map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>შენობა</InputLabel>
            <Select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              label="შენობა"
            >
              <MenuItem value="">ყველა შენობა</MenuItem>
              {getUniqueBuildings().map(building => (
                <MenuItem key={building} value={building}>
                  {building}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            onClick={clearFilters}
            startIcon={<ClearIcon />}
            size="small"
          >
            გასუფთავება
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          ნაპოვნია: {filteredSpaces.length} სივრცე
        </Typography>
      </Paper>

      {/* Spaces Table */}
      {filteredSpaces.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {spaces.length === 0 ? 'სივრცეები არ მოიძებნა.' : 'ფილტრების შესაბამისი სივრცეები ვერ მოიძებნა.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>შენობის სახელი</TableCell>
                <TableCell>კატეგორია</TableCell>
                <TableCell>ფართობი (მ²)</TableCell>
                <TableCell>აღწერა</TableCell>
                <TableCell>შექმნის თარიღი</TableCell>
                <TableCell align="center">მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSpaces.map((space) => (
                <TableRow key={space.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {space.building_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={space.category}
                      color={getCategoryColor(space.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SquareIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      {space.area_sqm || '-'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {space.description 
                        ? (space.description.length > 80 
                          ? `${space.description.substring(0, 80)}...` 
                          : space.description)
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(space.created_at).toLocaleDateString('ka-GE')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="რედაქტირება">
                        <IconButton
                          color="primary"
                          onClick={() => setEditingId(space.id)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="წაშლა">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(space.id)}
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
          სულ: {filteredSpaces.length} სივრცე | სულ ფართობი: {filteredSpaces.reduce((sum, space) => sum + (space.area_sqm || 0), 0)} მ²
        </Typography>
      </Box>
    </Container>
  );
};

export default SpacesList;
