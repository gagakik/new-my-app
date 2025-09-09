
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
  IconButton
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
  Assignment
} from '@mui/icons-material';

const CompanyImport = ({ showNotification, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log('ფაილის არჩევა:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: new Date(selectedFile.lastModified).toLocaleString()
      });

      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      // ზომის შემოწმება
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSize) {
        console.error('ფაილი ძალიან დიდია:', selectedFile.size, 'ბაიტი, მაქსიმუმ:', maxSize);
        showNotification(`ფაილი ძალიან დიდია (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). მაქსიმალური ზომა 5MB.`, 'error');
        e.target.value = '';
        return;
      }
      
      // ტიპის შემოწმება
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['xlsx', 'xls'];
      
      if (allowedTypes.includes(selectedFile.type) || allowedExtensions.includes(fileExtension)) {
        console.log('ფაილი მოწონებულია:', selectedFile.name);
        setFile(selectedFile);
        setImportResult(null);
        showNotification(`ფაილი არჩეულია: ${selectedFile.name}`, 'info');
      } else {
        console.error('არასწორი ფაილის ტიპი:', selectedFile.type, 'გაფართოება:', fileExtension);
        showNotification(
          `მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია. თქვენი ფაილი: ${selectedFile.type || 'უცნობი ტიპი'}`,
          'error'
        );
        e.target.value = '';
      }
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
    if (!file) {
      showNotification('გთხოვთ აირჩიოთ ფაილი', 'error');
      return;
    }

    console.log('იმპორტის დაწყება:', file.name, 'ზომა:', file.size, 'ტიპი:', file.type);
    setImporting(true);
    setImportResult(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ მოიძებნა. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('excelFile', file);

      console.log('მოთხოვნის გაგზავნა სერვერზე...');
      const response = await fetch('/api/import/companies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('სერვერის პასუხი:', response.status, response.statusText);

      let result;
      try {
        result = await response.json();
        console.log('იმპორტის შედეგი:', result);
      } catch (parseError) {
        console.error('JSON პარსინგის შეცდომა:', parseError);
        throw new Error('სერვერისგან არასწორი პასუხი მოვიდა');
      }

      if (response.ok) {
        setImportResult(result);
        
        if (result.errors > 0) {
          showNotification(
            `იმპორტი დასრულდა ნაწილობრივ: ${result.imported}/${result.total} კომპანია დამატებულია, ${result.errors} შეცდომით`,
            'warning'
          );
        } else {
          showNotification(
            `იმპორტი წარმატებით დასრულდა: ${result.imported}/${result.total} კომპანია დამატებულია`,
            'success'
          );
        }
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        // სტატუს კოდის მიხედვით კონკრეტული შეტყობინებები
        let errorMessage = result.error || 'იმპორტის შეცდომა';
        
        switch (response.status) {
          case 401:
            errorMessage = 'ავტორიზაციის შეცდომა. გთხოვთ, ხელახლა შეხვიდეთ სისტემაში.';
            break;
          case 403:
            errorMessage = 'თქვენ არ გაქვთ ამ ოპერაციის შესრულების უფლება.';
            break;
          case 413:
            errorMessage = 'ფაილი ძალიან დიდია. მაქსიმალური ზომა 5MB.';
            break;
          case 415:
            errorMessage = 'არასწორი ფაილის ფორმატი. მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია.';
            break;
          case 500:
            errorMessage = 'სერვერის შიდა შეცდომა. სცადეთ მოგვიანებით.';
            break;
        }
        
        console.error('იმპორტის შეცდომა:', response.status, errorMessage, result);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('იმპორტის პროცესის შეცდომა:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showNotification('სერვერთან კავშირის შეცდომა. შეამოწმეთ ინტერნეტ კავშირი.', 'error');
      } else if (error.message.includes('413')) {
        showNotification('ფაილი ძალიან დიდია. მაქსიმალური ზომა 5MB.', 'error');
      } else {
        showNotification(`შეცდომა: ${error.message}`, 'error');
      }
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    document.getElementById('fileInput').value = '';
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
            onClick={handleImport}
            disabled={!file || importing}
            sx={{ 
              mr: 2,
              minWidth: 150,
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              '&:hover': { 
                background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)' 
              },
              '&:disabled': {
                background: '#ccc'
              }
            }}
          >
            {importing ? 'იმპორტირდება...' : 'იმპორტი'}
          </Button>
          
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

        <Box textAlign="center">
          <Button
            variant="outlined"
            startIcon={<Info />}
            onClick={() => setShowInstructions(true)}
          >
            ინსტრუქციების ნახვა
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
    </Container>
  );
};

export default CompanyImport;
