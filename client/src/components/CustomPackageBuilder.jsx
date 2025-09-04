
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  Construction as ConstructionIcon,
  Euro as EuroIcon,
  StraightenIcon as AreaIcon
} from '@mui/icons-material';

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold', 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            mb: 3
          }}
        >
          <ConstructionIcon sx={{ mr: 1 }} />
          მორგებული პაკეტის შემქმნელი
        </Typography>
        
        <Grid container spacing={3}>
          {/* Package Details Section */}
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: 'fit-content' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  პაკეტის დეტალები
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <TextField
                    fullWidth
                    label="პაკეტის სახელი"
                    value={packageDetails.package_name}
                    onChange={(e) => setPackageDetails(prev => ({
                      ...prev,
                      package_name: e.target.value
                    }))}
                    placeholder="შეიყვანეთ პაკეტის სახელი"
                    required
                    variant="outlined"
                  />

                  <TextField
                    fullWidth
                    label="აღწერა"
                    value={packageDetails.description}
                    onChange={(e) => setPackageDetails(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    placeholder="პაკეტის აღწერა"
                    multiline
                    rows={3}
                    variant="outlined"
                  />

                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="area-input">ფართობი (კვმ) *</InputLabel>
                    <OutlinedInput
                      id="area-input"
                      type="number"
                      inputProps={{ step: "0.1", min: "0" }}
                      value={packageDetails.fixed_area_sqm}
                      onChange={(e) => setPackageDetails(prev => ({
                        ...prev,
                        fixed_area_sqm: e.target.value
                      }))}
                      startAdornment={
                        <InputAdornment position="start">
                          <AreaIcon />
                        </InputAdornment>
                      }
                      label="ფართობი (კვმ) *"
                    />
                  </FormControl>
                  
                  <Alert severity="info" sx={{ mt: 1 }}>
                    ფართობის ფასი: €50 თითო კვ.მ-ზე
                  </Alert>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
                    <EuroIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    საერთო ღირებულება: €{totalPrice.toFixed(2)}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'text.secondary' }}>
                    <Typography variant="body2">
                      ფართობი: €{(packageDetails.fixed_area_sqm * 50).toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      აღჭურვილობა: €{selectedEquipment.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Equipment Selection Section */}
          <Grid item xs={12} md={6}>
            <Card elevation={1}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  აღჭურვილობის არჩევა
                </Typography>
                
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 2, fontWeight: 'medium' }}>
                  ხელმისაწვდომი აღჭურვილობა
                </Typography>
                
                <Grid container spacing={2}>
                  {availableEquipment.map(equipment => (
                    <Grid item xs={12} sm={6} key={equipment.id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent sx={{ pb: 1 }}>
                          <Typography variant="subtitle2" component="div" noWrap>
                            {equipment.code_name}
                          </Typography>
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                            €{equipment.price}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ხელმისაწვდომი: {equipment.available_quantity}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ pt: 0 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => addEquipmentToPackage(equipment)}
                            disabled={equipment.available_quantity === 0}
                            fullWidth
                          >
                            დამატება
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                  არჩეული აღჭურვილობა
                </Typography>
                
                {selectedEquipment.length === 0 ? (
                  <Alert severity="info">
                    აღჭურვილობა არ არის არჩეული
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedEquipment.map(item => (
                      <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {item.code_name}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => updateEquipmentQuantity(item.id, item.quantity - 1)}
                              color="primary"
                            >
                              <RemoveIcon />
                            </IconButton>
                            
                            <Chip 
                              label={item.quantity} 
                              color="primary" 
                              size="small"
                              sx={{ minWidth: '40px' }}
                            />
                            
                            <IconButton
                              size="small"
                              onClick={() => updateEquipmentQuantity(item.id, item.quantity + 1)}
                              color="primary"
                            >
                              <AddIcon />
                            </IconButton>
                            
                            <Typography variant="body2" sx={{ fontWeight: 'bold', ml: 2, minWidth: '60px' }}>
                              €{(item.quantity * item.price).toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={saveCustomPackage}
            sx={{ 
              px: 6, 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            პაკეტის შენახვა
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CustomPackageBuilder;
