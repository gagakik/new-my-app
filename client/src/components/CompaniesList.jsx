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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Public as PublicIcon,
  FileUpload as FileUploadIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import CompanyForm from './CompanyForm';
import CompanyImport from './CompanyImport';
import { companiesAPI, servicesAPI } from '../services/api';

const CompaniesList = ({ showNotification }) => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExhibition, setSelectedExhibition] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await companiesAPI.getAll();
      
      // Get exhibitions list separately if needed
      try {
        const exhibitionsData = await servicesAPI.getExhibitions();
        setExhibitions(exhibitionsData);
      } catch (exhibitionsError) {
        console.warn('Could not load exhibitions:', exhibitionsError);
        setExhibitions([]);
      }
      
      setCompanies(companiesData);

      // Extract unique countries from companies data
      const uniqueCountries = [...new Set(companiesData.map(c => c.country).filter(Boolean))];
      setCountries(uniqueCountries);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError(error.message);
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    let filtered = companies;

    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.identification_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedExhibition) {
      filtered = filtered.filter(company => {
        const selectedExhibitions = company.selected_exhibitions || [];
        return selectedExhibitions.includes(parseInt(selectedExhibition));
      });
    }

    if (selectedCountry) {
      filtered = filtered.filter(company =>
        company.country === selectedCountry
      );
    }

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, selectedExhibition, selectedCountry]);

  const getUniqueCountries = () => {
    return countries.sort();
  };

  const getExhibitionNames = (exhibitionIds) => {
    if (!exhibitionIds || !Array.isArray(exhibitionIds)) return [];
    return exhibitionIds.map(id => {
      const exhibition = exhibitions.find(e => e.id === id);
      return exhibition ? exhibition.exhibition_name : `გამოფენა ${id}`;
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedExhibition('');
    setSelectedCountry('');
  };

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ კომპანიის წაშლა?');
    if (!isConfirmed) return;

    try {
      await companiesAPI.delete(id);
      showNotification('კომპანია წარმატებით წაიშალა!', 'success');
      fetchCompanies();
    } catch (error) {
      showNotification('შეცდომა სერვერთან კავშირისას', 'error');
    }
  };

  const handleCompanyUpdated = () => {
    setEditingId(null);
    fetchCompanies();
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchCompanies();
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
          კომპანიები
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            onClick={() => setShowImport(true)}
          >
            ინპორტი
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditingId(0)}
            size="large"
          >
            კომპანიის დამატება
          </Button>
        </Box>
      </Box>

      {/* Company Form Modal */}
      {editingId !== null && (
        <CompanyForm
          companyToEdit={companies.find(c => c.id === editingId)}
          onCompanyUpdated={handleCompanyUpdated}
          showNotification={showNotification}
          exhibitions={exhibitions}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <CompanyImport
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
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
            placeholder="ძიება კომპანიის სახელით, ქვეყნით ან კოდით..."
            size="small"
            sx={{ minWidth: 300 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>გამოფენა</InputLabel>
            <Select
              value={selectedExhibition}
              onChange={(e) => setSelectedExhibition(e.target.value)}
              label="გამოფენა"
            >
              <MenuItem value="">ყველა გამოფენა</MenuItem>
              {exhibitions.map(exhibition => (
                <MenuItem key={exhibition.id} value={exhibition.id}>
                  {exhibition.exhibition_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>ქვეყანა</InputLabel>
            <Select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              label="ქვეყანა"
            >
              <MenuItem value="">ყველა ქვეყანა</MenuItem>
              {getUniqueCountries().map(country => (
                <MenuItem key={country} value={country}>
                  {country}
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
          ნაპოვნია: {filteredCompanies.length} კომპანია
        </Typography>
      </Paper>

      {/* Companies Table */}
      {filteredCompanies.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {companies.length === 0 ? 'კომპანიები არ მოიძებნა.' : 'ფილტრების შესაბამისი კომპანიები ვერ მოიძებნა.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>კომპანიის სახელი</TableCell>
                <TableCell>ქვეყანა</TableCell>
                <TableCell>საიდენტიფიკაციო კოდი</TableCell>
                <TableCell>გამოფენები</TableCell>
                <TableCell>შექმნის თარიღი</TableCell>
                <TableCell align="center">მოქმედებები</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {company.company_name}
                    </Typography>
                    {company.company_profile && (
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                        {company.company_profile.substring(0, 50)}
                        {company.company_profile.length > 50 && '...'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PublicIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2">
                        {company.country || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {company.identification_code || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {company.selected_exhibitions && company.selected_exhibitions.length > 0 ? (
                        getExhibitionNames(company.selected_exhibitions).map((name, index) => (
                          <Chip
                            key={index}
                            label={name}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(company.created_at).toLocaleDateString('ka-GE')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="რედაქტირება">
                        <IconButton
                          color="primary"
                          onClick={() => setEditingId(company.id)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="წაშლა">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(company.id)}
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
    </Container>
  );
};

export default CompaniesList;