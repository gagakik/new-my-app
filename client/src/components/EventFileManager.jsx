
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  Stack,
  useTheme,
  alpha,
  Modal,
  Backdrop,
  Fade
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Download,
  Delete,
  PictureAsPdf,
  Description,
  AttachFile,
  Schedule,
  Person,
  FolderOpen,
  Visibility,
  Image,
  ZoomIn,
  ZoomOut,
  RotateRight
} from '@mui/icons-material';
import api, { filesAPI } from '../services/api';

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const theme = useTheme();
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('invoice');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

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
      await fetchEventFiles();
    } catch (error) {
      console.error('ივენთის მონაცემების განახლების შეცდომა:', error);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();

      if (type === 'plan') {
        formData.append('plan_file', file);
        await filesAPI.uploadPlanFile(event.id, formData);
      } else if (type === 'invoice') {
        formData.append('invoice_file', file);
        formData.append('file_name', file.name);
        await filesAPI.uploadInvoiceFile(event.id, formData);
      } else if (type === 'expense') {
        formData.append('expense_file', file);
        formData.append('file_name', file.name);
        await filesAPI.uploadExpenseFile(event.id, formData);
      }

      showNotification('ფაილი წარმატებით აიტვირთა', 'success');
      await refreshEventData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'ფაილის ატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (type, fileName = null) => {
    const confirmMessage = type === 'plan'
      ? 'ნამდვილად გსურთ გეგმის ფაილის წაშლა?'
      : `ნამდვილად გსურთ ფაილის "${fileName}" წაშლა?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      let result;

      if (type === 'plan') {
        result = await filesAPI.deletePlanFile(event.id);
      } else if (type === 'invoice') {
        result = await filesAPI.deleteInvoiceFile(event.id, fileName);
      } else if (type === 'expense') {
        result = await filesAPI.deleteExpenseFile(event.id, fileName);
      }

      showNotification(result.message, 'success');
      await refreshEventData();
    } catch (error) {
      showNotification(error.response?.data?.message || 'ფაილის წაშლა ვერ მოხერხდა', 'error');
    }
  };

  const handleFileDownload = async (filePath, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const cleanPath = filePath.replace(/^\/uploads\//, '');
      
      const response = await fetch(`/api/download/${cleanPath}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showNotification('ფაილი წარმატებით ჩამოიტვირთა', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showNotification('ფაილის ჩამოტვირთვა ვერ მოხერხდა', 'error');
    }
  };

  const handlePreview = async (filePath, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const cleanPath = filePath.replace(/^\/uploads\//, '');
      
      const response = await fetch(`/api/download/${cleanPath}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const fileExtension = fileName.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
      const isPDF = fileExtension === 'pdf';
      
      setPreviewFile({ url, name: fileName });
      setPreviewType(isImage ? 'image' : isPDF ? 'pdf' : 'other');
      setPreviewOpen(true);
      setZoom(1);
      setRotation(0);
    } catch (error) {
      console.error('Preview error:', error);
      showNotification('ფაილის გახსნა ვერ მოხერხდა', 'error');
    }
  };

  const closePreview = () => {
    if (previewFile?.url) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewType('');
    setZoom(1);
    setRotation(0);
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

  const fetchEventFiles = async () => {
    try {
      const data = await filesAPI.getEventFiles(event.id);
      setPlanFile(data.planFile);
      setInvoiceFiles(data.invoiceFiles || []);
      setExpenseFiles(data.expenseFiles || []);
    } catch (error) {
      console.error('Error fetching event files:', error);
    }
  };

  useEffect(() => {
    if (event?.id) {
      fetchEventFiles();
    }
  }, [event]);

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (extension === 'pdf') {
      return <PictureAsPdf color="error" />;
    } else if (imageExtensions.includes(extension)) {
      return <Image color="success" />;
    } else {
      return <Description color="info" />;
    }
  };

  const FileUploadButton = ({ type, accept, children }) => (
    <Button
      component="label"
      variant="outlined"
      startIcon={<CloudUpload />}
      disabled={uploading}
      sx={{
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: alpha(theme.palette.primary.main, 0.5),
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        '&:hover': {
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        }
      }}
    >
      {uploading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
      {children}
      <input
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          if (e.target.files[0]) {
            handleFileUpload(e.target.files[0], type);
            e.target.value = '';
          }
        }}
        disabled={uploading}
      />
    </Button>
  );

  return (
    <>
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.shadows[20]
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderOpen />
            <Typography variant="h6" component="div">
              ფაილების მართვა - {event.service_name}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
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
          <Stack spacing={3}>
            {/* Plan File Section */}
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.primary.main, 0.3)
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: theme.palette.primary.main,
                    fontWeight: 600
                  }}
                >
                  <PictureAsPdf />
                  გეგმის ფაილი (PDF)
                </Typography>

                {planFile ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.success.main, 0.05),
                      borderColor: alpha(theme.palette.success.main, 0.3)
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          გეგმა.pdf
                        </Typography>
                        {event.plan_uploaded_by && (
                          <Typography variant="caption" color="text.secondary">
                            <Person fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                            ატვირთა: {event.plan_uploaded_by}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          onClick={() => handlePreview(planFile, 'გეგმა.pdf')}
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          color="info"
                        >
                          გახსნა
                        </Button>
                        <Button
                          onClick={() => handleFileDownload(planFile, 'გეგმა.pdf')}
                          variant="contained"
                          size="small"
                          startIcon={<Download />}
                          color="success"
                        >
                          ჩამოტვირთვა
                        </Button>
                        {isAuthorizedForManagement && (
                          <Button
                            onClick={() => handleFileDelete('plan')}
                            variant="outlined"
                            size="small"
                            startIcon={<Delete />}
                            color="error"
                          >
                            წაშლა
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ) : (
                  <Alert
                    severity="info"
                    icon={<Description />}
                    sx={{ borderRadius: 2 }}
                  >
                    გეგმის ფაილი არ არის ატვირთული
                  </Alert>
                )}

                {isAuthorizedForManagement && (
                  <Box sx={{ mt: 2 }}>
                    <FileUploadButton type="plan" accept=".pdf">
                      PDF ფაილის ატვირთვა
                    </FileUploadButton>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Attached Files Section */}
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: alpha(theme.palette.secondary.main, 0.3)
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: theme.palette.secondary.main,
                    fontWeight: 600
                  }}
                >
                  <AttachFile />
                  მიმაგრებული ფაილები
                </Typography>

                {[...invoiceFiles, ...expenseFiles].length > 0 ? (
                  <List sx={{ p: 0 }}>
                    {[...invoiceFiles, ...expenseFiles].map((file, index) => {
                      const isInvoice = invoiceFiles.includes(file);
                      const fileName = file.name;
                      return (
                        <ListItem
                          key={index}
                          sx={{
                            mb: 1,
                            backgroundColor: alpha(
                              isInvoice ? theme.palette.info.main : theme.palette.warning.main,
                              0.05
                            ),
                            borderRadius: 2,
                            border: `1px solid ${alpha(
                              isInvoice ? theme.palette.info.main : theme.palette.warning.main,
                              0.2
                            )}`
                          }}
                        >
                          <ListItemIcon>
                            {getFileIcon(fileName)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1" fontWeight={500}>
                                  {fileName}
                                </Typography>
                                <Chip
                                  label={isInvoice ? 'ინვოისი' : 'ხარჯი'}
                                  size="small"
                                  color={isInvoice ? "info" : "warning"}
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {formatFileSize(file.size)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  <Schedule fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                  {formatDate(file.uploaded_at)}
                                </Typography>
                                {file.uploaded_by && (
                                  <Typography variant="caption" color="text.secondary">
                                    <Person fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                    {file.uploaded_by}
                                  </Typography>
                                )}
                              </div>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1}>
                              <Button
                                onClick={() => handlePreview(file.path, file.name)}
                                variant="outlined"
                                size="small"
                                startIcon={<Visibility />}
                                color="info"
                              >
                                გახსნა
                              </Button>
                              <Button
                                onClick={() => handleFileDownload(file.path, file.name)}
                                variant="contained"
                                size="small"
                                startIcon={<Download />}
                                color="success"
                              >
                                ჩამოტვირთვა
                              </Button>
                              {isAuthorizedForManagement && (
                                <Button
                                  onClick={() => handleFileDelete(isInvoice ? 'invoice' : 'expense', file.name)}
                                  variant="outlined"
                                  size="small"
                                  startIcon={<Delete />}
                                  color="error"
                                >
                                  წაშლა
                                </Button>
                              )}
                            </Stack>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Alert
                    severity="info"
                    icon={<AttachFile />}
                    sx={{ borderRadius: 2 }}
                  >
                    მიმაგრებული ფაილები არ არის ატვირთული
                  </Alert>
                )}

                {isAuthorizedForManagement && (
                  <Box sx={{ mt: 2 }}>
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                      <FormLabel component="legend" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                        ფაილის ტიპი:
                      </FormLabel>
                      <RadioGroup
                        row
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        sx={{ mt: 1 }}
                      >
                        <FormControlLabel
                          value="invoice"
                          control={<Radio size="small" />}
                          label="ინვოისი"
                        />
                        <FormControlLabel
                          value="expense"
                          control={<Radio size="small" />}
                          label="ხარჯი"
                        />
                      </RadioGroup>
                    </FormControl>

                    <FileUploadButton
                      type={uploadType}
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    >
                      დოკუმენტის ატვირთვა
                    </FileUploadButton>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={onClose}
            variant="contained"
            startIcon={<Close />}
            sx={{
              borderRadius: 2,
              px: 3
            }}
          >
            დახურვა
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={closePreview}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
        }}
      >
        <Fade in={previewOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              height: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Preview Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" component="h2">
                {previewFile?.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {previewType === 'image' && (
                  <>
                    <IconButton onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}>
                      <ZoomOut />
                    </IconButton>
                    <IconButton onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}>
                      <ZoomIn />
                    </IconButton>
                    <IconButton onClick={() => setRotation(prev => (prev + 90) % 360)}>
                      <RotateRight />
                    </IconButton>
                  </>
                )}
                <IconButton onClick={closePreview}>
                  <Close />
                </IconButton>
              </Box>
            </Box>

            {/* Preview Content */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto'
              }}
            >
              {previewType === 'pdf' && previewFile?.url && (
                <iframe
                  src={previewFile.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title={previewFile.name}
                />
              )}
              
              {previewType === 'image' && previewFile?.url && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </Box>
              )}

              {previewType === 'other' && (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <Description sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography variant="h6" color="text.secondary">
                    ფაილის გადახედვა არ არის ხელმისაწვდომი
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    გთხოვთ ჩამოტვირთოთ ფაილი მისი სანახავად
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

export default EventFileManager;
