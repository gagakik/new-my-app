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
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import api from '../services/api'; // Assuming api is imported from '../services/api'

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'manager' ||
    userRole === 'sales' ||
    userRole === 'marketing';

  useEffect(() => {
    if (event) {
      setPlanFile(event.plan_file_path);
      setInvoiceFiles(event.invoice_files || []);
      setExpenseFiles(event.expense_files || []);
    }
  }, [event]);

  const refreshEventData = async () => {
    try {
      const response = await api.get(`/events/${event.id}`);

      if (response.status === 200) {
        const updatedEvent = response.data;
        setPlanFile(updatedEvent.plan_file_path);
        setInvoiceFiles(updatedEvent.invoice_files || []);
        setExpenseFiles(updatedEvent.expense_files || []);
      }
    } catch (error) {
      console.error('ივენთის მონაცემების განახლების შეცდომა:', error);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    setUploading(true);
    setUploadType(type);

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
      showNotification(error.response?.data?.message || 'ფაილის ატვირთვა ვერ მოხერხდა', 'error');
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
      } else if (type === 'invoice') {
        setInvoiceFiles(prev => prev.filter(f => f.name !== fileName));
      } else if (type === 'expense') {
        setExpenseFiles(prev => prev.filter(f => f.name !== fileName));
      }
    } catch (error) {
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
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return <PdfIcon color="error" />;
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
            ფაილების მართვა - {event.service_name}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Plan File Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PdfIcon />
              გეგმის ფაილი (PDF)
            </Typography>

            {planFile ? (
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PdfIcon color="error" fontSize="large" />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        გეგმა.pdf
                      </Typography>
                      {event.plan_uploaded_by && (
                        <Typography variant="body2" color="text.secondary">
                          ატვირთა: {event.plan_uploaded_by}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        size="small"
                        component="a"
                        href={`/api/download/${planFile.replace('/uploads/', '')}`}
                        download="გეგმა.pdf"
                      >
                        ჩამოტვირთვა
                      </Button>
                      {isAuthorizedForManagement && (
                        <IconButton
                          color="error"
                          onClick={() => handleFileDelete('plan')}
                          size="small"
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
              <Box sx={{ mt: 2 }}>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  id="plan-file-upload"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      handleFileUpload('plan', e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  disabled={uploading && uploadType === 'plan'}
                />
                <label htmlFor="plan-file-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={uploading && uploadType === 'plan' ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading && uploadType === 'plan'}
                    sx={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #218838 0%, #1aa179 100%)'
                      }
                    }}
                  >
                    {uploading && uploadType === 'plan' ? 'ატვირთვა...' : 'ფაილის ატვირთვა'}
                  </Button>
                </label>
              </Box>
            )}
          </Paper>

          {/* Attached Files Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachFileIcon />
              მიმაგრებული ფაილები
            </Typography>

            {[...invoiceFiles, ...expenseFiles].length > 0 ? (
              <List>
                {[...invoiceFiles, ...expenseFiles].map((file, index) => {
                  const isInvoice = invoiceFiles.includes(file);
                  return (
                    <ListItem key={index} divider>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
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
                          <Typography variant="body2" color="text.secondary">
                            {formatFileSize(file.size)} • {formatDate(file.uploaded_at)}
                            {file.uploaded_by && ` • ${file.uploaded_by}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            component="a"
                            href={`/api/download/${file.path.replace('/uploads/', '')}`}
                            download={file.name}
                          >
                            ჩამოტვირთვა
                          </Button>
                          {isAuthorizedForManagement && (
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleFileDelete(isInvoice ? 'invoice' : 'expense', file.name)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
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
              <Box sx={{ mt: 3 }}>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    ფაილის ტიპი:
                  </Typography>
                  <RadioGroup
                    row
                    defaultValue="invoice"
                    name="file-type-radio"
                  >
                    <FormControlLabel value="invoice" control={<Radio />} label="ინვოისი" />
                    <FormControlLabel value="expense" control={<Radio />} label="ხარჯი" />
                  </RadioGroup>
                </FormControl>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                  style={{ display: 'none' }}
                  id="attached-file-upload"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      const fileType = document.querySelector('input[name="file-type-radio"]:checked').value;
                      handleFileUpload(fileType, e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  disabled={uploading && (uploadType === 'invoice' || uploadType === 'expense')}
                />
                <label htmlFor="attached-file-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={uploading && (uploadType === 'invoice' || uploadType === 'expense') ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading && (uploadType === 'invoice' || uploadType === 'expense')}
                    sx={{
                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #0056b3 0%, #004085 100%)'
                      }
                    }}
                  >
                    {uploading && (uploadType === 'invoice' || uploadType === 'expense') ? 'ატვირთვა...' : 'ფაილის ატვირთვა'}
                  </Button>
                </label>
              </Box>
            )}
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          დახურვა
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventFileManager;