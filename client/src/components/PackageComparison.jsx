
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Container,
  Divider
} from '@mui/material';
import {
  Compare,
  CheckCircle,
  RadioButtonUnchecked,
  MonetizationOn,
  SquareFoot,
  Build
} from '@mui/icons-material';

const PackageComparison = ({ exhibitionId, showNotification }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (exhibitionId) {
      fetchPackagesForComparison();
    }
  }, [exhibitionId]);

  const fetchPackagesForComparison = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/compare/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('პაკეტების შედარების მონაცემების შეცდომა:', error);
      showNotification('პაკეტების მონაცემები ვერ ჩაიტვირთა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePackageSelection = (packageId) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      } else if (prev.length < 3) {
        return [...prev, packageId];
      } else {
        showNotification('მაქსიმუმ 3 პაკეტის შედარება შესაძლებელია', 'warning');
        return prev;
      }
    });
  };

  const selectedPackageData = packages.filter(pkg => selectedPackages.includes(pkg.id));

  const getPriceDisplay = (pkg) => {
    if (pkg.price_type === 'early_bird') {
      return (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Chip 
            label="Early Bird" 
            color="success" 
            size="small" 
            sx={{ mb: 1, fontWeight: 'bold' }}
          />
          <Typography variant="h6" color="success.main" fontWeight="bold">
            €{pkg.current_price}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ textDecoration: 'line-through' }}
          >
            €{pkg.fixed_price}
          </Typography>
        </Box>
      );
    } else if (pkg.price_type === 'last_minute') {
      return (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Chip 
            label="Last Minute" 
            color="error" 
            size="small" 
            sx={{ mb: 1, fontWeight: 'bold' }}
          />
          <Typography variant="h6" color="error.main" fontWeight="bold">
            €{pkg.current_price}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ textDecoration: 'line-through' }}
          >
            €{pkg.fixed_price}
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h6" color="primary.main" fontWeight="bold">
            €{pkg.current_price}
          </Typography>
        </Box>
      );
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
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <Compare sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h4" component="h3" color="primary" fontWeight="bold">
            პაკეტების შედარება
          </Typography>
        </Box>
        
        {/* Package Selection */}
        <Box mb={4}>
          <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 2 }}>
            აირჩიეთ პაკეტები შესადარებლად (მაქსიმუმ 3)
          </Typography>
          
          <Grid container spacing={3}>
            {packages.map(pkg => (
              <Grid item xs={12} sm={6} md={4} key={pkg.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    border: selectedPackages.includes(pkg.id) ? 2 : 1,
                    borderColor: selectedPackages.includes(pkg.id) ? 'success.main' : 'grey.300',
                    backgroundColor: selectedPackages.includes(pkg.id) ? 'success.50' : 'background.paper',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 3
                    }
                  }}
                  onClick={() => togglePackageSelection(pkg.id)}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box display="flex" justifyContent="center" mb={2}>
                      {selectedPackages.includes(pkg.id) ? (
                        <CheckCircle color="success" sx={{ fontSize: 32 }} />
                      ) : (
                        <RadioButtonUnchecked color="action" sx={{ fontSize: 32 }} />
                      )}
                    </Box>
                    
                    <Typography variant="h6" component="h5" gutterBottom color="primary">
                      {pkg.package_name}
                    </Typography>
                    
                    {getPriceDisplay(pkg)}
                    
                    <Box display="flex" justifyContent="center" mt={2}>
                      <Chip 
                        icon={<SquareFoot />}
                        label={`${pkg.fixed_area_sqm} კვმ`} 
                        color="primary" 
                        variant="outlined" 
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Comparison Table */}
        {selectedPackageData.length > 1 ? (
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" fontWeight="bold">
                შედარების ცხრილი
              </Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>
                      მახასიათებელი
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id} align="center" sx={{ fontWeight: 'bold' }}>
                        {pkg.package_name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <MonetizationOn sx={{ mr: 1, color: 'success.main' }} />
                      ღირებულება
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id} align="center">
                        {getPriceDisplay(pkg)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <SquareFoot sx={{ mr: 1, color: 'primary.main' }} />
                      ფართობი
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id} align="center">
                        <Chip 
                          label={`${pkg.fixed_area_sqm} კვმ`} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      აღწერა
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id}>
                        <Typography variant="body2">
                          {pkg.description || 'არ არის მითითებული'}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <Build sx={{ mr: 1, color: 'info.main' }} />
                      შემავალი აღჭურვილობა
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id}>
                        {pkg.equipment_list && pkg.equipment_list.length > 0 ? (
                          <List dense>
                            {pkg.equipment_list.map((eq, idx) => (
                              <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                                <ListItemText
                                  primary={`${eq.code_name} - ${eq.quantity} ცალი`}
                                  secondary={`€${eq.price} თითოეული`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            აღჭურვილობა არ შედის
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      აღჭურვილობის ღირებულება
                    </TableCell>
                    {selectedPackageData.map(pkg => (
                      <TableCell key={pkg.id} align="center">
                        <Chip 
                          label={`€${pkg.equipment_list ? 
                            pkg.equipment_list.reduce((sum, eq) => sum + (eq.quantity * eq.price), 0).toFixed(2)
                            : '0.00'
                          }`}
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : selectedPackageData.length === 1 ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            შედარებისთვის გთხოვთ აირჩიოთ მინიმუმ 2 პაკეტი
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 3 }}>
            პაკეტები არ არის არჩეული შედარებისთვის
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default PackageComparison;
