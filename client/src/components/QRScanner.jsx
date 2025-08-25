import React, { useState, useEffect, useRef } from 'react';
import './QRScanner.css';

const QRScanner = ({ eventId, showNotification, onParticipantCheckedIn }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [checkedInParticipants, setCheckedInParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [events, setEvents] = useState([]);
  const [scanResult, setScanResult] = useState('');
  const [manualCheckin, setManualCheckin] = useState(false);
  const [qrCodes, setQrCodes] = useState({}); // State to store QR codes
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchEvents();
    if (selectedEventId) {
      fetchParticipants();
      fetchCheckedInParticipants();
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (participants.length > 0) {
      loadQRCodes();
    }
  }, [participants]); // Load QR codes when participants list updates


  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      showNotification('ივენთების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/participants/event/${selectedEventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      }
    } catch (error) {
      showNotification('მონაწილეების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const fetchCheckedInParticipants = async () => {
    if (!selectedEventId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/checkin/event/${selectedEventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCheckedInParticipants(data);
      }
    } catch (error) {
      showNotification('Check-in მონაცემების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const loadQRCodes = async () => {
    const codes = {};
    for (const participant of participants) {
      codes[participant.id] = await generateQRCode(participant.id);
    }
    setQrCodes(codes);
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        // Start QR detection simulation (in real implementation, use a QR library like jsQR)
        setTimeout(() => {
          simulateQRDetection();
        }, 2000);
      }
    } catch (error) {
      showNotification('კამერის გაშვების შეცდომა', 'error');
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Simulate QR code detection for demo purposes
  const simulateQRDetection = () => {
    const participantIds = participants.map(p => p.id);
    if (participantIds.length > 0) {
      const randomId = participantIds[Math.floor(Math.random() * participantIds.length)];
      setScanResult(randomId.toString());
      handleCheckin(randomId);
    }
  };

  const handleCheckin = async (participantId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participant_id: participantId,
          event_id: selectedEventId,
          checkin_time: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        fetchCheckedInParticipants();
        if (onParticipantCheckedIn) {
          onParticipantCheckedIn(data.participant);
        }
        stopScanning();
      } else {
        const error = await response.json();
        showNotification(error.message, 'error');
      }
    } catch (error) {
      showNotification('Check-in შეცდომა', 'error');
    }
  };

  const handleManualCheckin = async (participantId) => {
    await handleCheckin(participantId);
  };

  const generateQRCode = (participantId) => {
    // Simple QR code simulation - in real implementation use qrcode library
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white"/>
        <text x="50" y="50" text-anchor="middle" dy=".35em" font-size="12">
          QR-${participantId}
        </text>
      </svg>
    `)}`;
  };

  const handlePrintQRCodes = () => {
    const printWindow = window.open('', '_blank');
    let content = `
      <html>
        <head>
          <title>QR Codes</title>
          <style>
            body { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
            .qr-item { text-align: center; border: 1px solid #ccc; padding: 10px; border-radius: 5px; }
            .qr-item img { max-width: 100%; height: auto; margin-bottom: 10px; }
          </style>
        </head>
        <body>
    `;

    // Filter participants that have not checked in yet
    const notCheckedIn = participants.filter(
      participant => !checkedInParticipants.some(checked => checked.participant_id === participant.id)
    );

    notCheckedIn.forEach(participant => {
      const qrCodeUrl = qrCodes[participant.id];
      if (qrCodeUrl) {
        content += `
          <div class="qr-item">
            <div>${participant.company_name || 'N/A'}</div>
            <div>ბუთი: ${participant.booth_number || 'N/A'}</div>
            <img src="${qrCodeUrl}" alt="QR Code for ${participant.company_name}" />
          </div>
        `;
      }
    });

    content += `
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };


  const filteredParticipants = participants.filter(participant =>
    participant.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.booth_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notCheckedInParticipants = filteredParticipants.filter(
    participant => !checkedInParticipants.some(checked => checked.participant_id === participant.id)
  );

  const simulateQRScan = () => {
    // This is a placeholder, in a real app this would trigger the QR scanner
    alert("QR Scan simulation triggered. In a real app, this would open the camera.");
  };


  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h3>მობაილური Check-in სისტემა</h3>

        <div className="event-selector">
          <label>ივენთი:</label>
          <select 
            value={selectedEventId || ''} 
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">აირჩიეთ ივენთი</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.service_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedEventId && (
        <div className="scanner-content">
          <div className="scanner-stats">
            <div className="stat-card">
              <h4>სულ მონაწილეები</h4>
              <span>{participants.length}</span>
            </div>
            <div className="stat-card checked-in">
              <h4>Check-in გავლილი</h4>
              <span>{checkedInParticipants.length}</span>
            </div>
            <div className="stat-card pending">
              <h4>მომლოდინე</h4>
              <span>{participants.length - checkedInParticipants.length}</span>
            </div>
          </div>

          <div className="scanner-actions">
            {!isScanning ? (
              <button 
                onClick={startScanning} 
                className="start-scanning-btn"
                disabled={!selectedEventId}
              >
                📷 სკანირების დაწყება
              </button>
            ) : (
              <button 
                onClick={stopScanning} 
                className="stop-scanning-btn"
              >
                ⏹️ სკანირების შეწყვეტა
              </button>
            )}

            <button 
              onClick={() => setManualCheckin(!manualCheckin)}
              className={`manual-checkin-btn ${manualCheckin ? 'active' : ''}`}
              disabled={!selectedEventId}
            >
              ✋ ხელით Check-in
            </button>

            <button 
              onClick={handlePrintQRCodes}
              className="manual-checkin-btn"
              disabled={!selectedEventId || notCheckedInParticipants.length === 0}
            >
              🖨️ QR კოდების ბეჭდვა
            </button>

            <button 
              onClick={simulateQRScan} 
              className="manual-checkin-btn"
              disabled={!selectedEventId}
            >
              🎲 სიმულაცია
            </button>
          </div>

          {isScanning && (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-video"
              />
              <div className="scanner-overlay">
                <div className="scanner-frame"></div>
                <p>QR კოდი მიაქციეთ ჩარჩოში</p>
              </div>
            </div>
          )}

          {scanResult && (
            <div className="scan-result">
              <p>QR კოდი წაიკითხა: {scanResult}</p>
            </div>
          )}

          <div className="search-container">
            <input
              type="text"
              placeholder="ძიება კომპანიის ან ბუთის ნომრით..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {manualCheckin && (
            <div className="manual-checkin-section">
              <h4>ხელით Check-in ({notCheckedInParticipants.length} მომლოდინე)</h4>
              <div className="participants-grid">
                {notCheckedInParticipants.map(participant => (
                  <div key={participant.id} className="participant-card">
                    <div className="participant-info">
                      <strong>{participant.company_name}</strong>
                      <span>ბუთი: {participant.booth_number || 'მითითებული არ არის'}</span>
                      <span>ზომა: {participant.booth_size}კვმ</span>
                    </div>
                    <div className="participant-actions">
                      <img 
                        src={qrCodes[participant.id] || generateQRCode(participant.id)} 
                        alt="QR Code" 
                        className="qr-preview"
                      />
                      <button
                        onClick={() => handleManualCheckin(participant.id)}
                        className="checkin-btn"
                      >
                        Check-in
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checkedInParticipants.length > 0 && (
            <div className="checked-in-section">
              <h4>Check-in გავლილი მონაწილეები ({checkedInParticipants.length})</h4>
              <div className="checked-in-list">
                {checkedInParticipants.map(checkedIn => {
                  const participant = participants.find(p => p.id === checkedIn.participant_id);
                  return (
                    <div key={checkedIn.id} className="checked-in-item">
                      <div className="participant-info">
                        <strong>{participant?.company_name}</strong>
                        <span>ბუთი: {participant?.booth_number}</span>
                      </div>
                      <div className="checkin-time">
                        {new Date(checkedIn.checkin_time).toLocaleString('ka-GE')}
                      </div>
                      <div className="checkin-status">✅</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;