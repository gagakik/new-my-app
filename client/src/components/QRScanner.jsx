
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Alert,
  Paper,
  TextField,
  Chip,
  Stack
} from '@mui/material';
import {
  Close,
  QrCodeScanner,
  PlayArrow,
  Stop,
  QrCode2,
  Event,
  Business,
  LocationOn,
  CalendarToday,
  CheckCircle,
  ErrorOutline,
  OpenInNew
} from '@mui/icons-material';
import jsQR from 'jsqr';

const QRScanner = ({ onClose, showNotification }) => {
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkCameraAvailability();
    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      setHasCamera(hasVideoInput);
    } catch (error) {
      console.error('კამერის შემოწმების შეცდომა:', error);
      setHasCamera(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        scanForQR();
      }
    } catch (error) {
      console.error('კამერის ჩართვის შეცდომა:', error);
      showNotification('კამერაზე წვდომა შეუძლებელია', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanForQR = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        console.log("QR კოდი ნაპოვნია:", code.data);
        handleManualInput(code.data);
        stopCamera();
        return;
      }
    }

    if (isScanning) {
      requestAnimationFrame(scanForQR);
    }
  };

  const handleManualInput = (inputData) => {
    try {
      const cleanedInput = inputData.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const qrData = JSON.parse(cleanedInput);
      
      if (qrData.type === 'event_invitation') {
        const statusDisplayMap = {
          'registered': 'რეგისტრირებული',
          'approved': 'დადასტურებული', 
          'pending': 'მოლოდინში',
          'cancelled': 'გაუქმებული'
        };
        
        if (qrData.registration_status && statusDisplayMap[qrData.registration_status]) {
          qrData.registration_status_display = statusDisplayMap[qrData.registration_status];
        }
        
        // URL Parameters შექმნა
        const urlParams = new URLSearchParams({
          event: qrData.event_name || '',
          company: qrData.company_name || '',
          booth: qrData.booth_number || '',
          size: qrData.booth_size || '',
          status: qrData.registration_status || '',
          location: qrData.booth_location || '',
          start_date: qrData.start_date || '',
          end_date: qrData.end_date || '',
          message: qrData.custom_message || ''
        });

        // URL-ის განახლება
        const newUrl = `${window.location.origin}/event-info?${urlParams.toString()}`;
        window.history.pushState(null, '', newUrl);
        
        setScannedData(qrData);
        showNotification('QR კოდი წარმატებით წაიკითხა', 'success');
      } else {
        showNotification('QR კოდის ფორმატი არასწორია', 'error');
      }
    } catch (error) {
      console.error('QR parsing error:', error);
      showNotification('QR კოდის ფორმატი არასწორია ან კოდირების პრობლემაა', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleManualInputSubmit = () => {
    if (manualInput.trim()) {
      handleManualInput(manualInput);
      setManualInput('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'დადასტურებული': return 'success';
      case 'რეგისტრირებული': return 'info';
      case 'მოლოდინში': return 'warning';
      case 'გაუქმებული': return 'error';
      default: return 'default';
    }
  };

  const navigateToEventInfo = () => {
    if (scannedData) {
      const urlParams = new URLSearchParams({
        event: scannedData.event_name || '',
        company: scannedData.company_name || '',
        booth: scannedData.booth_number || '',
        size: scannedData.booth_size || '',
        status: scannedData.registration_status || '',
        location: scannedData.booth_location || '',
        start_date: scannedData.start_date || '',
        end_date: scannedData.end_date || '',
        message: scannedData.custom_message || ''
      });
      
      navigate(`/event-info?${urlParams.toString()}`);
      onClose();
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScanner />
          <Typography variant="h6" component="div">
            QR კოდის სკანერი
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {!scannedData ? (
          <Stack spacing={3}>
            {hasCamera ? (
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  background: 'linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <QrCode2 />
                  კამერით სკანირება
                </Typography>
                
                <Box
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '3px solid',
                    borderColor: isScanning ? 'success.main' : 'grey.300',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      height: 300,
                      objectFit: 'cover',
                      backgroundColor: '#f0f0f0'
                    }}
                    autoPlay
                    playsInline
                    muted
                  />
                  {isScanning && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 200,
                        height: 200,
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 1,
                        animation: 'pulse 2s infinite'
                      }}
                    />
                  )}
                </Box>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                <Box sx={{ mt: 2 }}>
                  {!isScanning ? (
                    <Button
                      onClick={startCamera}
                      variant="contained"
                      startIcon={<PlayArrow />}
                      sx={{
                        background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)'
                        }
                      }}
                    >
                      სკანირების დაწყება
                    </Button>
                  ) : (
                    <Button
                      onClick={stopCamera}
                      variant="contained"
                      color="error"
                      startIcon={<Stop />}
                      sx={{
                        background: 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)'
                      }}
                    >
                      სკანირების შეჩერება
                    </Button>
                  )}
                </Box>
              </Paper>
            ) : (
              <Alert severity="warning" icon={<ErrorOutline />}>
                <Typography>კამერა მიუწვდომელია</Typography>
              </Alert>
            )}

            <Divider>
              <Typography variant="body2" color="text.secondary">
                ან
              </Typography>
            </Divider>

            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <QrCode2 />
                ხელით შეყვანა
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="ჩასვით QR კოდის JSON მონაცემები აქ..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                onClick={handleManualInputSubmit}
                variant="contained"
                disabled={!manualInput.trim()}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                }}
              >
                QR კოდის ანალიზი
              </Button>
            </Paper>
          </Stack>
        ) : (
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  color: 'primary.main',
                  fontWeight: 600
                }}
              >
                <CheckCircle color="success" />
                QR კოდის ინფორმაცია
              </Typography>
              
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Event color="primary" />
                  <Typography variant="body1">
                    <strong>ივენთი:</strong> {scannedData.event_name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business color="primary" />
                  <Typography variant="body1">
                    <strong>კომპანია:</strong> {scannedData.company_name}
                  </Typography>
                </Box>
                
                {scannedData.booth_number && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn color="primary" />
                    <Typography variant="body1">
                      <strong>სტენდი:</strong> #{scannedData.booth_number}
                    </Typography>
                  </Box>
                )}
                
                {scannedData.booth_size && (
                  <Typography variant="body1">
                    <strong>სტენდის ზომა:</strong> {scannedData.booth_size} მ²
                  </Typography>
                )}
                
                {scannedData.start_date && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="primary" />
                    <Typography variant="body1">
                      <strong>თარიღები:</strong> {formatDate(scannedData.start_date)} - {formatDate(scannedData.end_date)}
                    </Typography>
                  </Box>
                )}
                
                {scannedData.booth_location && (
                  <Typography variant="body1">
                    <strong>ადგილმდებარეობა:</strong> {scannedData.booth_location}
                  </Typography>
                )}
                
                {(scannedData.registration_status || scannedData.registration_status_display) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      <strong>სტატუსი:</strong>
                    </Typography>
                    <Chip
                      label={scannedData.registration_status_display || scannedData.registration_status}
                      color={getStatusColor(scannedData.registration_status_display || scannedData.registration_status)}
                      size="small"
                    />
                  </Box>
                )}
                
                {scannedData.custom_message && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body1">
                      <strong>შეტყობინება:</strong> {scannedData.custom_message}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        {scannedData ? (
          <>
            <Button
              onClick={navigateToEventInfo}
              variant="contained"
              startIcon={<OpenInNew />}
              sx={{
                background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)'
                }
              }}
            >
              გვერდზე გადასვლა
            </Button>
            <Button
              onClick={() => setScannedData(null)}
              variant="contained"
              startIcon={<QrCodeScanner />}
              sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
              }}
            >
              კიდევ სკანირება
            </Button>
          </>
        ) : null}
        
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
      </DialogActions>

      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
          }
        }
      `}</style>
    </Dialog>
  );
};

export default QRScanner;
