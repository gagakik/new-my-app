
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  Divider,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const CustomPackageBuilder = ({ exhibitionId, showNotification, onPackageBuilt }) => {
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [packageDetails, setPackageDetails] = useState({
    package_name: '',
    description: '',
    fixed_area_sqm: ''
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableEquipment();
  }, [exhibitionId]);

  useEffect(() => {
    calculateTotalPrice();
  }, [selectedEquipment, packageDetails.fixed_area_sqm]);

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/equipment/availability/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEquipment(data);
      }
    } catch (error) {
      console.error('აღჭურვილობის ჩატვირთვის შეცდომა:', error);
      showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    const equipmentPrice = selectedEquipment.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    const areaPrice = packageDetails.fixed_area_sqm * 50; // 50 EUR per sqm base price
    setTotalPrice(equipmentPrice + areaPrice);
  };

  const addEquipmentToPackage = (equipment) => {
    const existingIndex = selectedEquipment.findIndex(item => item.id === equipment.id);
    
    if (existingIndex >= 0) {
      const updated = [...selectedEquipment];
      if (updated[existingIndex].quantity < equipment.available_quantity) {
        updated[existingIndex].quantity += 1;
        setSelectedEquipment(updated);
      } else {
        showNotification('არასაკმარისი რაოდენობა', 'warning');
      }
    } else {
      setSelectedEquipment([...selectedEquipment, {
        ...equipment,
        quantity: 1
      }]);
    }
  };

  const updateEquipmentQuantity = (equipmentId, newQuantity) => {
    const equipment = availableEquipment.find(eq => eq.id === equipmentId);
    
    if (newQuantity > equipment.available_quantity) {
      showNotification('რაოდენობა აღემატება ხელმისაწვდომს', 'warning');
      return;
    }
    
    if (newQuantity <= 0) {
      setSelectedEquipment(selectedEquipment.filter(item => item.id !== equipmentId));
    } else {
      setSelectedEquipment(selectedEquipment.map(item => 
        item.id === equipmentId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const saveCustomPackage = async () => {
    if (!packageDetails.package_name || !packageDetails.fixed_area_sqm) {
      showNotification('გთხოვთ შეავსოთ ყველა სავალდებულო ველი', 'warning');
      return;
    }

    const customPackage = {
      exhibition_id: exhibitionId,
      ...packageDetails,
      fixed_price: totalPrice,
      equipment_list: selectedEquipment.map(item => ({
        equipment_id: item.id,
        quantity: item.quantity
      })),
      is_custom: true
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(customPackage)
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('პაკეტი წარმატებით შეიქმნა!', 'success');
        if (onPackageBuilt) onPackageBuilt(data.package);
      } else {
        const errorData = await response.json();
        showNotification(errorData.message, 'error');
      }
    } catch (error) {
      console.error('პაკეტის შენახვის შეცდომა:', error);
      showNotification('პაკეტის შენახვა ვერ მოხერხდა', 'error');
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
    <Container maxWidth="xl">
      <Paper 
        elevation={6}
        sx={{ 
          p: 4, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          mb: 3
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          მორგებული პაკეტის შემქმნელი
        </Typography>
      </Paper>

      <Grid container spacing={4}>
        {/* Package Details Section */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
              პაკეტის დეტალები
            </Typography>
            
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="პაკეტის სახელი"
                required
                fullWidth
                value={packageDetails.package_name}
                onChange={(e) => setPackageDetails(prev => ({
                  ...prev,
                  package_name: e.target.value
                }))}
                placeholder="შეიყვანეთ პაკეტის სახელი"
                variant="outlined"
              />

              <TextField
                label="აღწერა"
                multiline
                rows={3}
                fullWidth
                value={packageDetails.description}
                onChange={(e) => setPackageDetails(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="პაკეტის აღწერა"
                variant="outlined"
              />

              <TextField
                label="ფართობი (კვმ)"
                required
                type="number"
                inputProps={{ step: 0.1, min: 0 }}
                fullWidth
                value={packageDetails.fixed_area_sqm}
                onChange={(e) => setPackageDetails(prev => ({
                  ...prev,
                  fixed_area_sqm: e.target.value
                }))}
                placeholder="0.0"
                variant="outlined"
                helperText="ფასი: €50 თითო კვმ-ზე"
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Price Summary */}
            <Paper 
              elevation={2}
              sx={{ 
                p: 3, 
                backgroundColor: alpha('#4caf50', 0.1),
                border: '1px solid #4caf50',
                borderRadius: 2
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <CalculateIcon sx={{ color: '#4caf50', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  საერთო ღირებულება: €{totalPrice.toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  ფართობი: €{(packageDetails.fixed_area_sqm * 50).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  აღჭურვილობა: €{selectedEquipment.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<SaveIcon />}
              onClick={saveCustomPackage}
              sx={{ 
                mt: 3, 
                py: 1.5,
                background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388e3c 30%, #66bb6a 90%)',
                }
              }}
            >
              პაკეტის შენახვა
            </Button>
          </Paper>
        </Grid>

        {/* Equipment Selection Section */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 3 }}>
              აღჭურვილობის არჩევა
            </Typography>

            {/* Available Equipment */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCartIcon sx={{ mr: 1 }} />
                ხელმისაწვდომი აღჭურვილობა
              </Typography>
              
              <Grid container spacing={2}>
                {availableEquipment.map(equipment => (
                  <Grid item xs={12} sm={6} md={4} key={equipment.id}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                        <Typography variant="h6" component="h3" gutterBottom>
                          {equipment.code_name}
                        </Typography>
                        <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                          €{equipment.price}
                        </Typography>
                        <Chip 
                          label={`ხელმისაწვდომი: ${equipment.available_quantity}`}
                          size="small"
                          color={equipment.available_quantity > 0 ? 'success' : 'error'}
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => addEquipmentToPackage(equipment)}
                          disabled={equipment.available_quantity === 0}
                          size="small"
                        >
                          დამატება
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider />

            {/* Selected Equipment */}
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                არჩეული აღჭურვილობა
              </Typography>
              
              {selectedEquipment.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  აღჭურვილობა არ არის არჩეული
                </Alert>
              ) : (
                <List>
                  {selectedEquipment.map(item => (
                    <ListItem 
                      key={item.id}
                      divider
                      sx={{ 
                        backgroundColor: alpha('#1976d2', 0.05),
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <ListItemText
                        primary={item.code_name}
                        secondary={`€${item.price} x ${item.quantity} = €${(item.quantity * item.price).toFixed(2)}`}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => updateEquipmentQuantity(item.id, item.quantity - 1)}
                            sx={{ 
                              backgroundColor: '#f44336',
                              color: 'white',
                              '&:hover': { backgroundColor: '#d32f2f' }
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          
                          <Chip 
                            label={item.quantity}
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 40 }}
                          />
                          
                          <IconButton
                            size="small"
                            onClick={() => updateEquipmentQuantity(item.id, item.quantity + 1)}
                            sx={{ 
                              backgroundColor: '#4caf50',
                              color: 'white',
                              '&:hover': { backgroundColor: '#388e3c' }
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CustomPackageBuilder;
