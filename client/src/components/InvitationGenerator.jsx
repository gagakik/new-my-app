
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Chip,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Divider,
  Switch,
  Alert,
  Container
} from '@mui/material';
import {
  Close,
  QrCode,
  Download,
  SelectAll,
  DeselectAll,
  PictureAsPdf,
  Business,
  Event,
  Info
} from '@mui/icons-material';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCodeLib from 'qrcode';
import QRCodeGenerator from 'qrcode-generator';

const generateQRCodeDataURL = async (text, size = 120) => {
  try {
    const dataUrl = await QRCodeLib.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error("QR Code generation error:", err);
    return null;
  }
};

const drawQRCodeToPDF = (pdf, text, x, y, size) => {
  try {
    const qr = QRCodeGenerator(0, 'M');
    qr.addData(text);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const moduleSize = size / moduleCount;

    // Draw white background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, size, size, 'F');

    // Draw QR code modules
    pdf.setFillColor(0, 0, 0);
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          pdf.rect(
            x + (col * moduleSize),
            y + (row * moduleSize),
            moduleSize,
            moduleSize,
            'F'
          );
        }
      }
    }

    // Draw border
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.rect(x, y, size, size, 'S');

    return true;
  } catch (error) {
    console.error('QR კოდის ხატვის შეცდომა:', error);
    return false;
  }
};

const InvitationGenerator = ({ eventData, participants, onClose, showNotification }) => {
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [invitationTemplate, setInvitationTemplate] = useState('standard');
  const [includeQRInfo, setIncludeQRInfo] = useState({
    eventDetails: true,
    participantInfo: true,
    boothLocation: true,
    contactInfo: false,
    customMessage: '',
    useURL: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const invitationRefs = useRef([]);

  useEffect(() => {
    setSelectedParticipants(participants.map(p => p.id));
  }, [participants]);

  const generateQRData = (participant) => {
    if (includeQRInfo.useURL) {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams({
        event: eventData.service_name,
        company: participant.company_name,
        booth: participant.booth_number,
        size: participant.booth_size,
        status: participant.registration_status
      });
      return `${baseUrl}/event-info?${params.toString()}`;
    }

    const qrData = {
      type: 'event_invitation',
      event_id: eventData.id,
      event_name: eventData.service_name,
      participant_id: participant.id,
      company_name: participant.company_name
    };

    if (includeQRInfo.eventDetails) {
      qrData.start_date = eventData.start_date;
      qrData.end_date = eventData.end_date;
      qrData.location = 'Expo Georgia';
    }

    if (includeQRInfo.participantInfo) {
      qrData.booth_number = participant.booth_number;
      qrData.booth_size = participant.booth_size;
      const statusMap = {
        'რეგისტრირებული': 'registered',
        'დაყოველებული': 'approved', 
        'მოლოდინში': 'pending',
        'გაუქმებული': 'cancelled'
      };
      qrData.registration_status = statusMap[participant.registration_status] || participant.registration_status || 'registered';
    }

    if (includeQRInfo.boothLocation) {
      qrData.booth_location = `Hall A, Booth ${participant.booth_number}`;
    }

    if (includeQRInfo.contactInfo) {
      qrData.contact_email = 'info@expogeorgia.ge';
      qrData.contact_phone = '+995 322 341 100';
    }

    if (includeQRInfo.customMessage) {
      qrData.custom_message = includeQRInfo.customMessage;
    }

    return JSON.stringify(qrData, null, 0);
  };

  const handleParticipantToggle = (participantId) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const selectAllParticipants = () => {
    setSelectedParticipants(participants.map(p => p.id));
  };

  const deselectAllParticipants = () => {
    setSelectedParticipants([]);
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const selectedParticipantData = participants.filter(p =>
        selectedParticipants.includes(p.id)
      );

      if (selectedParticipantData.length === 0) {
        showNotification('მონიშნეთ მინიმუმ ერთი მონაწილე', 'error');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const invitationHeight = 45;
      const invitationsPerPage = Math.floor((pageHeight - 2 * margin) / invitationHeight);

      let currentY = margin;

      for (let i = 0; i < selectedParticipantData.length; i++) {
        const participant = selectedParticipantData[i];

        if (i > 0 && i % invitationsPerPage === 0) {
          pdf.addPage();
          currentY = margin;
        }

        const qrData = generateQRData(participant);
        const cardWidth = pageWidth - 2 * margin;
        const cardHeight = invitationHeight - 3;

        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');

        pdf.setDrawColor(67, 123, 208);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'S');

        pdf.setFillColor(67, 123, 208);
        pdf.roundedRect(margin + 2, currentY + 2, 25, cardHeight - 4, 2, 2, 'F');
        
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EXPO', margin + 14, currentY + 12, { align: 'center' });
        pdf.text('GEORGIA', margin + 14, currentY + 17, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setTextColor(45, 45, 45);
        pdf.setFont('helvetica', 'bold');
        const maxCompanyNameWidth = cardWidth - 70;
        const companyNameLines = pdf.splitTextToSize(participant.company_name || 'Company Name', maxCompanyNameWidth);
        if (companyNameLines.length > 0) {
          pdf.text(companyNameLines[0], margin + 30, currentY + 12);
        }

        pdf.setFontSize(9);
        pdf.setTextColor(67, 123, 208);
        pdf.setFont('helvetica', 'normal');
        pdf.text(eventData.service_name, margin + 30, currentY + 18);

        if (participant.booth_number) {
          pdf.setFillColor(240, 240, 240);
          pdf.roundedRect(margin + 30, currentY + 24, 30, 10, 1, 1, 'F');
          
          pdf.setFontSize(14);
          pdf.setTextColor(67, 123, 208);
          pdf.setFont('helvetica', 'bold');
          pdf.text('BOOTH #' + participant.booth_number, margin + 32, currentY + 30);
        }

        const qrSize = 30;
        const qrX = pageWidth - margin - qrSize - 5;
        const qrY = currentY + 6;

        drawQRCodeToPDF(pdf, qrData, qrX, qrY, qrSize);

        pdf.setFontSize(6);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Scan for details', qrX + 15, qrY + qrSize + 4, { align: 'center' });

        currentY += invitationHeight;
      }

      const filename = `მოსაწვევები_${eventData.service_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      showNotification(`${selectedParticipantData.length} მოსაწვევი წარმატებით შეიქმნა A4 ფორმატში`, 'success');
    } catch (error) {
      console.error('PDF-ის გენერაციის შეცდომა:', error);
      showNotification('PDF-ის შექმნისას მოხდა შეცდომა', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const selectedParticipantData = participants.filter(p =>
    selectedParticipants.includes(p.id)
  );

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '80vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
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
          gap: 2,
          p: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <QrCode sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
            QR კოდებით მოსაწვევების გენერაცია
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ 
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.2)',
              transform: 'scale(1.1)'
            }
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* მონაწილეების არჩევა */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 3
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business sx={{ color: '#667eea' }} />
                  მონაწილეების არჩევა
                </Typography>
                <Chip
                  label={`${selectedParticipants.length}/${participants.length}`}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  onClick={selectAllParticipants}
                  size="small"
                  variant="outlined"
                  startIcon={<SelectAll />}
                  sx={{
                    borderColor: '#4299e1',
                    color: '#4299e1',
                    '&:hover': {
                      borderColor: '#3182ce',
                      backgroundColor: 'rgba(66, 153, 225, 0.04)'
                    }
                  }}
                >
                  ყველას არჩევა
                </Button>
                <Button
                  onClick={deselectAllParticipants}
                  size="small"
                  variant="outlined"
                  startIcon={<DeselectAll />}
                  sx={{
                    borderColor: '#a0aec0',
                    color: '#4a5568',
                    '&:hover': {
                      borderColor: '#718096',
                      backgroundColor: 'rgba(160, 174, 192, 0.04)'
                    }
                  }}
                >
                  ყველას გაუქმება
                </Button>
              </Box>

              <Box
                sx={{
                  maxHeight: 300,
                  overflow: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  backgroundColor: 'white',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f5f9',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#cbd5e0',
                    borderRadius: '3px',
                  },
                }}
              >
                <FormGroup sx={{ p: 2 }}>
                  {participants.map(participant => (
                    <FormControlLabel
                      key={participant.id}
                      control={
                        <Checkbox
                          checked={selectedParticipants.includes(participant.id)}
                          onChange={() => handleParticipantToggle(participant.id)}
                          sx={{
                            color: '#667eea',
                            '&.Mui-checked': {
                              color: '#667eea',
                            }
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {participant.company_name} - Booth #{participant.booth_number}
                        </Typography>
                      }
                      sx={{
                        mb: 0.5,
                        '&:hover': {
                          backgroundColor: 'rgba(102, 126, 234, 0.04)',
                          borderRadius: 1
                        }
                      }}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Paper>
          </Grid>

          {/* QR კოდის პარამეტრები */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 3
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Info sx={{ color: '#667eea' }} />
                QR კოდში ჩასაწერი ინფორმაცია
              </Typography>

              <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeQRInfo.eventDetails}
                      onChange={(e) => setIncludeQRInfo({...includeQRInfo, eventDetails: e.target.checked})}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        }
                      }}
                    />
                  }
                  label="ივენთის დეტალები"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeQRInfo.participantInfo}
                      onChange={(e) => setIncludeQRInfo({...includeQRInfo, participantInfo: e.target.checked})}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        }
                      }}
                    />
                  }
                  label="მონაწილის ინფორმაცია"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeQRInfo.boothLocation}
                      onChange={(e) => setIncludeQRInfo({...includeQRInfo, boothLocation: e.target.checked})}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        }
                      }}
                    />
                  }
                  label="სტენდის ადგილმდებარეობა"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeQRInfo.contactInfo}
                      onChange={(e) => setIncludeQRInfo({...includeQRInfo, contactInfo: e.target.checked})}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        }
                      }}
                    />
                  }
                  label="საკონტაქტო ინფორმაცია"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeQRInfo.useURL}
                      onChange={(e) => setIncludeQRInfo({...includeQRInfo, useURL: e.target.checked})}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        }
                      }}
                    />
                  }
                  label="URL ფორმატის გამოყენება"
                />
              </FormGroup>

              <TextField
                fullWidth
                label="დამატებითი შეტყობინება"
                multiline
                rows={3}
                value={includeQRInfo.customMessage}
                onChange={(e) => setIncludeQRInfo({...includeQRInfo, customMessage: e.target.value})}
                placeholder="დამატებითი შეტყობინება QR კოდისთვის..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    }
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: '#667eea',
                  }
                }}
              />
            </Paper>
          </Grid>

          {/* წინასწარი ნახვა */}
          <Grid item xs={12}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: 3
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Event sx={{ color: '#667eea' }} />
                წინასწარი ნახვა
              </Typography>

              <Grid container spacing={2}>
                {selectedParticipantData.slice(0, 3).map((participant, index) => (
                  <Grid item xs={12} md={4} key={participant.id}>
                    <Card
                      sx={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '2px solid #667eea',
                        borderRadius: 2,
                        overflow: 'visible',
                        position: 'relative'
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" sx={{ color: '#667eea', fontWeight: 600, fontSize: '0.9rem' }}>
                            EXPO GEORGIA
                          </Typography>
                        </Box>

                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5, fontSize: '0.8rem' }}>
                          {eventData.service_name}
                        </Typography>

                        <Typography variant="body2" sx={{ color: '#4a5568', mb: 1, fontSize: '0.7rem' }}>
                          {formatDate(eventData.start_date)} - {formatDate(eventData.end_date)}
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5, fontSize: '0.8rem' }}>
                          {participant.company_name}
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#718096' }}>
                              <strong>სტენდი:</strong> #{participant.booth_number}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#718096' }}>
                              <strong>ზომა:</strong> {participant.booth_size} მ²
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <QRCode
                              value={generateQRData(participant)}
                              size={60}
                              level="M"
                              includeMargin={true}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#a0aec0' }}>
                              სკანირეთ
                            </Typography>
                          </Box>
                        </Box>

                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#a0aec0' }}>
                          წერეთლის გამზ. №118, თბილისი | +995 322 341 100
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {selectedParticipantData.length > 3 && (
                <Alert
                  severity="info"
                  sx={{
                    mt: 2,
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    borderColor: '#667eea',
                    '& .MuiAlert-icon': {
                      color: '#667eea'
                    }
                  }}
                >
                  და კიდევ {selectedParticipantData.length - 3} მოსაწვევი გენერირდება...
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: '#a0aec0',
            color: '#4a5568',
            '&:hover': {
              borderColor: '#718096',
              backgroundColor: 'rgba(160, 174, 192, 0.04)'
            }
          }}
        >
          გაუქმება
        </Button>
        <Button
          onClick={generatePDF}
          disabled={isGenerating || selectedParticipants.length === 0}
          variant="contained"
          startIcon={
            isGenerating ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />
          }
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
            },
            '&:disabled': {
              background: '#cbd5e0',
              color: '#a0aec0'
            }
          }}
        >
          {isGenerating ? 'მუშაობს...' : `${selectedParticipants.length} მოსაწვევის გენერაცია`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvitationGenerator;
