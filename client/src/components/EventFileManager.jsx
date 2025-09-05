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
  RadioGroup,
  Modal,
  Backdrop,
  Fade
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
  Autorenew as AutorenewIcon,
  Visibility as VisibilityIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { filesAPI } from '../services/api';
import api from '../services/api'; // Assuming api is imported from '../services/api'

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [eventData, setEventData] = useState(event || {}); // Use state to hold event data
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState('');

  const isAuthorizedForManagement =
    userRole === 'admin' ||
    userRole === 'manager' ||
    userRole === 'sales' ||
    userRole === 'marketing';

  useEffect(() => {
    if (event && event.id) {
      console.log('Event data:', event);
      setEventData(event);
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
    }
  }, [event]); // Include the full event object in dependencies

  const [refreshing, setRefreshing] = useState(false);

  const refreshEventData = async () => {
    // Prevent multiple simultaneous refresh requests
    if (refreshing) return;

    // Ensure event.id is available before making the API call
    if (!event || !event.id) {
      console.error("Cannot refresh data: event or event.id is not available.");
      return;
    }

    setRefreshing(true);
    try {
      const response = await api.get(`/events/${event.id}/files`);

      if (response.status === 200) {
        const updatedFiles = response.data;
        console.log('Updated files data:', updatedFiles);

        // Update plan file
        setPlanFile(updatedFiles.plan_file_path);

        // Update event data state with file info
        setEventData(prev => ({
          ...prev,
          plan_file_path: updatedFiles.plan_file_path,
          plan_uploaded_by: updatedFiles.plan_uploaded_by,
          plan_uploaded_at: updatedFiles.plan_uploaded_at
        }));

        // Set files arrays directly
        setInvoiceFiles(updatedFiles.invoice_files || []);
        setExpenseFiles(updatedFiles.expense_files || []);

        console.log('Files updated - Invoice files:', updatedFiles.invoice_files?.length || 0, 'Expense files:', updatedFiles.expense_files?.length || 0);
      }
    } catch (error) {
      console.error('ივენთის ფაილების განახლების შეცდომა:', error);
      showNotification('ფაილების სიის განახლება ვერ მოხერხდა.', 'error');
    } finally {
      setRefreshing(false);
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
      let response;
      if (type === 'plan') {
        response = await filesAPI.uploadPlanFile(event.id, file);
      } else if (type === 'invoice') {
        response = await filesAPI.uploadInvoiceFiles(event.id, [file]);
      } else if (type === 'expense') {
        response = await filesAPI.uploadExpenseFiles(event.id, [file]);
      }

      showNotification(response.message, 'success');
      await refreshEventData();
    } catch (error) {
      console.error('File upload error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      const errorMessage = error.response?.data?.message || error.message || 'ფაილის ატვირთვა ვერ მოხერხდა';
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
      let response;
      if (type === 'plan') {
        response = await filesAPI.deletePlanFile(event.id);
      } else if (type === 'invoice') {
        response = await filesAPI.deleteInvoiceFile(event.id, fileName);
      } else if (type === 'expense') {
        response = await filesAPI.deleteExpenseFile(event.id, fileName);
      }

      showNotification(response.message, 'success');

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
      showNotification(error.response?.data?.message || error.message || 'ფაილის წაშლა ვერ მოხერხდა', 'error');
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
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return <ImageIcon color="info" />;
    return <DocIcon color="primary" />;
  };

  const isPreviewable = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
  };

  const handlePreview = async (fileName, filePath) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      setPreviewType('pdf');
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      setPreviewType('image');
    } else {
      return; // Not previewable
    }

    try {
      // Extract filename from path properly
      const actualFileName = filePath ? filePath.split('/').pop() : fileName;

      const response = await filesAPI.downloadFile(actualFileName);

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      setPreviewFile({
        name: fileName,
        path: filePath,
        url: blobUrl
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      showNotification('ფაილის პრევიუ ვერ მოხერხდა', 'error');
    }
  };

  const closePreview = () => {
    // Clean up blob URL to prevent memory leaks
    if (previewFile?.url && previewFile.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewType('');
  };

  const handlePlanFileDownload = async (fileName) => {
    try {
      await filesAPI.downloadPlanFile(fileName);
    } catch (error) {
      console.error('Error downloading plan file:', error);
      showNotification('ფაილის ჩამოტვირთვის შეცდომა', 'error');
    }
  };

  const handleInvoiceFileDownload = async (fileName) => {
    try {
      await filesAPI.downloadInvoiceFile(fileName);
    } catch (error) {
      console.error('Error downloading invoice file:', error);
      showNotification('ფაილის ჩამოტვირთვის შეცდომა', 'error');
    }
  };

  const handleExpenseFileDownload = async (fileName) => {
    try {
      await filesAPI.downloadExpenseFile(fileName);
    } catch (error) {
      console.error('Error downloading expense file:', error);
      showNotification('ფაილის ჩამოტვირთვის შეცდომა', 'error');
    }
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
            startIcon={refreshing ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <AutorenewIcon />}
            onClick={refreshEventData}
            color="inherit"
            size="small"
            disabled={refreshing}
            sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            title="ფაილების სიის განახლება"
          >
            {refreshing ? 'განახლება...' : 'განახლება'}
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
                        startIcon={<VisibilityIcon />}
                        size="small"
                        onClick={() => {
                          const filePath = eventData.plan_file_path || planFile;
                          if (filePath) {
                            const filename = filePath.split('/').pop();
                            handlePreview(filename, filePath);
                          }
                        }}
                        disabled={!(eventData.plan_file_path || planFile)}
                        sx={{ mr: 1 }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        size="small"
                        onClick={async () => {
                          const filePath = eventData.plan_file_path || planFile;
                          if (filePath) {
                            const filename = filePath.split('/').pop();
                            await handlePlanFileDownload(filename);
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
                        {isPreviewable(file.name) && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handlePreview(file.name, file.path)}
                            disabled={!file.path}
                            sx={{ mr: 1 }}
                          >
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={async () => {
                            if (file.path) {
                              const filename = file.path.split('/').pop();
                              if (isInvoice) {
                                await handleInvoiceFileDownload(filename);
                              } else {
                                await handleExpenseFileDownload(filename);
                              }
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
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.bmp,.webp"
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

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={closePreview}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={previewOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            height: '90vh',
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Preview Header */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f5f5f5'
            }}>
              <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
                {previewFile?.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={async () => {
                    if (previewFile?.path) {
                      const filename = previewFile.path.split('/').pop();
                      if (previewFile.name.toLowerCase().includes('invoice')) {
                        await handleInvoiceFileDownload(filename);
                      } else if (previewFile.name.toLowerCase().includes('expense')) {
                        await handleExpenseFileDownload(filename);
                      } else {
                        await handlePlanFileDownload(filename);
                      }
                    }
                  }}
                >
                  ჩამოტვირთვა
                </Button>
                <IconButton onClick={closePreview} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Preview Content */}
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {previewType === 'pdf' && previewFile && (
                <iframe
                  src={previewFile.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="PDF Preview"
                />
              )}

              {previewType === 'image' && previewFile && (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'auto',
                  p: 2
                }}>
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '4px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <Alert
                    severity="error"
                    sx={{ display: 'none', mt: 2 }}
                  >
                    სურათის ჩატვირთვა ვერ მოხერხდა
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>
    </Dialog>
  );
};

export default EventFileManager;