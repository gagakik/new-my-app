
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  CircularProgress,
  IconButton,
  Divider,
  Card,
  CardContent,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close,
  Description,
  PictureAsPdf,
  Download,
  Print,
  ArticleOutlined
} from '@mui/icons-material';

const DocumentGenerator = ({ participantId, participantName, onClose, showNotification }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('invoice');
  const [documentData, setDocumentData] = useState(null);

  const generateDocument = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${documentType}/${participantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentData(data);
        showNotification(`${documentType === 'invoice' ? 'ინვოისი' : 'ხელშეკრულება'} წარმატებით გენერირდა`, 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.message || 'დოკუმენტის გენერაცია ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      showNotification('შეცდომა დოკუმენტის გენერაციისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  const printDocument = () => {
    window.print();
  };

  const downloadDocument = () => {
    const element = document.createElement('a');
    const content = generateDocumentHTML();
    const file = new Blob([content], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `${documentType}-${participantId}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateDocumentHTML = () => {
    if (!documentData) return '';

    if (documentType === 'invoice') {
      return generateInvoiceHTML();
    } else {
      return generateContractHTML();
    }
  };

  const generateInvoiceHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <meta charset="UTF-8">
        <title>ინვოისი ${documentData.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 30px; }
          .company-info { margin-bottom: 20px; }
          .services-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .services-table th, .services-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .services-table th { background-color: #f5f5f5; }
          .total { text-align: right; font-weight: bold; font-size: 1.2em; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ინვოისი</h1>
          <h2>${documentData.invoiceNumber}</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>გაცემის თარიღი:</strong> ${documentData.issueDate}</p>
          ${documentData.dueDate ? `<p><strong>გადახდის ვადა:</strong> ${documentData.dueDate}</p>` : ''}
        </div>

        <div class="company-info">
          <h3>მიმღები:</h3>
          <p><strong>${documentData.company.name}</strong></p>
          <p>საიდ. კოდი: ${documentData.company.identificationCode}</p>
          <p>მისამართი: ${documentData.company.address}</p>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th>სერვისი</th>
              <th>სტენდის ნომერი</th>
              <th>ზომა (მ²)</th>
              <th>თანხა (₾)</th>
            </tr>
          </thead>
          <tbody>
            ${documentData.services.map(service => `
              <tr>
                <td>${service.description}</td>
                <td>${service.boothNumber || '-'}</td>
                <td>${service.boothSize || '-'}</td>
                <td>${service.amount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p>ჯამური თანხა: ${documentData.totalAmount}₾</p>
          <p>სტატუსი: ${documentData.paymentStatus}</p>
        </div>

        ${documentData.notes ? `<div><strong>შენიშვნები:</strong> ${documentData.notes}</div>` : ''}
      </body>
      </html>
    `;
  };

  const generateContractHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <meta charset="UTF-8">
        <title>ხელშეკრულება ${documentData.contractNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .contract-details { margin-bottom: 30px; }
          .terms { margin: 20px 0; }
          .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>მონაწილეობის ხელშეკრულება</h1>
          <h2>${documentData.contractNumber}</h2>
        </div>
        
        <div class="contract-details">
          <p><strong>თარიღი:</strong> ${documentData.date}</p>
        </div>

        <div class="company-info">
          <h3>კომპანია:</h3>
          <p><strong>${documentData.company.name}</strong></p>
          <p>საიდ. კოდი: ${documentData.company.identificationCode}</p>
          <p>მისამართი: ${documentData.company.address}</p>
        </div>

        <div class="event-info">
          <h3>ივენთი:</h3>
          <p><strong>${documentData.event.name}</strong></p>
          <p>${documentData.event.description}</p>
          <p>თარიღები: ${documentData.event.startDate} - ${documentData.event.endDate}</p>
        </div>

        <div class="terms">
          <h3>პირობები:</h3>
          <ul>
            ${documentData.terms.boothNumber ? `<li>სტენდის ნომერი: ${documentData.terms.boothNumber}</li>` : ''}
            ${documentData.terms.boothSize ? `<li>სტენდის ზომა: ${documentData.terms.boothSize} მ²</li>` : ''}
            ${documentData.terms.paymentAmount ? `<li>გადასახადი: ${documentData.terms.paymentAmount}₾</li>` : ''}
            ${documentData.terms.paymentDueDate ? `<li>გადახდის ვადა: ${documentData.terms.paymentDueDate}</li>` : ''}
            ${documentData.terms.paymentMethod ? `<li>გადახდის მეთოდი: ${documentData.terms.paymentMethod}</li>` : ''}
          </ul>
        </div>

        ${documentData.notes ? `<div><strong>შენიშვნები:</strong> ${documentData.notes}</div>` : ''}

        <div class="signature-section">
          <div>
            <p>კომპანიის წარმომადგენელი:</p>
            <p>____________________</p>
          </div>
          <div>
            <p>ორგანიზატორი:</p>
            <p>____________________</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.shadows[24]
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
          position: 'relative',
          py: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArticleOutlined sx={{ fontSize: 28 }} />
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            დოკუმენტის გენერაცია - {participantName}
          </Typography>
        </Box>
        
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: alpha('#ffffff', 0.1)
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Card
          elevation={0}
          sx={{
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2,
            mb: 3
          }}
        >
          <CardContent>
            <FormControl component="fieldset">
              <FormLabel 
                component="legend"
                sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.text.primary,
                  mb: 2
                }}
              >
                აირჩიეთ დოკუმენტის ტიპი:
              </FormLabel>
              <RadioGroup
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                row
                sx={{ gap: 3 }}
              >
                <FormControlLabel
                  value="invoice"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      <Typography>ინვოისი</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="contract"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArticleOutlined color="primary" />
                      <Typography>ხელშეკრულება</Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={generateDocument}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PictureAsPdf />}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            {loading ? 'იქმნება...' : 'დოკუმენტის გენერაცია'}
          </Button>
        </Box>

        {documentData && (
          <Paper
            elevation={3}
            sx={{
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                p: 2
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                დოკუმენტის გადახედვა
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={printDocument}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    '&:hover': {
                      backgroundColor: alpha('#4caf50', 0.04),
                      borderColor: '#45a049'
                    }
                  }}
                >
                  დაბეჭდვა
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={downloadDocument}
                  sx={{
                    borderColor: '#ff9800',
                    color: '#ff9800',
                    '&:hover': {
                      backgroundColor: alpha('#ff9800', 0.04),
                      borderColor: '#f57c00'
                    }
                  }}
                >
                  ჩამოტვირთვა
                </Button>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: '#ffffff',
                  minHeight: 400,
                  maxHeight: 600,
                  overflow: 'auto',
                  fontFamily: 'Arial, sans-serif'
                }}
                dangerouslySetInnerHTML={{
                  __html: generateDocumentHTML()
                }}
              />
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: alpha(theme.palette.grey[100], 0.5) }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: alpha(theme.palette.grey[400], 0.8),
            color: theme.palette.text.secondary,
            '&:hover': {
              borderColor: theme.palette.grey[600],
              backgroundColor: alpha(theme.palette.grey[600], 0.04)
            }
          }}
        >
          დახურვა
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentGenerator;
