import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  LocationOn as LocationIcon,
  FilePresent as FilePresentIcon
} from '@mui/icons-material';
import InvoiceForm from './InvoiceForm';
import InvitationGenerator from './InvitationGenerator';

const EventParticipants = ({ eventId, eventName, onClose, showNotification, userRole }) => {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [boothCategoryFilter, setBoothCategoryFilter] = useState('');
  const [boothTypeFilter, setBoothTypeFilter] = useState('');
  const [formData, setFormData] = useState({
    company_id: '',
    registration_status: 'მონაწილეობის მოთხოვნა',
    payment_status: 'მომლოდინე',
    booth_number: '',
    booth_size: '',
    booth_category: 'ოქტანორმის სტენდები',
    booth_type: 'რიგითი',
    notes: '',
    payment_amount: '',
    payment_due_date: '',
    payment_method: '',
    invoice_number: ''
  });
  const [files, setFiles] = useState({
    invoice_file: null,
    contract_file: null,
    handover_file: null
  });
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [equipmentTotal, setEquipmentTotal] = useState(0);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState(null);
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  const [exhibitionData, setExhibitionData] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedParticipantForInvoice, setSelectedParticipantForInvoice] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [showInvitationGenerator, setShowInvitationGenerator] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [registrationType, setRegistrationType] = useState('individual');
  const [manualPricePerSqm, setManualPricePerSqm] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'sales' ||
    userRole === 'manager';

  const boothCategories = [
    'ოქტანორმის სტენდები',
    'ინდივიდუალური სტენდები', 
    'ტენტი',
    'მარკიზიანი დახლი'
  ];

  const boothTypes = [
    'რიგითი',
    'კუთხის',
    'ნახევარ კუნძული',
    'კუნძული'
  ];

  useEffect(() => {
    fetchParticipants();
    fetchCompanies();
    fetchAvailableEquipment();
    fetchEventDetails();
    fetchExhibitionData();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventDetails(data);
      }
    } catch (error) {
      console.error('ივენთის დეტალების მიღების შეცდომა:', error);
    }
  };

  const fetchExhibitionData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching exhibition data for event:', eventId);

      const eventResponse = await fetch(`/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        console.log('Event data received:', eventData);

        if (eventData.exhibition_id) {
          try {
            const exhibitionResponse = await fetch(`/api/exhibitions/${eventData.exhibition_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (exhibitionResponse.ok) {
              const exhibitionData = await exhibitionResponse.json();
              setExhibitionData(exhibitionData);
            } else {
              setExhibitionData(eventData);
            }
          } catch (exhibitionError) {
            console.log('Exhibition fetch failed, using event data as fallback');
            setExhibitionData(eventData);
          }
        } else {
          setExhibitionData(eventData);
        }
      }
    } catch (error) {
      console.error('გამოფენის მონაცემების მიღების შეცდომა:', error);
    }
  };

  const fetchAvailablePackages = async () => {
    try {
      if (!eventDetails?.exhibition_id) return;

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/packages/${eventDetails.exhibition_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const packages = await response.json();
        setAvailablePackages(packages);
      }
    } catch (error) {
      console.error('პაკეტების მიღების შეცდომა:', error);
    }
  };

  useEffect(() => {
    if (eventDetails?.exhibition_id) {
      fetchAvailablePackages();
    }
  }, [eventDetails]);

  useEffect(() => {
    if (registrationType === 'package' && selectedPackages.length > 0) {
      console.log('Updating equipment from packages:', selectedPackages);
      updateEquipmentFromPackages(selectedPackages);
    }
  }, [selectedPackages, registrationType]);

  useEffect(() => {
    const total = selectedEquipment.reduce((sum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    setEquipmentTotal(total);
  }, [selectedEquipment]);

  useEffect(() => {
    if (registrationType === 'package' && selectedPackages.length > 0) {
      const totalArea = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_area_sqm) return sum;
        return sum + (parseFloat(pkg.package.fixed_area_sqm) * parseInt(pkg.quantity || 1));
      }, 0);

      const totalPackagePrice = selectedPackages.reduce((sum, pkg) => {
        if (!pkg || !pkg.package || !pkg.package.fixed_price) return sum;
        const packagePrice = parseFloat(pkg.package.fixed_price);
        return sum + (packagePrice * parseInt(pkg.quantity || 1));
      }, 0);

      const additionalEquipmentCost = selectedEquipment.reduce((sum, item) => {
        const quantity = parseInt(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;

        let totalPackageQuantity = 0;
        selectedPackages.forEach(pkg => {
          if (!pkg || !pkg.package || !Array.isArray(pkg.package.equipment_list)) return;
          const packageEquipment = pkg.package.equipment_list.find(
            pkgEq => pkgEq && pkgEq.equipment_id === parseInt(item.equipment_id)
          );
          if (packageEquipment) {
            const pkgQty = parseInt(pkg.quantity || 1);
            const equipQty = parseInt(packageEquipment.quantity || 0);
            totalPackageQuantity += equipQty * pkgQty;
          }
        });

        const additionalQuantity = Math.max(0, quantity - totalPackageQuantity);
        return sum + (additionalQuantity * unitPrice);
      }, 0);

      const totalAmount = totalPackagePrice + additionalEquipmentCost;

      setFormData(prev => ({
        ...prev,
        booth_size: totalArea.toString(),
        payment_amount: totalAmount.toFixed(2)
      }));
      return;
    }

    let calculatedAmount = 0;
    let boothTotal = 0;

    if (formData.booth_size && manualPricePerSqm) {
      const boothSize = parseFloat(formData.booth_size);
      const pricePerSqm = parseFloat(manualPricePerSqm);

      if (!isNaN(boothSize) && !isNaN(pricePerSqm) && boothSize > 0 && pricePerSqm > 0) {
        boothTotal = boothSize * pricePerSqm;
        calculatedAmount = boothTotal;
      }
    }

    calculatedAmount += equipmentTotal;
    const finalAmount = calculatedAmount;

    setFormData(prev => ({
      ...prev,
      payment_amount: finalAmount.toFixed(2)
    }));
  }, [formData.booth_size, manualPricePerSqm, equipmentTotal, registrationType, selectedPackages]);

  useEffect(() => {
    let filtered = participants;

    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.identification_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(participant =>
        participant.registration_status === statusFilter
      );
    }

    if (paymentFilter) {
      filtered = filtered.filter(participant =>
        participant.payment_status === paymentFilter
      );
    }

    if (countryFilter) {
      filtered = filtered.filter(participant =>
        participant.country === countryFilter
      );
    }

    if (boothCategoryFilter) {
      filtered = filtered.filter(participant =>
        participant.booth_category === boothCategoryFilter
      );
    }

    if (boothTypeFilter) {
      filtered = filtered.filter(participant =>
        participant.booth_type === boothTypeFilter
      );
    }

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, paymentFilter, countryFilter, boothCategoryFilter, boothTypeFilter]);

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
        setFilteredParticipants(data);
      } else {
        showNotification('მონაწილეების მიღება ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა მონაცემების ჩატვირთვისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('კომპანიების მიღების შეცდომა:', error);
    }
  };

  const fetchAvailableEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const equipmentWithAvailability = data.map(equipment => ({
          ...equipment,
          booked_quantity: 0,
          available_quantity: equipment.quantity || 100
        }));

        setAvailableEquipment(equipmentWithAvailability);
      } else {
        showNotification('აღჭურვილობის ჩატვირთვა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('აღჭურვილობის ჩატვირთვის შეცდომა', 'error');
      setAvailableEquipment([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.company_id) {
      showNotification('გთხოვთ აირჩიოთ კომპანია', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const method = editingParticipant ? 'PUT' : 'POST';
      const url = editingParticipant
        ? `/api/events/${eventId}/participants/${editingParticipant.id}`
        : `/api/events/${eventId}/participants`;

      const submitData = new FormData();

      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      if (selectedEquipment.length > 0) {
        const validEquipment = selectedEquipment.filter(eq =>
          eq.equipment_id && eq.quantity > 0
        );
        submitData.append('equipment_bookings', JSON.stringify(validEquipment));
      }

      if (registrationType === 'package' && selectedPackages.length > 0) {
        submitData.append('selected_packages', JSON.stringify(selectedPackages));
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message || 'ოპერაცია წარმატებით დასრულდა', 'success');
        fetchParticipants();
        resetForm();
      } else {
        const errorText = await response.text();
        let errorMessage = 'შეცდომა მოთხოვნის დამუშავებისას';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `სერვერის შეცდომა: ${response.status}`;
        }
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      showNotification('შეცდომა ქსელურ მოთხოვნაში', 'error');
    }
  };

  const handleDelete = async (participantId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ მონაწილის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('მონაწილე წარმატებით წაიშალა', 'success');
        fetchParticipants();
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'მონაწილის წაშლა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა წაშლისას', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: '',
      registration_status: 'მონაწილეობის მოთხოვნა',
      payment_status: 'მომლოდინე',
      booth_number: '',
      booth_size: '',
      booth_category: 'ოქტანორმის სტენდები',
      booth_type: 'რიგითი',
      notes: '',
      payment_amount: '',
      payment_due_date: '',
      payment_method: '',
      invoice_number: ''
    });
    setFiles({
      invoice_file: null,
      contract_file: null,
      handover_file: null
    });
    setSelectedEquipment([]);
    setSelectedPackages([]);
    setEquipmentTotal(0);
    setRegistrationType('individual');
    setManualPricePerSqm('');
    setEditingParticipant(null);
    setShowAddForm(false);
    setExpandedAccordion(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'მონაწილეობის მოთხოვნა': 'warning',
      'მომლოდინე': 'default',
      'რეგისტრირებული': 'info',
      'დადასტურებული': 'success',
      'გაუქმებული': 'error'
    };
    return statusMap[status] || 'default';
  };

  const getPaymentBadge = (status) => {
    const statusMap = {
      'მომლოდინე': 'warning',
      'გადახდილი': 'success',
      'არ არის საჭიროო': 'info'
    };
    return statusMap[status] || 'default';
  };

  const uniqueCountries = [...new Set(participants.map(p => p.country))].filter(Boolean).sort();

  if (loading) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          <Typography variant="h6">
            {eventName} - მონაწილეები ({filteredParticipants.length} / {participants.length})
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Filters Section */}
        <Paper sx={{ m: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            ძიება და ფილტრები
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="ძიება"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="კომპანიის სახელი, კოდი..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>სტატუსი</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="სტატუსი"
                >
                  <MenuItem value="">ყველა</MenuItem>
                  <MenuItem value="მონაწილეობის მოთხოვნა">მონაწილეობის მოთხოვნა</MenuItem>
                  <MenuItem value="მომლოდინე">მომლოდინე</MenuItem>
                  <MenuItem value="რეგისტრირებული">რეგისტრირებული</MenuItem>
                  <MenuItem value="დადასტურებული">დადასტურებული</MenuItem>
                  <MenuItem value="გაუქმებული">გაუქმებული</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>გადახდა</InputLabel>
                <Select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  label="გადახდა"
                >
                  <MenuItem value="">ყველა</MenuItem>
                  <MenuItem value="მომლოდინე">მომლოდინე</MenuItem>
                  <MenuItem value="გადახდილი">გადახდილი</MenuItem>
                  <MenuItem value="არ არის საჭიროო">არ არის საჭიროო</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>ქვეყანა</InputLabel>
                <Select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  label="ქვეყანა"
                >
                  <MenuItem value="">ყველა</MenuItem>
                  {uniqueCountries.map(country => (
                    <MenuItem key={country} value={country}>{country}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPaymentFilter('');
                  setCountryFilter('');
                  setBoothCategoryFilter('');
                  setBoothTypeFilter('');
                }}
                startIcon={<ClearIcon />}
              >
                გასუფთავება
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        {isAuthorizedForManagement && (
          <Box sx={{ m: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setShowAddForm(true);
                if (!exhibitionData) {
                  fetchExhibitionData();
                }
                if (eventDetails?.exhibition_id && availablePackages.length === 0) {
                  fetchAvailablePackages();
                }
              }}
              sx={{
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                }
              }}
            >
              ახალი მონაწილის დამატება
            </Button>

            {filteredParticipants.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                onClick={() => setShowInvitationGenerator(true)}
              >
                QR მოსაწვევების გენერაცია
              </Button>
            )}
          </Box>
        )}

        {/* Add/Edit Form */}
        <Collapse in={showAddForm}>
          <Paper sx={{ m: 2, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingParticipant ? 'მონაწილის რედაქტირება' : 'ახალი მონაწილის დამატება'}
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Company Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>კომპანია</InputLabel>
                    <Select
                      value={formData.company_id}
                      onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                      label="კომპანია"
                    >
                      <MenuItem value="">აირჩიეთ კომპანია</MenuItem>
                      {companies.map(company => (
                        <MenuItem key={company.id} value={company.id}>
                          {company.company_name} ({company.country})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Booth Information */}
                <Grid item xs={12}>
                  <Accordion 
                    expanded={expandedAccordion === 'booth'} 
                    onChange={(e, expanded) => setExpandedAccordion(expanded ? 'booth' : false)}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">სტენდის ინფორმაცია</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {/* Registration Type */}
                        <Grid item xs={12}>
                          <FormControl component="fieldset">
                            <Typography variant="subtitle1" gutterBottom>რეგისტრაციის ტიპი</Typography>
                            <RadioGroup
                              row
                              value={registrationType}
                              onChange={(e) => setRegistrationType(e.target.value)}
                            >
                              <FormControlLabel 
                                value="individual" 
                                control={<Radio />} 
                                label="ინდივიდუალური კონფიგურაცია" 
                              />
                              <FormControlLabel 
                                value="package" 
                                control={<Radio />} 
                                label="პაკეტების არჩევა" 
                              />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>სტენდების კატეგორია</InputLabel>
                            <Select
                              value={formData.booth_category}
                              onChange={(e) => setFormData({...formData, booth_category: e.target.value})}
                              label="სტენდების კატეგორია"
                            >
                              {boothCategories.map(category => (
                                <MenuItem key={category} value={category}>{category}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={6}>
                          <FormControl fullWidth>
                            <InputLabel>სტენდის ტიპი</InputLabel>
                            <Select
                              value={formData.booth_type}
                              onChange={(e) => setFormData({...formData, booth_type: e.target.value})}
                              label="სტენდის ტიპი"
                            >
                              {boothTypes.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="სტენდის ნომერი"
                            value={formData.booth_number}
                            onChange={(e) => setFormData({...formData, booth_number: e.target.value})}
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="სტენდის ზომა (კვმ)"
                            type="number"
                            inputProps={{ step: 0.01 }}
                            value={formData.booth_size}
                            onChange={(e) => setFormData({...formData, booth_size: e.target.value})}
                            disabled={registrationType === 'package'}
                            required
                          />
                        </Grid>

                        <Grid item xs={4}>
                          <TextField
                            fullWidth
                            label="ფასი კვმ-ზე (EUR)"
                            type="number"
                            inputProps={{ step: 0.01 }}
                            value={manualPricePerSqm}
                            onChange={(e) => setManualPricePerSqm(e.target.value)}
                            disabled={registrationType === 'package'}
                          />
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Payment Information */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="გადასახდელი თანხა EUR"
                    type="number"
                    inputProps={{ step: 0.01 }}
                    value={formData.payment_amount}
                    onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="გადახდის ვადა"
                    type="date"
                    value={formData.payment_due_date}
                    onChange={(e) => setFormData({...formData, payment_due_date: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                {/* Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="შენიშვნები"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </Grid>

                {/* Form Actions */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                    >
                      გაუქმება
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                        }
                      }}
                    >
                      {editingParticipant ? 'განახლება' : 'დამატება'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Collapse>

        {/* Participants List */}
        <Box sx={{ m: 2 }}>
          {filteredParticipants.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {participants.length === 0 
                  ? 'ამ ივენთზე მონაწილეები ჯერ არ არის რეგისტრირებული'
                  : 'ფილტრის შედეგად მონაწილეები ვერ მოიძებნა'
                }
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredParticipants.map((participant) => (
                <Grid item xs={12} sm={6} md={4} key={participant.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" noWrap>
                          {participant.company_name}
                        </Typography>
                        <Chip
                          size="small"
                          label={participant.country}
                          color="default"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        ID: {participant.identification_code}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={participant.registration_status}
                          color={getStatusBadge(participant.registration_status)}
                          variant="filled"
                        />
                        <Chip
                          size="small"
                          label={participant.payment_status}
                          color={getPaymentBadge(participant.payment_status)}
                          variant="outlined"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2">
                          სტენდი: #{participant.booth_number || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          {participant.booth_size}მ²
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip
                          size="small"
                          label={participant.booth_category || 'არ არის'}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={participant.booth_type || 'არ არის'}
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        რეგისტრაცია: {new Date(participant.registration_date).toLocaleDateString('ka-GE')}
                      </Typography>

                      {/* File indicators */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        {participant.invoice_file && (
                          <Tooltip title="ინვოისი">
                            <IconButton 
                              size="small" 
                              color="primary"
                              component="a"
                              href={participant.invoice_file}
                              target="_blank"
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {participant.contract_file && (
                          <Tooltip title="ხელშეკრულება">
                            <IconButton 
                              size="small" 
                              color="info"
                              component="a"
                              href={participant.contract_file}
                              target="_blank"
                            >
                              <FilePresentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {participant.handover_file && (
                          <Tooltip title="მიღება-ჩაბარება">
                            <IconButton 
                              size="small" 
                              color="success"
                              component="a"
                              href={participant.handover_file}
                              target="_blank"
                            >
                              <FilePresentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Box>
                        <Tooltip title="კომპანიის დეტალები">
                          <IconButton 
                            size="small"
                            onClick={async () => {
                              setLoadingCompanyDetails(true);
                              try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`/api/companies/${participant.company_id}`, {
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });

                                if (response.ok) {
                                  const companyData = await response.json();
                                  if (companyData.contact_persons) {
                                    if (Array.isArray(companyData.contact_persons)) {
                                      companyData.contact_persons = companyData.contact_persons;
                                    } else if (typeof companyData.contact_persons === 'string') {
                                      try {
                                        companyData.contact_persons = JSON.parse(companyData.contact_persons);
                                      } catch (parseError) {
                                        companyData.contact_persons = [];
                                      }
                                    } else {
                                      companyData.contact_persons = [];
                                    }
                                  } else {
                                    companyData.contact_persons = [];
                                  }

                                  setSelectedCompanyForDetails(companyData);
                                  setShowCompanyDetails(true);
                                }
                              } catch (error) {
                                showNotification('კომპანიის დეტალების მიღება ვერ მოხერხდა', 'error');
                              } finally {
                                setLoadingCompanyDetails(false);
                              }
                            }}
                          >
                            <BusinessIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="ინვოისის გენერაცია">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedParticipantForInvoice({
                                ...participant,
                                event_id: eventId
                              });
                              setShowInvoiceForm(true);
                            }}
                          >
                            <ReceiptIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {isAuthorizedForManagement && (
                        <Box>
                          <Tooltip title="რედაქტირება">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => {
                                setEditingParticipant(participant);
                                setShowAddForm(true);
                                setExpandedAccordion('booth');
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="წაშლა">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDelete(participant.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </DialogContent>

      {/* Company Details Modal */}
      <Dialog
        open={showCompanyDetails}
        onClose={() => {
          setShowCompanyDetails(false);
          setSelectedCompanyForDetails(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon />
            {selectedCompanyForDetails?.company_name} - დეტალური ინფორმაცია
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCompanyForDetails && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  ძირითადი ინფორმაცია
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      კომპანიის დასახელება
                    </Typography>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.company_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      საიდენტიფიკაციო კოდი
                    </Typography>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.identification_code}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      ქვეყანა
                    </Typography>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.country}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      სტატუსი
                    </Typography>
                    <Chip
                      size="small"
                      label={selectedCompanyForDetails.status || 'აქტიური'}
                      color={selectedCompanyForDetails.status === 'აქტიური' ? 'success' : 'default'}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      კომპანიის პროფილი
                    </Typography>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.company_profile || 'არ არის მითითებული'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      იურიდიული მისამართი
                    </Typography>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.legal_address || 'არ არის მითითებული'}
                    </Typography>
                  </Grid>
                  {selectedCompanyForDetails.website && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        ვებგვერდი
                      </Typography>
                      <Typography variant="body1">
                        <a href={`http://${selectedCompanyForDetails.website}`} target="_blank" rel="noopener noreferrer">
                          {selectedCompanyForDetails.website}
                        </a>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {selectedCompanyForDetails.comment && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    კომენტარი
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body1">
                      {selectedCompanyForDetails.comment}
                    </Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  საკონტაქტო პირები
                </Typography>
                {selectedCompanyForDetails.contact_persons &&
                  Array.isArray(selectedCompanyForDetails.contact_persons) &&
                  selectedCompanyForDetails.contact_persons.length > 0 ? (
                    <Grid container spacing={2}>
                      {selectedCompanyForDetails.contact_persons
                        .filter(person => person && (person.name || person.position || person.phone || person.email))
                        .map((person, index) => (
                          <Grid item xs={12} sm={6} key={index}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {person.name || 'უცნობი'}
                                </Typography>
                                {person.position && (
                                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PersonIcon fontSize="small" />
                                    {person.position}
                                  </Typography>
                                )}
                                {person.phone && (
                                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <PhoneIcon fontSize="small" />
                                    <a href={`tel:${person.phone}`}>{person.phone}</a>
                                  </Typography>
                                )}
                                {person.email && (
                                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EmailIcon fontSize="small" />
                                    <a href={`mailto:${person.email}`}>{person.email}</a>
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      საკონტაქტო პირები არ არის დამატებული
                    </Typography>
                  )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCompanyDetails(false);
            setSelectedCompanyForDetails(null);
          }}>
            დახურვა
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Form Modal */}
      {showInvoiceForm && selectedParticipantForInvoice && (
        <InvoiceForm
          participant={selectedParticipantForInvoice}
          eventData={exhibitionData}
          onClose={() => {
            setShowInvoiceForm(false);
            setSelectedParticipantForInvoice(null);
            fetchParticipants();
          }}
          showNotification={showNotification}
        />
      )}

      {/* Invitation Generator Modal */}
      {showInvitationGenerator && (
        <InvitationGenerator
          eventData={eventDetails || {}}
          participants={filteredParticipants}
          onClose={() => setShowInvitationGenerator(false)}
          showNotification={showNotification}
        />
      )}
    </Dialog>
  );
};

export default EventParticipants;