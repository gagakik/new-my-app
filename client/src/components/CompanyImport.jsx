
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { companiesAPI } from '../services/api';

const CompanyImport = ({ onImportComplete, showNotification }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    console.log('📁 CompanyImport: File selected:', {
      name: selectedFile?.name,
      size: selectedFile?.size,
      type: selectedFile?.type,
      lastModified: selectedFile?.lastModified,
      instanceof_File: selectedFile instanceof File,
      constructor: selectedFile?.constructor.name
    });
    
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(selectedFile.type) && 
          !selectedFile.name.toLowerCase().endsWith('.xlsx') && 
          !selectedFile.name.toLowerCase().endsWith('.xls')) {
        showNotification('მხოლოდ Excel ფაილები (.xlsx, .xls) დაშვებულია', 'error');
        return;
      }

      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        showNotification('ფაილის ზომა ძალიან დიდია (მაქსიმუმ 10MB)', 'error');
        return;
      }

      setFile(selectedFile);
      setImportResult(null);
      console.log('✅ CompanyImport: File validation passed');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const mockEvent = { target: { files: [droppedFile] } };
      handleFileSelect(mockEvent);
    }
  };

  const handleImport = async () => {
    if (!file) {
      showNotification('გთხოვთ აირჩიოთ ფაილი', 'error');
      return;
    }

    console.log('🚀🚀🚀 COMPANYIMPORT: STARTING IMPORT 🚀🚀🚀');
    console.log('🚀 CompanyImport: File details before import:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      instanceof_File: file instanceof File,
      constructor: file.constructor.name
    });

    setImporting(true);
    setImportResult(null);

    try {
      // Import API directly at the top of the file instead of dynamic import
      console.log('📡 CompanyImport: Calling companiesAPI.import...');
      
      const result = await companiesAPI.import(file);
      
      console.log('✅✅✅ COMPANYIMPORT: IMPORT SUCCESSFUL ✅✅✅');
      console.log('✅ CompanyImport: Import result:', result);
      
      setImportResult(result);
      
      if (result.success) {
        showNotification(result.message, 'success');
        if (onImportComplete) {
          console.log('🔄 CompanyImport: Calling onImportComplete...');
          onImportComplete();
        }
      } else {
        showNotification(result.message || 'იმპორტი ვერ მოხერხდა', 'error');
      }
      
    } catch (error) {
      console.error('❌❌❌ COMPANYIMPORT: IMPORT FAILED ❌❌❌');
      console.error('❌ CompanyImport: Error type:', error.constructor.name);
      console.error('❌ CompanyImport: Error message:', error.message);
      console.error('❌ CompanyImport: Error stack:', error.stack);
      
      setImportResult({
        success: false,
        message: error.message || 'იმპორტის შეცდომა',
        statistics: { total: 0, success: 0, errors: 1 },
        errors: [error.message]
      });
      
      showNotification(`იმპორტის შეცდომა: ${error.message}`, 'error');
    } finally {
      setImporting(false);
      console.log('🏁 CompanyImport: Import process completed');
    }
  };

  const downloadTemplate = async () => {
    try {
      console.log('📥 CompanyImport: Downloading template...');
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/import/template', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('ტემპლეიტის გადმოწერა ვერ მოხერხდა');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'companies-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ CompanyImport: Template downloaded successfully');
      showNotification('ტემპლეიტი წარმატებით გადმოწერილი', 'success');
    } catch (error) {
      console.error('❌ CompanyImport: Template download error:', error);
      showNotification(`ტემპლეიტის გადმოწერის შეცდომა: ${error.message}`, 'error');
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    setImporting(false);
    console.log('🔄 CompanyImport: Import reset');
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUpload />
        კომპანიების Excel-ით იმპორტი
      </Typography>

      <Grid container spacing={3}>
        {/* Template Download Section */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Download />
                ტემპლეიტის გადმოწერა
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                გადმოწერეთ Excel ტემპლეიტი და შეავსეთ კომპანიების მონაცემები
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={downloadTemplate}
                fullWidth
              >
                ტემპლეიტის გადმოწერა
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* File Upload Section */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                ფაილის ატვირთვა
              </Typography>
              
              {/* Drag & Drop Area */}
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: dragOver ? 'primary.main' : 'grey.300',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: dragOver ? 'action.hover' : 'background.default',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  mb: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  ჩააგდეთ ფაილი აქ ან დააჭირეთ არჩევისთვის
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  მხოლოდ .xlsx და .xls ფაილები (მაქს. 10MB)
                </Typography>
              </Box>

              {file && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    არჩეული ფაილი: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={!file || importing}
                  startIcon={importing ? <CircularProgress size={20} /> : <CloudUpload />}
                  fullWidth
                >
                  {importing ? 'იმპორტირება...' : 'იმპორტი'}
                </Button>
                
                {(file || importResult) && (
                  <Button
                    variant="outlined"
                    onClick={resetImport}
                    disabled={importing}
                  >
                    გასუფთავება
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Progress */}
        {importing && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="h6">
                    იმპორტირება მიმდინარეობს...
                  </Typography>
                </Box>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  გთხოვთ მოიცადოთ, მიმდინარეობს Excel ფაილის დამუშავება
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Import Results */}
        {importResult && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {importResult.success ? <CheckCircle color="success" /> : <Error color="error" />}
                  იმპორტის შედეგი
                </Typography>

                <Alert severity={importResult.success ? "success" : "error"} sx={{ mb: 2 }}>
                  {importResult.message}
                </Alert>

                {importResult.statistics && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>სტატისტიკა:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`სულ: ${importResult.statistics.total}`} 
                        color="default" 
                        size="small" 
                      />
                      <Chip 
                        label={`წარმატებული: ${importResult.statistics.success}`} 
                        color="success" 
                        size="small" 
                      />
                      <Chip 
                        label={`შეცდომები: ${importResult.statistics.errors}`} 
                        color="error" 
                        size="small" 
                      />
                    </Box>
                  </Box>
                )}

                {importResult.processedCompanies && importResult.processedCompanies.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      წარმატებით დამატებული კომპანიები:
                    </Typography>
                    <List dense>
                      {importResult.processedCompanies.slice(0, 10).map((company, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={company.name}
                            secondary={`მწკრივი ${company.row}`}
                          />
                        </ListItem>
                      ))}
                      {importResult.processedCompanies.length > 10 && (
                        <ListItem>
                          <ListItemText 
                            primary={`... და კიდევ ${importResult.processedCompanies.length - 10} კომპანია`}
                            sx={{ fontStyle: 'italic' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}

                {importResult.errors && importResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom color="error">
                      შეცდომები:
                    </Typography>
                    <List dense>
                      {importResult.errors.map((error, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={error}
                            sx={{ color: 'error.main' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default CompanyImport;
