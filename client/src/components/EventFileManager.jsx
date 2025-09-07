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
  alpha
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
  FolderOpen
} from '@mui/icons-material';
import * as filesAPI from '../services/api';

const EventFileManager = ({ event, onClose, showNotification, userRole }) => {
  const theme = useTheme();
  const [planFile, setPlanFile] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [expenseFiles, setExpenseFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('invoice');

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
      const updatedEvent = await filesAPI.getEvent(event.id);
      setPlanFile(updatedEvent.plan_file_path);
      setInvoiceFiles(updatedEvent.invoice_files || []);
      setExpenseFiles(updatedEvent.expense_files || []);
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
            color: 'white'
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
                        href={`/api/download/${planFile.replace('/uploads/', '')}`}
                        download="გეგმა.pdf"
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
                          <Description
                            color={isInvoice ? "info" : "warning"}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" fontWeight={500}>
                                {file.name}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1}>
                            <Button
                              href={`/api/download/${file.path.replace('/uploads/', '')}?t=${Date.now()}`}
                              download={file.name}
                              target="_blank"
                              rel="noopener noreferrer"
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
                    accept=".pdf,.doc,.docx,.xlsx,.xls"
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
  );
};

export default EventFileManager;