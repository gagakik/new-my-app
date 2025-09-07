
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Close,
  Add,
  Delete,
  Print,
  Save
} from '@mui/icons-material';

const InvoiceForm = ({ participant, onClose, showNotification, eventData }) => {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    companyInfo: {
      name: 'Expo Georgia Management 1958 LLC',
      address: 'Georgia, Tbilisi, Tsereteli Ave. № 118; 0119',
      phone: '+995 322 341 100',
      email: 'finance@expogeorgia.ge',
      taxNumber: 'XXX-XXX-XXX'
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (participant) {
      initializeInvoiceData();
    }
  }, [participant]);

  const initializeInvoiceData = () => {
    // ინვოისის ნომრის გენერაცია
    const date = new Date();
    let invoiceNumber = participant.invoice_number;
    if (!invoiceNumber) {
      invoiceNumber = `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(participant.id).padStart(4, '0')}`;
    }

    // ინვოისის ერთეულების ჩამოყალიბება
    const items = [];

    // participant.payment_amount უკვე შეიცავს დღგ-ს, ამიტომ უკუდათვლით გამოვითვლოთ ღირებულება დღგ-ის გარეშე
    const totalWithVAT = parseFloat(participant.payment_amount) || 0;
    const subtotalWithoutVAT = totalWithVAT / 1.18; // დღგ-ის გარეშე ღირებულება
    const vatAmount = totalWithVAT - subtotalWithoutVAT; // 18% დღგ

    // შევამოწმოთ არის თუ არა პაკეტი
    const isPackageRegistration = participant.package_name || participant.selected_package_id;

    // თუ პაკეტია - პაკეტის ღირებულება დღგ-ის გარეშე
    if (isPackageRegistration && participant.package_name) {
      items.push({
        id: 'package',
        description: `პაკეტი "${participant.package_name}"`,
        details: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}" (${participant.booth_size || 'N/A'}მ²)`,
        quantity: 1,
        unitPrice: subtotalWithoutVAT,
        total: subtotalWithoutVAT
      });
    } else {
      // ინდივიდუალური რეგისტრაციისთვის - ფასები დღგ-ის გარეშე
      if (participant.booth_size) {
        // სტენდის ღირებულება (მთლიანი თანხის ნაწილი)
        const boothPortion = 0.8; // დავაფრიქსიროთ რომ სტენდი არის 80% მთლიანი თანხის
        const boothSubtotal = subtotalWithoutVAT * boothPortion;
        
        items.push({
          id: 'booth',
          description: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}"`,
          details: `სტენდი #${participant.booth_number || 'TBD'} (${participant.booth_size}მ²)`,
          quantity: parseFloat(participant.booth_size),
          unitPrice: boothSubtotal / parseFloat(participant.booth_size),
          total: boothSubtotal
        });

        // აღჭურვილობის ღირებულება (თუ არსებობს)
        if (participant.equipment_total && participant.equipment_total > 0) {
          const equipmentPortion = 0.2; // დარჩენილი 20%
          const equipmentSubtotal = subtotalWithoutVAT * equipmentPortion;
          
          items.push({
            id: 'equipment',
            description: 'დამატებითი აღჭურვილობა',
            details: 'მითითებული აღჭურვილობის ნაკრები',
            quantity: 1,
            unitPrice: equipmentSubtotal,
            total: equipmentSubtotal
          });
        }
      }
    }

    // თუ ერთეულები არ შეიქმნა, შევქმნათ ზოგადი ერთეული
    if (items.length === 0) {
      items.push({
        id: 'general',
        description: `მონაწილეობა ღონისძიებაში "${eventData?.service_name || eventData?.exhibition_name || 'ღონისძიება'}"`,
        details: participant.notes || 'ღონისძიებაში მონაწილეობის გადასახადი',
        quantity: 1,
        unitPrice: subtotalWithoutVAT,
        total: subtotalWithoutVAT
      });
    }

    const subtotal = subtotalWithoutVAT;
    const tax = vatAmount;
    const total = totalWithVAT;

    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber,
      dueDate: participant.payment_due_date || '',
      items,
      subtotal,
      tax,
      total,
      notes: participant.notes || ''
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = parseFloat(newItems[index].quantity || 0) * parseFloat(newItems[index].unitPrice || 0);
    }

    // ინვოისის ერთეულები შეყვანილია დღგ-ის გარეშე, ამიტომ:
    const subtotalWithoutVAT = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotalWithoutVAT * 0.18; // 18% დღგ
    const totalWithVAT = subtotalWithoutVAT + vatAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal: subtotalWithoutVAT,
      tax: vatAmount,
      total: totalWithVAT
    }));
  };

  const addNewItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      details: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };

    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    const newItems = invoiceData.items.filter((_, i) => i !== index);
    const subtotalWithoutVAT = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotalWithoutVAT * 0.18;
    const totalWithVAT = subtotalWithoutVAT + vatAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subtotal: subtotalWithoutVAT,
      tax: vatAmount,
      total: totalWithVAT
    }));
  };

  const handleSaveInvoice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const updateData = {
        company_id: participant.company_id,
        registration_status: participant.registration_status,
        payment_status: participant.payment_status,
        booth_number: participant.booth_number,
        booth_size: participant.booth_size,
        contact_person: participant.contact_person,
        contact_position: participant.contact_position,
        contact_email: participant.contact_email,
        contact_phone: participant.contact_phone,
        invoice_number: invoiceData.invoiceNumber,
        payment_amount: invoiceData.total.toFixed(2),
        payment_due_date: invoiceData.dueDate,
        payment_method: participant.payment_method || 'ბანკის გადარიცხვა',
        notes: invoiceData.notes
      };

      const response = await fetch(`/api/events/${participant.event_id}/participants/${participant.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        showNotification('ინვოისი წარმატებით შეინახა', 'success');
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        showNotification(errorData.message || 'ინვოისის შენახვა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('ინვოისის შენახვის შეცდომა:', error);
      showNotification('ინვოისის შენახვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  if (!participant) {
    return null;
  }

  return (
    <Dialog
      open={!!participant}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '95vh',
          borderRadius: 2,
          boxShadow: '0 24px 38px 3px rgba(0, 0, 0, 0.14)'
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 3
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          ინვოისის გენერაცია
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 4, maxHeight: '70vh', overflow: 'auto' }}>
          {/* Company Header */}
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={8}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                    {invoiceData.companyInfo.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                    {invoiceData.companyInfo.address}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                    ტელ: {invoiceData.companyInfo.phone}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                    მეილი: {invoiceData.companyInfo.email}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ს/კ: {invoiceData.companyInfo.taxNumber}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                  <Typography variant="h3" sx={{ fontWeight: 300, color: '#333', mb: 1 }}>
                    ინვოისი
                  </Typography>
                  <Chip
                    label={`#${invoiceData.invoiceNumber}`}
                    color="primary"
                    variant="filled"
                    sx={{ fontSize: '1rem', fontWeight: 600 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    თარიღები
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="მომზადების თარიღი"
                      type="date"
                      value={invoiceData.issueDate}
                      onChange={(e) => setInvoiceData(prev => ({...prev, issueDate: e.target.value}))}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="ვალიდურია"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData(prev => ({...prev, dueDate: e.target.value}))}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      fullWidth
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    მონაწილე
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                    {participant.company_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    ს/კ: {participant.identification_code}
                  </Typography>
                  {participant.legal_address && (
                    <Typography variant="body2" color="textSecondary">
                      მისამართი: {participant.legal_address}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Invoice Items */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  სერვისები
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={addNewItem}
                  variant="contained"
                  size="small"
                  sx={{
                    backgroundColor: '#28a745',
                    '&:hover': {
                      backgroundColor: '#218838'
                    }
                  }}
                >
                  სერვისის დამატება
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 600 }}>აღწერა</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>დეტალები</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 80 }}>რაოდ.</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>ერთ. ფასი</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 100 }}>ჯამი</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 60 }}>მოქმედება</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoiceData.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <TextField
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="სერვისის აღწერა"
                            size="small"
                            fullWidth
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={item.details}
                            onChange={(e) => handleItemChange(index, 'details', e.target.value)}
                            placeholder="დეტალები"
                            size="small"
                            fullWidth
                            variant="standard"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            size="small"
                            variant="standard"
                            inputProps={{ style: { textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            size="small"
                            variant="standard"
                            inputProps={{ style: { textAlign: 'right' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => removeItem(index)}
                            size="small"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Invoice Totals */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {/* Payment Information */}
              <Card sx={{ backgroundColor: '#f8f9fa', borderLeft: '4px solid #1976d2' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    საგადახდო ინფორმაცია
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>ბანკი:</strong> JSC "TBC Bank"
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>ანგარიშის ნომერი:</strong> GE12TB7373336020100002
                  </Typography>
                  <Typography variant="body2">
                    <strong>სწიფტ კოდი:</strong> TBCBGE22
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ borderTop: '3px solid #1976d2' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body1">ჯამი:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formatCurrency(invoiceData.subtotal)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="body1">დღგ (18%):</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {formatCurrency(invoiceData.tax)}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      გადასახდელი:
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      {formatCurrency(invoiceData.total)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: '#6c757d',
            color: '#6c757d',
            '&:hover': {
              borderColor: '#5a6268',
              backgroundColor: 'rgba(108, 117, 125, 0.04)'
            }
          }}
        >
          დახურვა
        </Button>
        <Button
          onClick={handlePrintInvoice}
          variant="contained"
          startIcon={<Print />}
          sx={{
            backgroundColor: '#28a745',
            '&:hover': {
              backgroundColor: '#218838'
            }
          }}
        >
          ამობეჭდვა
        </Button>
        <Button
          onClick={handleSaveInvoice}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
          disabled={loading}
          sx={{
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0'
            }
          }}
        >
          {loading ? 'ინახება...' : 'ინვოისის შენახვა'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceForm;
