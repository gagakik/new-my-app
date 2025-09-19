
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Close,
  Save,
  Cancel
} from '@mui/icons-material';

const PackageManager = ({ exhibitionId, showNotification }) => {
  const [packages, setPackages] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    package_name: '',
    description: '',
    fixed_area_sqm: '',
    fixed_price: '',
    equipment_list: []
  });

  useEffect(() => {
    if (exhibitionId) {
      fetchPackages();
      fetchEquipment();
    }
  }, [exhibitionId]);

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('პაკეტების ჩატვირთვის შეცდომა:', error);
      showNotification('პაკეტების ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEquipment(data);
      }
    } catch (error) {
      console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', error);
    }
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    setFormData({
      package_name: '',
      description: '',
      fixed_area_sqm: '',
      fixed_price: '',
      equipment_list: []
    });
    setShowForm(true);
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      package_name: pkg.package_name,
      description: pkg.description || '',
      fixed_area_sqm: pkg.fixed_area_sqm.toString(),
      fixed_price: pkg.fixed_price.toString(),
      equipment_list: pkg.equipment_list || []
    });
    setShowForm(true);
  };

  const handleEquipmentAdd = () => {
    setFormData(prev => ({
      ...prev,
      equipment_list: [...prev.equipment_list, { equipment_id: '', quantity: 1 }]
    }));
  };

  const handleEquipmentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleEquipmentRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      equipment_list: prev.equipment_list.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const packageData = {
      exhibition_id: exhibitionId,
      ...formData,
      fixed_area_sqm: parseFloat(formData.fixed_area_sqm),
      fixed_price: parseFloat(formData.fixed_price),
      equipment_list: formData.equipment_list.filter(eq => eq.equipment_id && eq.quantity > 0)
    };

    try {
      const token = localStorage.getItem('token');
      const method = editingPackage ? 'PUT' : 'POST';
      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        setShowForm(false);
        fetchPackages();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      console.error('პაკეტის შენახვის შეცდომა:', error);
      showNotification('პაკეტის შენახვა ვერ მოხერხდა', 'error');
    }
  };

  const handleDeletePackage = async (packageId) => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ პაკეტის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        fetchPackages();
      }
    } catch (error) {
      console.error('პაკეტის წაშლის შეცდომა:', error);
      showNotification('პაკეტის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          იტვირთება...
        </Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2, borderRadius: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h3" color="primary" fontWeight="bold">
          გამოფენის პაკეტები
        </Typography>
        <Button
        size='small'
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddPackage}
          sx={{ px:1, py:0.4, fontSize:'0.7rem', textTransform: 'none',
              color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
        >
          ADD NEW
        </Button>
      </Box>

      {/* Form Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {editingPackage ? 'პაკეტის რედაქტირება' : 'ახალი პაკეტის შექმნა'}
            </Typography>
            <IconButton onClick={() => setShowForm(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  size='small'
                  fullWidth
                  label="პაკეტის სახელი"
                  value={formData.package_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, package_name: e.target.value }))}
                  required
                />
              </Grid>



              <Grid item xs={6}>
                <TextField
                  variant="outlined"
                  size='small'
                  fullWidth
                  label="ფართობი (კვმ)"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={formData.fixed_area_sqm}
                  onChange={(e) => setFormData(prev => ({ ...prev, fixed_area_sqm: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                size='small'
                  variant="outlined"
                  fullWidth
                  label="ფიქსირებული ღირებულება (EUR)"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={formData.fixed_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, fixed_price: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  fullWidth
                  label="აღწერა"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>

              

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexDirection={'column'}>
                    <Typography variant="h6" color="primary" gap={1} mb={1}>
                      შემავალი აღჭურვილობა
                    </Typography>
                    <Button
                      variant="outlined"                       
                      sx={{                   
                            background: '#ffffffff',
                            color: '#000000ff',
                            textTransform: 'none',
                            boxShadow: '0 0 5px #745ba7',
                            px: 1,
                            py: 1,
                            mb: 1,
                            mr: 0.5,
                            borderRadius: 2,
                            '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#ff0000ff' },
                            transition: 'all 0.2s ease'
                          }}
                      startIcon={<Add />}
                      onClick={handleEquipmentAdd}
                      size="small"
                    >
                      აღჭურვილობის დამატება
                    </Button>
                  </Box>

                  {formData.equipment_list.map((item, index) => (
                    <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <FormControl fullWidth size='small' variant="outlined" sx={{ width: '200px' }}>
                          <InputLabel>აირჩიეთ</InputLabel>
                          <Select
                            value={item.equipment_id}
                            onChange={(e) => handleEquipmentChange(index, 'equipment_id', e.target.value)}
                            required
                          >
                            {availableEquipment.map(eq => (
                              <MenuItem key={eq.id} value={eq.id}>
                                {eq.code_name} (€{eq.price})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={4}>
                        <TextField
                          variant="outlined"
                          size='small'
                          label="რაოდენობა"
                          type="number"
                          sx={{ width: '100px' }}
                          inputProps={{ min: 1 }}
                          value={item.quantity}
                          onChange={(e) => handleEquipmentChange(index, 'quantity', parseInt(e.target.value))}
                          required
                        />
                      </Grid>

                      <Grid item xs={2}>
                        <IconButton
                          color="error"
                          onClick={() => handleEquipmentRemove(index)}
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowForm(false)} startIcon={<Cancel />} sx={{ mr: 1, color: '#ffffffff', background: '#ff0000ff' }}>
              CANCEL
            </Button>
            <Button type="submit" variant="contained" startIcon={<Save />}>
              {editingPackage ? 'განახლება' : 'შენახვა'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Packages List */}
      {packages.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          პაკეტები არ არის შექმნილი
        </Alert>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {packages.map(pkg => (
            <Grid item xs={12} md={6} lg={4} key={pkg.id}>
              <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h4" gutterBottom color="primary">
                    {pkg.package_name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {pkg.description}
                  </Typography>

                  <Box display="flex" gap={2} mb={2}>
                    <Chip 
                      label={`${pkg.fixed_area_sqm} კვმ`} 
                      color="primary" 
                      variant="outlined" 
                      size="small"
                    />
                    <Chip 
                      label={`€${pkg.fixed_price}`} 
                      color="success" 
                      variant="outlined" 
                      size="small"
                    />
                  </Box>
                  
                  {pkg.equipment_list && pkg.equipment_list.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        შემავალი აღჭურვილობა:
                      </Typography>
                      <List dense>
                        {pkg.equipment_list.map((eq, idx) => (
                          <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                            <ListItemText
                              primary={`${eq.code_name} - ${eq.quantity} ცალი`}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>

                <Divider />
                
                <CardActions>
                  <IconButton
                   sx={{ px: 0.5, py: 0.5, fontSize:'0.7rem', textTransform: 'none',
              color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'5px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
                    variant="outlined"
                    size="small"
                    
                    onClick={() => handleEditPackage(pkg)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                                    size="small"
                                    sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 0.5,
                                        py: 0.5,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.2s ease'
                                      }}
                    startIcon={<Delete />}
                    onClick={() => handleDeletePackage(pkg.id)}
                  >
                   <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default PackageManager;
