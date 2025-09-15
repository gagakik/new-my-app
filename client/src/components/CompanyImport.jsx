import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemSecondaryAction
} from '@mui/material';
import {
  CloudUpload,
  Download,
  FileUpload,
  Refresh,
  CheckCircle,
  Error,
  Info,
  Close,
  Description,
  Assignment,
  History,
  Visibility
} from '@mui/icons-material';
import { companiesAPI } from '../services/api';

// Vite uses import.meta.env instead of process.env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const CompanyImport = ({ showNotification, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    console.log('📁 File selection event:', {
      filePresent: !!selectedFile,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      fileType: selectedFile?.type,
      fileLastModified: selectedFile?.lastModified
    });

    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/octet-stream' // ზოგჯერ ამ ტიპად მოდის
      ];

      // ზომის შემოწმება - ვზრდით 10MB-მდე
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        console.log('❌ File too large:', selectedFile.size);
        showNotification(`ფაილი ძალიან დიდია (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). მაქსიმალური ზომა 10MB.`, 'error');
        setFile(null);
        e.target.value = '';
        return;
      }

      // გაფართოების შემოწმება (უფრო მნიშვნელოვანი ვიდრე MIME ტიპი)
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['xlsx', 'xls'];
      const isValidExtension = allowedExtensions.includes(fileExtension);
      const isValidType = allowedTypes.includes(selectedFile.type);

      console.log('📁 File validation:', {
        extension: fileExtension,
        isValidExtension,
        mimeType: selectedFile.type,
        isValidType
      });

      if (isValidExtension || isValidType) {
        setFile(selectedFile);
        setImportResult(null);
        console.log('✅ File accepted:', selectedFile.name);
        showNotification(`ფაილი არჩეულია: ${selectedFile.name}`, 'info');
      } else {
        console.log('❌ File rejected - invalid type/extension');
        showNotification(
          `მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია. თქვენი ფაილი: ${selectedFile.name} (${selectedFile.type || 'უცნობი ტიპი'})`,
          'error'
        );
        setFile(null);
        e.target.value = '';
      }
    } else {
      console.log('📁 No file selected');
      setFile(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/import/companies/template', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'companies-template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('შაბლონი ჩამოიტვირთა', 'success');
      } else {
        throw new Error('შაბლონის ჩამოტვირთვა ვერ მოხერხდა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const exportCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/import/companies/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `companies-export-${timestamp}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('კომპანიების ექსპორტი დასრულდა', 'success');
      } else {
        throw new Error('ექსპორტის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const handleImport = async () => {
    console.log('🚀🚀🚀 HANDLE IMPORT CALLED 🚀🚀🚀');
    console.log('🚀 Timestamp:', new Date().toISOString());
    console.log('🚀 Current state:', { file, importing });

    // Check authentication first
    const token = localStorage.getItem('token');
    console.log('🔑 Auth check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 20) + '...'
    });

    if (!token) {
      console.error('❌ No authentication token found');
      showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.', 'error');
      return;
    }

    console.log('🚀 File object details:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      lastModified: file?.lastModified,
      instanceof_File: file instanceof File,
      instanceof_Blob: file instanceof Blob
    });

    // Test if file is readable
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('✅ File is readable, first 100 bytes:', e.target.result.slice(0, 100));
      };
      reader.onerror = (e) => {
        console.error('❌ File read error:', e);
      };
      reader.readAsArrayBuffer(file.slice(0, 100));
    } catch (fileTestError) {
      console.error('❌ File test error:', fileTestError);
    }

    // Validate file before proceeding
    if (!(file instanceof File)) {
      console.error('❌ Selected file is not a File object:', typeof file);
      showNotification('მონიშნული ფაილი არასწორია. გთხოვთ ხელახლა აირჩიოთ.', 'error');
      return;
    }

    if (file.size === 0) {
      console.error('❌ Selected file is empty');
      showNotification('მონიშნული ფაილი ცარიელია.', 'error');
      return;
    }

    console.log('🔒 Setting importing state to true...');
    setImporting(true);
    setImportResult(null);

    console.log('📊 Import process started at:', new Date().toLocaleTimeString());

    const formData = new FormData();
    formData.append('excelFile', file);

    console.log('📋 FormData prepared:');
    console.log('📋 FormData has excelFile:', formData.has('excelFile'));
    console.log('📋 FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`📋   ${key}:`, value);
      if (value instanceof File) {
        console.log(`📋     File name: ${value.name}, size: ${value.size}, type: ${value.type}`);
      }
    }

    // Test FormData creation
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFormData = new FormData();
    testFormData.append('test', testBlob, 'test.txt');
    console.log('🧪 Test FormData works:', testFormData.has('test'));

    // Log request details before sending
    console.log('🌐 About to send request to:', `${API_BASE_URL}/api/import/companies`);
    console.log('🌐 Request headers will include:', {
      'Authorization': `Bearer ${token.substring(0, 20)}...`
    });
    console.log('🌐 FormData size estimate:', file.size, 'bytes');


    // Use the API service
    console.log('🌐 Calling companiesAPI.import()...');
    console.log('🌐 File being sent:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    try {
      const response = await companiesAPI.import(file);

      console.log('✅✅✅ IMPORT SUCCESSFUL ✅✅✅');
      console.log('✅ Response:', response);
      console.log('📊 Import process completed at:', new Date().toLocaleTimeString());

      setImportResult(response);

      if (response.errors && response.errors > 0) {
        showNotification(
          `იმპორტი დასრულდა ნაწილობრივ: ${response.imported}/${response.total} კომპანია დამატებულია, ${response.errors} შეცდომით`,
          'warning'
        );
      } else {
        showNotification(
          `იმპორტი წარმატებით დასრულდა: ${response.imported}/${response.total} კომპანია დამატებულია`,
          'success'
        );
      }

      if (onImportComplete) {
        console.log('🔄 Calling onImportComplete callback...');
        onImportComplete();
      }
    } catch (error) {
      console.error('❌❌❌ IMPORT PROCESS ERROR ❌❌❌');
      console.error('❌ Error object:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error constructor:', error.constructor.name);

      if (error.response) {
        console.error('❌ HTTP Response Error:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Data:', error.response.data);
        console.error('  Headers:', error.response.headers);
      } else {
        console.error('❌ No response object in error');
      }

      // Network error detection
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error('❌ Detected network/fetch error');
      }
      if (error.message.includes('NetworkError')) {
        console.error('❌ Detected NetworkError');
      }

      let errorMessage = 'უცნობი შეცდომა დაფიქსირდა';

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'სერვერთან კავშირის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი.';
      } else if (error.message?.includes('413') || error.response?.status === 413) {
        errorMessage = 'ფაილი ძალიან დიდია. მაქსიმალური ზომა 10MB.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showNotification(`შეცდომა: ${errorMessage}`, 'error');
    } finally {
      console.log('🔄 Import process finished, setting importing to false');
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    document.getElementById('fileInput').value = '';
  };

  const fetchImportHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/import/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setImportHistory(result.files);
      } else {
        showNotification('იმპორტის ისტორიის ჩამოტვირთვა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('Import history error:', error);
      showNotification('იმპორტის ისტორიის ჩამოტვირთვა ვერ მოხერხდა', 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }} >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box textAlign="center" mb={4}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: 'primary.main',
              fontWeight: 600,
              mb: 1
            }}
          >
            კომპანიების იმპორტი Excel ფაილიდან
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ატვირთეთ Excel ფაილი კომპანიების მონაცემებით
          </Typography>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  ფაილის მომზადება
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  შაბლონის ჩამოტვირთვა და არსებული მონაცემების ექსპორტი
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={downloadTemplate}
                  sx={{
                    mr: 1,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                    }
                  }}
                >
                  შაბლონი
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FileUpload />}
                  onClick={exportCompanies}
                  sx={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e788f5 0%, #f04556 100%)'
                    }
                  }}
                >
                  ექსპორტი
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                border: file ? '2px solid #4caf50' : '2px dashed #ccc',
                backgroundColor: file ? '#f8fff8' : 'inherit'
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <input
                  id="fileInput"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="fileInput">
                  <IconButton
                    component="span"
                    sx={{
                      width: 80,
                      height: 80,
                      mb: 2,
                      backgroundColor: 'primary.light',
                      color: 'white',
                      '&:hover': { backgroundColor: 'primary.main' }
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 40 }} />
                  </IconButton>
                </label>
                <Typography variant="h6" gutterBottom>
                  ფაილის არჩევა
                </Typography>
                {file ? (
                  <Chip
                    icon={<CheckCircle />}
                    label={file.name}
                    color="success"
                    variant="outlined"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    დააწკაპუნეთ ან გადმოიტანეთ Excel ფაილი
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box textAlign="center" mb={4}>
          <Button
            variant="contained"
            size="large"
            startIcon={importing ? null : <CloudUpload />}
            onClick={() => {
              console.log('🔥 IMPORT BUTTON CLICKED!');
              console.log('🔥 Button state:', { file: !!file, importing, disabled: !file || importing });
              console.log('🔥 File at click time:', file);
              console.log('🔥 Calling handleImport...');
              handleImport();
            }}
            disabled={!file || importing}
            sx={{
              mr: 2,
              minWidth: 150,
              background: (!file || importing) ? '#ccc' : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              '&:hover': {
                background: (!file || importing) ? '#ccc' : 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)'
              },
              '&:disabled': {
                background: '#ccc'
              }
            }}
          >
            {importing ? 'იმპორტირდება...' : 'იმპორტი'}
          </Button>

          {process.env.NODE_ENV === 'development' && file && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => {
                console.log('🧪 DIRECT TEST BUTTON CLICKED');
                console.log('🧪 Current file:', file);
                console.log('🧪 Calling handleImport directly...');
                handleImport();
              }}
              disabled={importing}
              sx={{ mr: 2 }}
            >
              🧪 Test Import
            </Button>
          )}

          {file && (
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={resetImport}
              disabled={importing}
            >
              გასუფთავება
            </Button>
          )}
        </Box>

        {importing && (
          <Box mb={4}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        )}

        {importResult && (
          <Card elevation={2} sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                იმპორტის შედეგები
              </Typography>

              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="primary">
                        {importResult.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        სულ
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="success.main">
                        {importResult.imported}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        წარმატებული
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="error.main">
                        {importResult.errors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        შეცდომები
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    შეცდომების დეტალები ({importResult.errorDetails.length}):
                  </Typography>
                  <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {importResult.errorDetails.map((error, index) => (
                      <ListItem key={index} sx={{ py: 0.5, alignItems: 'flex-start' }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={error}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.875rem',
                              wordBreak: 'break-word'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 რჩევა: შეამოწმეთ შაბლონის სწორი შევსება და საჭირო ველის (კომპანიის დასახელება) არსებობა
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Box textAlign="center" sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Info />}
            onClick={() => setShowInstructions(true)}
          >
            ინსტრუქციების ნახვა
          </Button>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => {
              fetchImportHistory();
              setShowHistory(true);
            }}
          >
            იმპორტის ისტორია
          </Button>
        </Box>
      </Paper>

      {/* Instructions Dialog */}
      <Dialog
        open={showInstructions}
        onClose={() => setShowInstructions(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            იმპორტის ინსტრუქციები
          </Typography>
          <IconButton
            onClick={() => setShowInstructions(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            ნაბიჯები:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <Description color="primary" />
              </ListItemIcon>
              <ListItemText primary="ჩამოტვირთეთ შაბლონი Excel ფაილის სწორი ფორმატის გასაცნობად" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Assignment color="primary" />
              </ListItemIcon>
              <ListItemText primary="შეავსეთ შაბლონი თქვენი კომპანიების მონაცემებით" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CloudUpload color="primary" />
              </ListItemIcon>
              <ListItemText primary="აირჩიეთ შევსებული ფაილი და დააჭირეთ იმპორტი" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Refresh color="primary" />
              </ListItemIcon>
              <ListItemText primary="თუ კომპანია უკვე არსებობს (იგივე საიდენტიფიკაციო კოდით), ის განახლდება" />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom color="primary">
            მნიშვნელოვანი წესები:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="საჭირო ველი: კომპანიის დასახელება"
                secondary="ეს ველი აუცილებლად უნდა იყოს შევსებული. საიდენტიფიკაციო კოდი თუ არ მიუთითოთ, ავტომატურად შეიქმნება."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="სტატუსი: მხოლოდ 'აქტიური' ან 'პასიური'"
                secondary="სხვა მნიშვნელობები არ იქნება მიღებული"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="ვებსაიტი: მიუთითეთ სრული URL (http:// ან https://)"
                secondary="მაგალითად: https://example.com"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="მაქსიმალური ფაილის ზომა: 5MB"
                secondary="უფრო დიდი ფაილები არ იქნება დამუშავებული"
              />
            </ListItem>
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowInstructions(false)}>
            დახურვა
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import History Dialog */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">
            იმპორტის ისტორია
          </Typography>
          <IconButton
            onClick={() => setShowHistory(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {importHistory.length > 0 ? (
            <List>
              {importHistory.map((historyFile, index) => (
                <ListItem key={index} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, mb: 2 }}>
                  <ListItemIcon>
                    <Description color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" fontWeight="bold">
                        {historyFile.original_name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          ატვირთვის თარიღი: {new Date(historyFile.uploaded_at).toLocaleString('ka-GE')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ატვირთა: {historyFile.uploaded_by_username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          სტატუსი: {historyFile.import_status}
                        </Typography>
                        {historyFile.import_completed_at && (
                          <Typography variant="body2" color="text.secondary">
                            დასრულდა: {new Date(historyFile.import_completed_at).toLocaleString('ka-GE')}
                          </Typography>
                        )}
                        <Typography variant="body2" color="success.main">
                          იმპორტირდა: {historyFile.imported_count} / {historyFile.total_count}
                        </Typography>
                        {historyFile.error_count > 0 && (
                          <Typography variant="body2" color="error.main">
                            შეცდომები: {historyFile.error_count}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      startIcon={<Visibility />}
                      onClick={() => window.open(historyFile.file_path, '_blank')}
                      size="small"
                    >
                      ნახვა
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              იმპორტის ისტორია ცარიელია
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            დახურვა
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompanyImport;