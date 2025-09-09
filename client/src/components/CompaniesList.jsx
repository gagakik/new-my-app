import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Grid,
  Checkbox,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material';
import {
  Add,
  Upload,
  Edit,
  Delete,
  Visibility,
  FilterList,
  Save,
  Cancel
} from '@mui/icons-material';
import CompanyForm from './CompanyForm';
import CompanyImport from './CompanyImport';

const CompaniesList = ({ showNotification, userRole }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterIdentificationCode, setFilterIdentificationCode] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [exhibitions, setExhibitions] = useState([]);
  const [editingExhibitions, setEditingExhibitions] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isAuthorizedForManagement = userRole === 'admin' || userRole === 'sales';

  const fetchExhibitions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/exhibitions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExhibitions(data);
      }
    } catch (error) {
      console.error('გამოფენების ჩატვირთვის შეცდომა:', error);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('ავტორიზაცია საჭიროა კომპანიების ნახვისთვის');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let url = '/api/companies?';
      if (searchTerm) url += `searchTerm=${searchTerm}&`;
      if (filterCountry) url += `country=${filterCountry}&`;
      if (filterProfile) url += `profile=${filterProfile}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterIdentificationCode) url += `identification_code=${filterIdentificationCode}&`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('არ გაქვთ კომპანიების ნახვის უფლება');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'მონაცემების მიღება ვერ მოხერხდა.');
      }
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err.message);
      showNotification(`შეცდომა კომპანიების ჩატვირთვისას: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCountry, filterProfile, filterStatus, filterIdentificationCode, showNotification]);

  useEffect(() => {
    fetchCompanies();
    fetchExhibitions();
  }, [fetchCompanies, fetchExhibitions]);

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('ნამდვილად გსურთ ამ კომპანიის წაშლა?');
    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, შეხვიდეთ სისტემაში.', 'error');
        return;
      }
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('კომპანია წარმატებით წაიშალა!', 'success');
        fetchCompanies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'წაშლა ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა წაშლისას:', error);
      showNotification(`დაფიქსირდა შეცდომა წაშლისას: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (company) => {
    setEditingId(company.id);
  };

  const handleCompanyUpdated = () => {
    setEditingId(null);
    setSelectedCompany(null);
    fetchCompanies();
  };

  const handleImportComplete = () => {
    setShowImport(false);
    fetchCompanies();
  };

  const handleViewDetails = (company) => {
    setSelectedCompany(company);
  };

  const handleEditExhibitions = (company) => {
    setEditingExhibitions({
      companyId: company.id,
      companyName: company.company_name,
      selectedExhibitions: company.selected_exhibitions || []
    });
  };

  const handleExhibitionToggle = (exhibitionId, isChecked) => {
    const numericId = Number(exhibitionId);

    setEditingExhibitions(prev => {
      if (!prev) return prev;

      const currentSelected = prev.selectedExhibitions || [];
      const newSelectedExhibitions = isChecked
        ? [...currentSelected, numericId]
        : currentSelected.filter(id => id !== numericId);

      return {
        ...prev,
        selectedExhibitions: newSelectedExhibitions
      };
    });
  };

  const saveExhibitionChanges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/companies/${editingExhibitions.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selected_exhibitions: editingExhibitions.selectedExhibitions
        })
      });

      if (response.ok) {
        showNotification('გამოფენები წარმატებით განახლდა!', 'success');
        setEditingExhibitions(null);
        fetchCompanies();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'განახლება ვერ მოხერხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const cancelExhibitionEdit = () => {
    setEditingExhibitions(null);
  };

  if (loading) {
    return (
      <Container>
        <Typography>იტვირთება...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">შეცდომა: {error}</Typography>
      </Container>
    );
  }

  if (selectedCompany) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{
            textAlign: 'center',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {selectedCompany.company_name} - დეტალები
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography paragraph><strong>ქვეყანა:</strong> {selectedCompany.country}</Typography>
            <Typography paragraph><strong>კომპანიის პროფილი:</strong> {selectedCompany.company_profile}</Typography>
            <Typography paragraph><strong>საიდენტიფიკაციო კოდი:</strong> {selectedCompany.identification_code}</Typography>
            <Typography paragraph><strong>იურიდიული მისამართი:</strong> {selectedCompany.legal_address}</Typography>

            {selectedCompany.contact_persons && selectedCompany.contact_persons.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>საკონტაქტო პირები:</Typography>
                {selectedCompany.contact_persons.map((person, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Typography><strong>პოზიცია:</strong> {person.position || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>სახელი გვარი:</strong> {person.name || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>ტელეფონი:</strong> {person.phone || 'არ არის მითითებული'}</Typography>
                    <Typography><strong>მეილი:</strong> {person.email || 'არ არის მითითებული'}</Typography>
                  </Card>
                ))}
              </Box>
            )}

            <Typography paragraph>
              <strong>ვებგვერდი:</strong> 
              <a href={`http://${selectedCompany.website}`} target="_blank" rel="noopener noreferrer">
                {selectedCompany.website}
              </a>
            </Typography>
            <Typography paragraph><strong>კომენტარი:</strong> {selectedCompany.comment}</Typography>
            <Typography paragraph><strong>სტატუსი:</strong> {selectedCompany.status}</Typography>

            <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderRadius: 1, borderLeft: 3, borderColor: '#667eea' }}>
              <Typography color="text.secondary" fontStyle="italic">
                <strong>შექმნის ინფორმაცია:</strong> {new Date(selectedCompany.created_at).toLocaleDateString()}
                {selectedCompany.created_by_username && ` - ${selectedCompany.created_by_username}`}
              </Typography>
              {selectedCompany.updated_at && (
                <Typography color="text.secondary" fontStyle="italic">
                  <strong>განახლების ინფორმაცია:</strong> {new Date(selectedCompany.updated_at).toLocaleDateString()}
                  {selectedCompany.updated_by_username && ` - ${selectedCompany.updated_by_username}`}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              variant="contained" 
              onClick={() => setSelectedCompany(null)}
              sx={{ minWidth: 150 }}
            >
              უკან დაბრუნება
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{
          textAlign: 'center',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 4
        }}>
          კომპანიების ბაზა
        </Typography>

        {/* ფილტრები */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <Grid container spacing={2} display={'flex'} alignItems="center" justifyContent="center">
            <Grid item xs={12} sm={6} md={2}  >
              <TextField
                fullWidth
                size="small"
                label="ძებნა დასახელებით"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
                <InputLabel>ქვეყანა</InputLabel>
                <Select value={filterCountry} label="ქვეყანა" onChange={(e) => setFilterCountry(e.target.value)}>
                  <MenuItem value="">ყველა ქვეყანა</MenuItem>
                  <MenuItem value="საქართველო">საქართველო</MenuItem>
                  <MenuItem value="აშშ">აშშ</MenuItem>
                  <MenuItem value="გერმანია">გერმანია</MenuItem>
                  <MenuItem value="საფრანგეთი">საფრანგეთი</MenuItem>
                  <MenuItem value="დიდი ბრიტანეთი">დიდი ბრიტანეთი</MenuItem>
                  <MenuItem value="იტალია">იტალია</MenuItem>
                  <MenuItem value="ესპანეთი">ესპანეთი</MenuItem>
                  <MenuItem value="კანადა">კანადა</MenuItem>
                  <MenuItem value="ავსტრალია">ავსტრალია</MenuItem>
                  <MenuItem value="იაპონია">იაპონია</MenuItem>
                  <MenuItem value="ჩინეთი">ჩინეთი</MenuItem>
                  <MenuItem value="ბრაზილია">ბრაზილია</MenuItem>
                  <MenuItem value="მექსიკა">მექსიკა</MenuItem>
                  <MenuItem value="არგენტინა">არგენტინა</MenuItem>
                  <MenuItem value="ჩილე">ჩილე</MenuItem>
                  <MenuItem value="ინდოეთი">ინდოეთი</MenuItem>
                  <MenuItem value="თურქეთი">თურქეთი</MenuItem>
                  <MenuItem value="რუსეთი">რუსეთი</MenuItem>
                  <MenuItem value="უკრაინა">უკრაინა</MenuItem>
                  <MenuItem value="პოლონეთი">პოლონეთი</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="პროფილი"
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
                <InputLabel>სტატუსი</InputLabel>
                <Select value={filterStatus} label="სტატუსი" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="">სტატუსი</MenuItem>
                  <MenuItem value="აქტიური">აქტიური</MenuItem>
                  <MenuItem value="არქივი">არქივი</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="საიდენტიფიკაციო კოდი"
                value={filterIdentificationCode}
                onChange={(e) => setFilterIdentificationCode(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                size="small"
                fullWidth
                variant="contained"
                startIcon={<FilterList />}
                onClick={fetchCompanies}
                sx={{ height: '40px' }}
              >
                ფილტრი
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* მართვის ღილაკები */}
        {isAuthorizedForManagement && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size='small'
              startIcon={<Add />}
              onClick={() => setEditingId(0)}
              sx={{ 
                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)' }
              }}
            >
              ახალი კომპანიის დამატება
            </Button>
            <Button
              size='small'
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setShowImport(!showImport)}
              sx={{ 
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)' }
              }}
            >
              Excel-ით იმპორტი
            </Button>
          </Box>
        )}

        {/* ფორმები და მოდალები */}
        {editingId !== null && isAuthorizedForManagement && (
          <CompanyForm
            companyToEdit={companies.find(c => c.id === editingId)}
            onCompanyUpdated={handleCompanyUpdated}
            showNotification={showNotification}
            userRole={userRole}
          />
        )}

        {showImport && (
          <CompanyImport
            onImportComplete={handleImportComplete}
            showNotification={showNotification}
          />
        )}

        {/* გამოფენების რედაქტირების მოდალი */}
        <Dialog 
          open={!!editingExhibitions} 
          onClose={cancelExhibitionEdit}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            გამოფენების რედაქტირება: {editingExhibitions?.companyName}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ maxHeight: 400, overflowY: 'auto', mt: 1, mb: 2, p: 2, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
              {exhibitions.map(exhibition => {
                const isChecked = Boolean(editingExhibitions?.selectedExhibitions?.includes(Number(exhibition.id)));
                return (
                  <FormControlLabel
                    key={exhibition.id}
                    control={
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => handleExhibitionToggle(exhibition.id, e.target.checked)}
                      />
                    }
                    label={exhibition.exhibition_name}
                    sx={{ display: 'block', mb: 1, backgroundColor: isChecked ? 'rgba(25, 118, 210, 0.04)' : 'inherit', borderRadius: 1, p: 1, border: '1px solid #1976d2', paddingLeft: 2 }}
                  />
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelExhibitionEdit} startIcon={<Cancel />} sx={{ backgroundColor: 'grey.500', color: 'grey.300' }}>
              გაუქმება
            </Button>
            <Button onClick={saveExhibitionChanges} startIcon={<Save />} variant="contained">
              შენახვა
            </Button>
          </DialogActions>
        </Dialog>

        {/* კომპანიების სია */}
        {companies.length === 0 ? (
          <Typography textAlign="center" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            კომპანიები არ მოიძებნა.
          </Typography>
        ) : (
          <>
            {/* Desktop Table View */}
            {!isMobile ? (
              <TableContainer component={Paper} elevation={2}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.1)' }}>
                      <TableCell align="center"><strong>კომპანია</strong></TableCell>
                      <TableCell align="center"><strong>ქვეყანა</strong></TableCell>
                      <TableCell align="center"><strong>საიდ. კოდი</strong></TableCell>
                      <TableCell align="center"><strong>გამოფენები</strong></TableCell>
                      <TableCell align="center"><strong>შექმნა</strong></TableCell>
                      <TableCell align="center"><strong>განახლება</strong></TableCell>
                      <TableCell align="center"><strong>მოქმედებები</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {companies.map(company => (
                      <TableRow 
                        key={company.id} 
                        hover
                        sx={{ 
                          '&:nth-of-type(even)': { 
                            backgroundColor: 
                              company.status === 'აქტიური' 
                                ? 'rgba(76, 175, 80, 0.08)' 
                                : company.status === 'არქივი'
                                ? 'rgba(255, 193, 7, 0.08)'
                                : 'rgba(102, 126, 234, 0.02)' 
                          },
                          '&:nth-of-type(odd)': { 
                            backgroundColor: 
                              company.status === 'აქტიური' 
                                ? 'rgba(76, 175, 80, 0.05)' 
                                : company.status === 'არქივი'
                                ? 'rgba(255, 193, 7, 0.05)'
                                : 'transparent' 
                          }
                        }}
                      >
                        <TableCell>
                          <Typography align="center"
                            sx={{ cursor: 'pointer', fontWeight: 600, color: 'primary.main' }}
                            onClick={() => handleViewDetails(company)}
                          >
                            {company.company_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{company.country}</TableCell>
                        <TableCell align="center">{company.identification_code}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '6px',
                            maxWidth: '200px',
                            alignItems: 'flex-start'
                          }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px', width: '100%' }}>
                              {company.selected_exhibitions && company.selected_exhibitions.length > 0 
                                ? exhibitions
                                  .filter(ex => company.selected_exhibitions.includes(ex.id))
                                  .map((exhibition, index) => (
                                    <Chip 
                                      key={index} 
                                      label={exhibition.exhibition_name}
                                      size="small"
                                      variant="outlined"
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        height: '26px',
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                        color: '#1976d2',
                                        borderRadius: '6px',
                                        justifyContent: 'flex-start',
                                      }}
                                    />
                                  ))
                                : <Typography variant="caption" color="text.secondary">
                                    არ მონაწილეობს
                                  </Typography>
                              }
                            </Box>
                            {isAuthorizedForManagement && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditExhibitions(company)}
                                startIcon={<Edit />}
                                sx={{ 
                                  maxWidth: 'fit-content', 
                                  mt: 1,
                                  fontSize: '0.7rem',
                                  width: '100%',
                                  height: '28px',
                                  borderColor: '#1976d2',
                                  color: '#ffffffff',
                                  '&:hover': {
                                    backgroundColor: 'rgba(124, 154, 184, 1)',
                                    borderColor: '#bccee2ff'
                                  }
                                }}
                              >
                            EDIT
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" align="center" display={'flex'} gap={1} sx={{ justifyContent: 'center', alignItems: 'center' }} flexDirection={'column'} fontSize={'0.7rem'}>
                            {new Date(company.created_at).toLocaleDateString()}
                            {company.created_by_username && (
                              <Typography variant="caption" color="text.secondary" align="center">
                                {company.created_by_username}
                              </Typography>
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {company.updated_at ? (
                            <>
                              <Typography variant="body2" align="center" display={'flex'} gap={1} sx={{ justifyContent: 'center', alignItems: 'center' }} flexDirection={'column'} fontSize={'0.7rem'}>
                                {new Date(company.updated_at).toLocaleDateString()}
                                {company.updated_by_username && (
                                  <Typography variant="caption" color="text.secondary" align="center">
                                    {company.updated_by_username}
                                  </Typography>
                                )}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: "center", justifyContent: "center" }}>
                            <Tooltip title="რედაქტირება">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleEditClick(company)}
                                color="primary"
                                sx={{ minWidth: 'auto', px: 1 }}
                              >
                                <Edit fontSize="small" />
                              </Button>
                            </Tooltip>
                            <Tooltip title="წაშლა">
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleDelete(company.id)}
                                sx={{ minWidth: 'auto', px: 1, color:'#ffffffff', background: '#990000ff',}}
                              >
                                <Delete fontSize="small" />
                              </Button>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Mobile Card View */
              <Grid container spacing={2}>
                {companies.map(company => (
                  <Grid item xs={12} key={company.id}>
                    <Card 
                      elevation={2} 
                      sx={{ 
                        backgroundColor: 
                          company.status === 'აქტიური' 
                            ? 'rgba(76, 175, 80, 0.08)' 
                            : company.status === 'არქივი'
                            ? 'rgba(255, 193, 7, 0.08)'
                            : 'inherit',
                        border: 
                          company.status === 'აქტიური' 
                            ? '1px solid rgba(76, 175, 80, 0.3)' 
                            : company.status === 'არქივი'
                            ? '1px solid rgba(255, 193, 7, 0.3)'
                            : 'inherit'
                      }}
                    >
                      <CardContent>
                        <Typography 
                          variant="h6" 
                          gutterBottom
                          sx={{ cursor: 'pointer', color: 'primary.main' }}
                          onClick={() => handleViewDetails(company)}
                        >
                          {company.company_name}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          <strong>ქვეყანა:</strong> {company.country}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          <strong>საიდ. კოდი:</strong> {company.identification_code}
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, mb: 1 }}>
                            გამოფენები:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                            {company.selected_exhibitions && company.selected_exhibitions.length > 0 
                              ? exhibitions
                                .filter(ex => company.selected_exhibitions.includes(ex.id))
                                .map((exhibition, index) => (
                                  <Chip 
                                    key={index} 
                                    label={exhibition.exhibition_name}
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      height: '26px',
                                      border: '1px solid #1976d2',
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)', 
                                      color: '#1976d2',
                                    }}
                                  />
                                ))
                              : <Typography variant="caption" color="text.secondary">
                                  არ მონაწილეობს
                                </Typography>
                            }
                            {isAuthorizedForManagement && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditExhibitions(company)}
                                startIcon={<Edit />}
                                sx={{ 
                                  mt: 1,
                                  fontSize: '0.7rem',
                                  height: '28px',
                                  borderColor: '#3744b9ff',
                                  color: '#1976d2',
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                      borderColor: '#1565c0'
                                    }
                                }}
                              >
                                გამოფენების რედაქტირება
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditClick(company)}
                        >
                          EDIT
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          color="error"
                          onClick={() => handleDelete(company.id)}
                        >
                          წაშლა
                        </Button>
                      </CardActions>
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

export default CompaniesList;