import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Folder as FolderIcon,
  AttachFile as AttachFileIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import api from '../services/api'; // Assuming api is imported from '../services/api'

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [eventData, setEventData] = useState(event || {}); // Use state to hold event data

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'manager' ||
    userRole === 'sales' ||
    userRole === 'marketing';

  useEffect(() => {
    if (event) {
      console.log('Event data:', event);
      setEventData(event); // Initialize eventData with the event prop
      setPlanFile(event.plan_file_path);

      // Parse JSON strings if they exist
      let parsedInvoiceFiles = [];
      let parsedExpenseFiles = [];

      try {
        parsedInvoiceFiles = typeof event.invoice_files === 'string' 
          ? JSON.parse(event.invoice_files) 
          : event.invoice_files || [];
      } catch (e) {
        console.log('Error parsing invoice files:', e);
        parsedInvoiceFiles = [];
      }

      try {
        parsedExpenseFiles = typeof event.expense_files === 'string' 
          ? JSON.parse(event.expense_files) 
          : event.expense_files || [];
      } catch (e) {
        console.log('Error parsing expense files:', e);
        parsedExpenseFiles = [];
      }

      setInvoiceFiles(parsedInvoiceFiles);
      setExpenseFiles(parsedExpenseFiles);

      // Refresh data to ensure we have latest info
      // refreshEventData(); // Removed automatic refresh on mount to avoid double fetch if event is already fresh
    }
  }, [event]);

  const refreshEventData = async () => {
    // Ensure event.id is available before making the API call
    if (!event || !event.id) {
      console.error("Cannot refresh data: event or event.id is not available.");
      return;
    }
    try {
      const response = await api.get(`/annual-services/${event.id}`);

      if (response.status === 200) {
        const updatedEvent = response.data;
        console.log('Updated event data:', updatedEvent);
        setEventData(updatedEvent); // Update eventData state
        setPlanFile(updatedEvent.plan_file_path);
        console.log('Plan file updated:', updatedEvent.plan_file_path);

        // Parse JSON strings if they exist
        let parsedInvoiceFiles = [];
        let parsedExpenseFiles = [];

        try {
          parsedInvoiceFiles = typeof updatedEvent.invoice_files === 'string' 
            ? JSON.parse(updatedEvent.invoice_files) 
            : updatedEvent.invoice_files || [];
        } catch (e) {
          console.log('Error parsing invoice files:', e);
          parsedInvoiceFiles = [];
        }

        try {
          parsedExpenseFiles = typeof updatedEvent.expense_files === 'string' 
            ? JSON.parse(updatedEvent.expense_files) 
            : updatedEvent.expense_files || [];
        } catch (e) {
          console.log('Error parsing expense files:', e);
          parsedExpenseFiles = [];
        }

        setInvoiceFiles(parsedInvoiceFiles);
        setExpenseFiles(parsedExpenseFiles);
      }
    } catch (error) {
      console.error('ივენთის მონაცემების განახლების შეცდომა:', error);
      showNotification('ფაილების სიის განახლება ვერ მოხერხდა.', 'error');
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    setUploading(true);
    setUploadType(type);

    // Ensure event.id is available before making the API call
    if (!event || !event.id) {
      console.error("Cannot upload file: event or event.id is not available.");
      showNotification('ფაილის ატვირთვა ვერ მოხერხდა: ივენთის მონაცემები არ არის ხელმისაწვდომი.', 'error');
      setUploading(false);
      setUploadType('');
      return;
    }

    try {
      const formData = new FormData();

      if (type === 'plan') {
        formData.append('plan_file', file);
      } else if (type === 'invoice') {
        formData.append('invoice_file', file);
        formData.append('file_name', file.name);
      } else if (type === 'expense') {
        formData.append('expense_file', file);
        formData.append('file_name', file.name);
      }

      const response = await api.post(`/events/${event.id}/upload-${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showNotification(response.data.message, 'success');
      await refreshEventData();
    } catch (error) {
      console.error('File upload error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      const errorMessage = error.response?.data?.message || 'ფაილის ატვირთვა ვერ მოხერხდა';
      console.error('Showing error message:', errorMessage);

      showNotification(errorMessage, 'error');
    } finally {
      setUploading(false);
      setUploadType('');
    }
  };

  const handleFileDelete = async (type, fileName = null) => {
    const confirmMessage = type === 'plan'
      ? 'ნამდვილად გსურთ გეგმის ფაილის წაშლა?'
      : `ნამდვილად გსურთ ფაილის "${fileName}" წაშლა?`;

    if (!window.confirm(confirmMessage)) return;

    // Ensure event.id is available before making the API call
    if (!event || !event.id) {
      console.error("Cannot delete file: event or event.id is not available.");
      showNotification('ფაილის წაშლა ვერ მოხერხდა: ივენთის მონაცემები არ არის ხელმისაწვდომი.', 'error');
      return;
    }

    try {
      let url;

      if (type === 'plan') {
        url = `/events/${event.id}/delete-plan`;
      } else if (type === 'invoice') {
        url = `/events/${event.id}/delete-invoice/${encodeURIComponent(fileName)}`;
      } else if (type === 'expense') {
        url = `/events/${event.id}/delete-expense/${encodeURIComponent(fileName)}`;
      }

      const response = await api.delete(url);

      showNotification(response.data.message, 'success');

      if (type === 'plan') {
        setPlanFile(null);
        setEventData(prev => ({ ...prev, plan_file_path: null })); // Update state
      } else if (type === 'invoice') {
        setInvoiceFiles(prev => prev.filter(f => f.name !== fileName));
        setEventData(prev => ({ ...prev, invoice_files: prev.invoice_files.filter(f => f.name !== fileName) })); // Update state
      } else if (type === 'expense') {
        setExpenseFiles(prev => prev.filter(f => f.name !== fileName));
        setEventData(prev => ({ ...prev, expense_files: prev.expense_files.filter(f => f.name !== fileName) })); // Update state
      }
    } catch (error) {
      console.error('File delete error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      showNotification(error.response?.data?.message || 'ფაილის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('ka-GE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString; // Return original string if parsing fails
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return <PdfIcon color="error" />;
    if (extension === 'xlsx' || extension === 'xls') return <Chip label="XLSX" size="small" color="success" variant="outlined" sx={{ mr: 1 }} />;
    return <DocIcon color="primary" />;
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon />
          <Typography variant="h6">
            ფაილების მართვა - {eventData.service_name || 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Manual Refresh Button */}
          <Button
            variant="text"
            startIcon={<AutorenewIcon />}
            onClick={refreshEventData}
            color="inherit"
            size="small"
            sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            title="ფაილების სიის განახლება"
          >
            განახლება
          </Button>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Plan File Section */}
          <Paper sx={{ p: 3, mb: 3 }} elevation={3}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#555' }}>
              <PdfIcon color="error" />
              გეგმის ფაილი
            </Typography>

            {(eventData.plan_file_path || planFile) ? (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <PdfIcon color="error" fontSize="large" />
                    <Box sx={{ flexGrow: 1, minWidth: '150px' }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {(eventData.plan_file_path || planFile)?.split('/').pop() || 'გეგმა.pdf'}
                      </Typography>
                      {eventData.plan_uploaded_by && (
                        <Typography variant="body2" color="text.secondary">
                          ატვირთულია: {eventData.plan_uploaded_by}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(eventData.plan_uploaded_at)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        size="small"
                        onClick={() => {
                          const filePath = eventData.plan_file_path || planFile;
                          if (filePath) {
                            const filename = filePath.split('/').pop();
                            window.open(`/api/download/${filename}`, '_blank');
                          }
                        }}
                        disabled={!(eventData.plan_file_path || planFile)}
                      >
                        ჩამოტვირთვა
                      </Button>
                      {isAuthorizedForManagement && (
                        <IconButton
                          color="error"
                          onClick={() => handleFileDelete('plan')}
                          size="small"
                          aria-label="delete plan file"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info">
                გეგმის ფაილი არ არის ატვირთული
              </Alert>
            )}

            {isAuthorizedForManagement && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  id="plan-file-upload-input"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload('plan', e.target.files[0]);
                      e.target.value = ''; // Clear the input value
                    }
                  }}
                  disabled={uploading && uploadType === 'plan'}
                />
                <label htmlFor="plan-file-upload-input">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={uploading && uploadType === 'plan' ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CloudUploadIcon />}
                    disabled={uploading && uploadType === 'plan'}
                    sx={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                      },
                      color: 'white'
                    }}
                  >
                    {uploading && uploadType === 'plan' ? 'ატვირთვა...' : 'აირჩიეთ PDF ფაილი'}
                  </Button>
                </label>
              </Box>
            )}
          </Paper>

          {/* Attached Files Section */}
          <Paper sx={{ p: 3 }} elevation={3}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#555' }}>
              <AttachFileIcon />
              მიმაგრებული ფაილები
            </Typography>

            {[...invoiceFiles, ...expenseFiles].length > 0 ? (
              <List disablePadding>
                {[...invoiceFiles, ...expenseFiles].map((file, index) => {
                  const isInvoice = invoiceFiles.some(invFile => invFile.name === file.name && invFile.path === file.path);
                  return (
                    <ListItem key={index} divider sx={{ py: 1.5, px: 0, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: '250px' }}>
                        {getFileIcon(file.name)}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" noWrap>
                              {file.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={isInvoice ? 'ინვოისი' : 'ხარჯი'}
                              color={isInvoice ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                            {formatFileSize(file.size)} • {formatDate(file.uploaded_at)}
                            {file.uploaded_by && ` • ${file.uploaded_by}`}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => {
                            if (file.path) {
                              const filename = file.path.split('/').pop();
                              window.open(`/api/download/${filename}`, '_blank');
                            }
                          }}
                          disabled={!file.path}
                        >
                          ჩამოტვირთვა
                        </Button>
                        {isAuthorizedForManagement && (
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleFileDelete(isInvoice ? 'invoice' : 'expense', file.name)}
                            aria-label={`delete ${file.name}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Alert severity="info">
                მიმაგრებული ფაილები არ არის ატვირთული
              </Alert>
            )}

            {isAuthorizedForManagement && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    ფაილის ტიპი:
                  </Typography>
                  <RadioGroup
                    row
                    defaultValue="invoice"
                    name="file-type-radio-group"
                    sx={{ justifyContent: 'center', gap: 2 }}
                  >
                    <FormControlLabel value="invoice" control={<Radio size="small" />} label="ინვოისი" />
                    <FormControlLabel value="expense" control={<Radio size="small" />} label="ხარჯი" />
                  </RadioGroup>
                </FormControl>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                  style={{ display: 'none' }}
                  id="attached-file-upload-input"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      const fileType = document.querySelector('input[name="file-type-radio-group"]:checked').value;
                      handleFileUpload(fileType, e.target.files[0]);
                      e.target.value = ''; // Clear the input value
                    }
                  }}
                  disabled={uploading && (uploadType === 'invoice' || uploadType === 'expense')}
                />
                <label htmlFor="attached-file-upload-input">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={uploading && (uploadType === 'invoice' || uploadType === 'expense') ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <CloudUploadIcon />}
                    disabled={uploading && (uploadType === 'invoice' || uploadType === 'expense')}
                    sx={{
                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0056b3 0%, #004085 100%)'
                      },
                      color: 'white'
                    }}
                  >
                    {uploading && (uploadType === 'invoice' || uploadType === 'expense') ? 'ატვირთვა...' : 'აირჩიეთ ფაილი'}
                  </Button>
                </label>
              </Box>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          დახურვა
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventFileManager;