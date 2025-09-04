import React, { useState, useEffect, useRef } from 'react';
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
    useURL: false // ახალი ოფცია
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const invitationRefs = useRef([]); // Keep refs if needed for other previews, but PDF generation is direct now

  useEffect(() => {
    setSelectedParticipants(participants.map(p => p.id));
  }, [participants]);

  const generateQRData = (participant) => {
    // თუ URL რეჟიმია, გავაგენერიროთ მარტივი URL
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
      // Convert status to English to avoid encoding issues
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

    // Ensure proper UTF-8 encoding
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

  // This function is no longer directly used for PDF generation but might be useful for other previews
  const generateSingleInvitation = async (participant, index) => {
    const element = invitationRefs.current[index];
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: 800,
        height: 600
      });
      return canvas;
    } catch (error) {
      console.error('მოსაწვევის გენერაციის შეცდომა:', error);
      return null;
    }
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

      // Register BPG Nino font for Georgian characters
      // You would need to have the BPG Nino font file (e.g., BPG_Nino_Mtavruli.ttf) available
      // and potentially convert it to a format jsPDF can use if it's not already embedded.
      // For simplicity, assuming 'BPGNino' is registered or available globally.
      // In a real app, you might load it like this:
      // pdf.addFileToVFS('BPGNino.ttf', fontData);
      // pdf.addFont('BPGNino.ttf', 'BPGNino', 'normal');

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const invitationHeight = 45; // More compact height
      const invitationsPerPage = Math.floor((pageHeight - 2 * margin) / invitationHeight);

      let currentY = margin;

      for (let i = 0; i < selectedParticipantData.length; i++) {
        const participant = selectedParticipantData[i];

        // Check if we need a new page
        if (i > 0 && i % invitationsPerPage === 0) {
          pdf.addPage();
          currentY = margin;
        }

        // Generate QR data
        const qrData = generateQRData(participant);

        const cardWidth = pageWidth - 2 * margin;
        const cardHeight = invitationHeight - 3;

        // Card background
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');

        // Border
        pdf.setDrawColor(67, 123, 208);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'S');

        // Company Logo Area (left side)
        pdf.setFillColor(67, 123, 208);
        pdf.roundedRect(margin + 2, currentY + 2, 25, cardHeight - 4, 2, 2, 'F');
        
        // EXPO GEORGIA logo text
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EXPO', margin + 14, currentY + 12, { align: 'center' });
        pdf.text('GEORGIA', margin + 14, currentY + 17, { align: 'center' });

        // Company name - large and prominent
        pdf.setFontSize(14);
        pdf.setTextColor(45, 45, 45);
        pdf.setFont('helvetica', 'bold');
        const maxCompanyNameWidth = cardWidth - 70; // Leave space for logo and QR
        const companyNameLines = pdf.splitTextToSize(participant.company_name || 'Company Name', maxCompanyNameWidth);
        if (companyNameLines.length > 0) {
          pdf.text(companyNameLines[0], margin + 30, currentY + 12);
        }

        // Event name
        pdf.setFontSize(9);
        pdf.setTextColor(67, 123, 208);
        pdf.setFont('helvetica', 'normal');
        pdf.text(eventData.service_name, margin + 30, currentY + 18);

        // Booth number - very prominent
        if (participant.booth_number) {
          pdf.setFillColor(240, 240, 240);
          pdf.roundedRect(margin + 30, currentY + 24, 30, 10, 1, 1, 'F');
          
          pdf.setFontSize(14);
          pdf.setTextColor(67, 123, 208);
          pdf.setFont('helvetica', 'bold');
          pdf.text('BOOTH #' + participant.booth_number, margin + 32, currentY + 30);
        }

        // QR Code - larger and more prominent
        const qrSize = 30;
        const qrX = pageWidth - margin - qrSize - 5;
        const qrY = currentY + 6;

        drawQRCodeToPDF(pdf, qrData, qrX, qrY, qrSize);

        // QR Code label
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
    <div className="invitation-generator-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>QR კოდებით მოსაწვევების გენერაცია</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* კონტროლები */}
          <div className="controls-section">
            <div className="participants-selection">
              <h4>მონაწილეების არჩევა ({selectedParticipants.length}/{participants.length})</h4>
              <div className="selection-controls">
                <button onClick={selectAllParticipants} className="select-btn">
                  ყველას არჩევა
                </button>
                <button onClick={deselectAllParticipants} className="deselect-btn">
                  ყველას გაუქმება
                </button>
              </div>

              <div className="participants-list">
                {participants.map(participant => (
                  <label key={participant.id} className="participant-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(participant.id)}
                      onChange={() => handleParticipantToggle(participant.id)}
                    />
                    <span>{participant.company_name} - Booth #{participant.booth_number}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* QR კოდის პარამეტრები */}
            <div className="qr-options">
              <h4>QR კოდში ჩასაწერი ინფორმაცია</h4>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQRInfo.eventDetails}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, eventDetails: e.target.checked})}
                />
                <span>ივენთის დეტალები</span>
              </label>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQRInfo.participantInfo}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, participantInfo: e.target.checked})}
                />
                <span>მონაწილის ინფორმაცია</span>
              </label>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQRInfo.boothLocation}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, boothLocation: e.target.checked})}
                />
                <span>სტენდის ადგილმდებარეობა</span>
              </label>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQRInfo.contactInfo}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, contactInfo: e.target.checked})}
                />
                <span>საკონტაქტო ინფორმაცია</span>
              </label>

              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={includeQRInfo.useURL}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, useURL: e.target.checked})}
                />
                <span>URL ფორმატის გამოყენება (ყველა ტელეფონზე იმუშავებს)</span>
              </label>

              <div className="custom-message">
                <label>დამატებითი შეტყობინება:</label>
                <textarea
                  value={includeQRInfo.customMessage}
                  onChange={(e) => setIncludeQRInfo({...includeQRInfo, customMessage: e.target.value})}
                  placeholder="დამატებითი შეტყობინება QR კოდისთვის..."
                  rows="2"
                />
              </div>
            </div>

            <div className="generate-controls">
              <button
                onClick={generatePDF}
                disabled={isGenerating || selectedParticipants.length === 0}
                className="generate-btn"
              >
                {isGenerating ? 'მუშაობს...' : `${selectedParticipants.length} მოსაწვევის გენერაცია`}
              </button>
            </div>
          </div>

          {/* მოსაწვევების წინასწარი ნახვა */}
          <div className="preview-section">
            <h4>წინასწარი ნახვა</h4>
            <div className="invitations-preview">
              {selectedParticipantData.slice(0, 3).map((participant, index) => (
                <div
                  key={participant.id}
                  ref={el => invitationRefs.current[index] = el}
                  className="invitation-card"
                >
                  <div className="invitation-header">
                    <div className="logo-section">
                      <h2>EXPO GEORGIA</h2>
                      <p>Exhibition & Convention Center</p>
                    </div>
                  </div>

                  <div className="invitation-content">
                    <div className="event-info">
                      <h3>{eventData.service_name}</h3>
                      <p className="event-date">
                        {formatDate(eventData.start_date)} - {formatDate(eventData.end_date)}
                      </p>
                    </div>

                    <div className="participant-details">
                      <h4>{participant.company_name}</h4>
                      <p><strong>სტენდის ნომერი:</strong> {participant.booth_number}</p>
                      <p><strong>სტენდის ზომა:</strong> {participant.booth_size} მ²</p>
                      <p><strong>ქვეყანა:</strong> {participant.country}</p>
                    </div>

                    <div className="qr-section">
                      <QRCode
                        value={generateQRData(participant)}
                        size={120}
                        level="M"
                        includeMargin={true}
                      />
                      <p className="qr-info">სკანირეთ დეტალური ინფორმაციისთვის</p>
                    </div>
                  </div>

                  <div className="invitation-footer">
                    <p><strong>მისამართი:</strong> წერეთლის გამზ. №118, თბილისი, საქართველო</p>
                    <p><strong>ტელეფონი:</strong> +995 322 341 100 | <strong>Email:</strong> info@expogeorgia.ge</p>
                  </div>
                </div>
              ))}

              {selectedParticipantData.length > 3 && (
                <div className="more-indicator">
                  და კიდევ {selectedParticipantData.length - 3} მოსაწვევი...
                </div>
              )}
            </div>
          </div>

          {/* ფარული ელემენტები PDF გენერაციისთვის - ეს ნაწილი აღარ არის საჭირო, რადგან PDF პირდაპირ გენერირდება */}
        </div>
      </div>
    </div>
  );
};

export default InvitationGenerator;