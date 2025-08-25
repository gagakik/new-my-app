
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
  const [qrCodes, setQrCodes] = useState({}); 
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

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
  }, [participants]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        if (!selectedEventId && data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showNotification('ივენთების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const fetchParticipants = async () => {
    if (!selectedEventId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${selectedEventId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setParticipants(data);
      } else {
        showNotification('მონაწილეების ჩატვირთვის შეცდომა', 'error');
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      showNotification('მონაწილეების ჩატვირთვის შეცდომა', 'error');
    } finally {
      setLoading(false);
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
      console.error('Error fetching check-ins:', error);
      showNotification('Check-in მონაცემების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const loadQRCodes = async () => {
    const codes = {};
    for (const participant of participants) {
      codes[participant.id] = generateQRCodeDataURL(participant.id);
    }
    setQrCodes(codes);
  };

  const startScanning = async () => {
    try {
      setLoading(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setScanResult('');
        
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startQRDetection();
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      showNotification('კამერის გაშვების შეცდომა. გთხოვთ დართოთ კამერის წვდომა.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScanResult('');
  };

  const startQRDetection = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    const detectQR = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        if (isScanning) {
          requestAnimationFrame(detectQR);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      try {
        // Simulate QR detection for demo
        // In a real implementation, you would use a library like jsQR here
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // For demo purposes, simulate finding a QR code every 3 seconds
        const now = Date.now();
        if (!window.lastQRScan || now - window.lastQRScan > 3000) {
          simulateQRDetection();
          window.lastQRScan = now;
        }
      } catch (error) {
        console.error('QR detection error:', error);
      }

      if (isScanning) {
        requestAnimationFrame(detectQR);
      }
    };

    detectQR();
  };

  const simulateQRDetection = () => {
    // Get participants that haven't checked in yet
    const notCheckedIn = participants.filter(
      participant => !checkedInParticipants.some(checked => checked.participant_id === participant.id)
    );
    
    if (notCheckedIn.length > 0) {
      const randomParticipant = notCheckedIn[Math.floor(Math.random() * notCheckedIn.length)];
      const qrData = `QR-${randomParticipant.id}`;
      setScanResult(qrData);
      handleQRScanResult(randomParticipant.id);
    }
  };

  const handleQRScanResult = async (participantId) => {
    // Prevent duplicate scans
    if (checkedInParticipants.some(checked => checked.participant_id === participantId)) {
      showNotification('ეს მონაწილე უკვე რეგისტრირებულია', 'warning');
      return;
    }

    await handleCheckin(participantId);
    stopScanning(); // Stop scanning after successful check-in
  };

  const handleCheckin = async (participantId) => {
    try {
      setLoading(true);
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
        showNotification(data.message || 'მონაწილე წარმატებით რეგისტრირდა!', 'success');
        
        // Refresh data
        await fetchCheckedInParticipants();
        
        if (onParticipantCheckedIn) {
          onParticipantCheckedIn(data.participant);
        }
      } else {
        const error = await response.json();
        showNotification(error.message || 'Check-in შეცდომა', 'error');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      showNotification('Check-in შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckin = async (participantId) => {
    if (window.confirm('დარწმუნებული ხართ რომ გსურთ ამ მონაწილის Check-in?')) {
      await handleCheckin(participantId);
    }
  };

  const generateQRCodeDataURL = (participantId) => {
    // Simple QR code simulation using SVG
    const qrContent = `QR-${participantId}`;
    const svgString = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white" stroke="#000" stroke-width="1"/>
        <rect x="10" y="10" width="10" height="10" fill="black"/>
        <rect x="30" y="10" width="10" height="10" fill="black"/>
        <rect x="50" y="10" width="10" height="10" fill="black"/>
        <rect x="70" y="10" width="10" height="10" fill="black"/>
        <rect x="10" y="30" width="10" height="10" fill="black"/>
        <rect x="50" y="30" width="10" height="10" fill="black"/>
        <rect x="10" y="50" width="10" height="10" fill="black"/>
        <rect x="30" y="50" width="10" height="10" fill="black"/>
        <rect x="70" y="50" width="10" height="10" fill="black"/>
        <rect x="10" y="70" width="10" height="10" fill="black"/>
        <rect x="30" y="70" width="10" height="10" fill="black"/>
        <rect x="50" y="70" width="10" height="10" fill="black"/>
        <rect x="70" y="70" width="10" height="10" fill="black"/>
        <text x="50" y="90" text-anchor="middle" font-size="8">${qrContent}</text>
      </svg>
    `;
    
    return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
  };

  const handlePrintQRCodes = () => {
    const notCheckedIn = participants.filter(
      participant => !checkedInParticipants.some(checked => checked.participant_id === participant.id)
    );

    if (notCheckedIn.length === 0) {
      showNotification('ყველა მონაწილე უკვე რეგისტრირებულია', 'info');
      return;
    }

    const printWindow = window.open('', '_blank');
    let content = `
      <html>
        <head>
          <title>QR Codes - ${events.find(e => e.id === selectedEventId)?.service_name || 'Event'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif;
              display: grid; 
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
              gap: 20px; 
              padding: 20px;
            }
            .qr-item { 
              text-align: center; 
              border: 2px solid #ccc; 
              padding: 15px; 
              border-radius: 8px; 
              break-inside: avoid;
            }
            .qr-item img { 
              width: 120px; 
              height: 120px; 
              margin-bottom: 10px; 
              border: 1px solid #ddd;
            }
            .company-name { 
              font-weight: bold; 
              margin-bottom: 5px; 
              font-size: 14px;
            }
            .booth-info { 
              color: #666; 
              font-size: 12px; 
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
    `;

    notCheckedIn.forEach(participant => {
      const qrCodeUrl = qrCodes[participant.id];
      if (qrCodeUrl) {
        content += `
          <div class="qr-item">
            <div class="company-name">${participant.company_name || 'N/A'}</div>
            <div class="booth-info">ბუთი: ${participant.booth_number || 'N/A'}</div>
            <div class="booth-info">ზომა: ${participant.booth_size || 'N/A'}კვმ</div>
            <img src="${qrCodeUrl}" alt="QR Code for ${participant.company_name}" />
            <div style="font-size: 10px; margin-top: 5px;">ID: ${participant.id}</div>
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

  return (
    <div className="qr-scanner-container">
      <div className="scanner-header">
        <h2>📱 მობაილური Check-in სისტემა</h2>

        <div className="event-selector">
          <label htmlFor="event-select">ივენთი:</label>
          <select 
            id="event-select"
            value={selectedEventId || ''} 
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading}
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
            <div className="stat-card total">
              <h4>სულ მონაწილეები</h4>
              <span className="stat-number">{participants.length}</span>
            </div>
            <div className="stat-card checked-in">
              <h4>Check-in გავლილი</h4>
              <span className="stat-number">{checkedInParticipants.length}</span>
            </div>
            <div className="stat-card pending">
              <h4>მომლოდინე</h4>
              <span className="stat-number">{participants.length - checkedInParticipants.length}</span>
            </div>
            <div className="stat-card percentage">
              <h4>პროგრესი</h4>
              <span className="stat-number">
                {participants.length > 0 ? Math.round((checkedInParticipants.length / participants.length) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="scanner-actions">
            {!isScanning ? (
              <button 
                onClick={startScanning} 
                className="start-scanning-btn"
                disabled={!selectedEventId || loading || notCheckedInParticipants.length === 0}
              >
                {loading ? '⏳ იტვირთება...' : '📷 QR სკანერის გაშვება'}
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
              disabled={!selectedEventId || loading}
            >
              {manualCheckin ? '❌ ხელით Check-in დახურვა' : '✋ ხელით Check-in'}
            </button>

            <button 
              onClick={handlePrintQRCodes}
              className="print-qr-btn"
              disabled={!selectedEventId || notCheckedInParticipants.length === 0 || loading}
            >
              🖨️ QR კოდების ბეჭდვა ({notCheckedInParticipants.length})
            </button>
          </div>

          {isScanning && (
            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="scanner-overlay">
                <div className="scanner-frame"></div>
                <p>QR კოდი მიაქციეთ ჩარჩოში</p>
                {loading && <div className="scanner-loading">იტვირთება...</div>}
              </div>
            </div>
          )}

          {scanResult && (
            <div className="scan-result">
              <p>✅ QR კოდი წაიკითხა: {scanResult}</p>
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
              <h3>✋ ხელით Check-in ({notCheckedInParticipants.length} მომლოდინე)</h3>
              
              {loading ? (
                <div className="loading-message">მონაცემები იტვირთება...</div>
              ) : notCheckedInParticipants.length === 0 ? (
                <div className="no-participants-message">
                  {participants.length === 0 ? 
                    'ამ ივენთზე მონაწილეები არ არის რეგისტრირებული' : 
                    'ყველა მონაწილე უკვე რეგისტრირებულია!'
                  }
                </div>
              ) : (
                <div className="participants-grid">
                  {notCheckedInParticipants.map(participant => (
                    <div key={participant.id} className="participant-card">
                      <div className="participant-info">
                        <strong>{participant.company_name}</strong>
                        <span>ბუთი: {participant.booth_number || 'მითითებული არ არის'}</span>
                        <span>ზომა: {participant.booth_size}კვმ</span>
                        <span>სტატუსი: {participant.registration_status}</span>
                      </div>
                      <div className="participant-actions">
                        <img 
                          src={qrCodes[participant.id] || generateQRCodeDataURL(participant.id)} 
                          alt="QR Code" 
                          className="qr-preview"
                        />
                        <button
                          onClick={() => handleManualCheckin(participant.id)}
                          className="checkin-btn"
                          disabled={loading}
                        >
                          {loading ? '⏳' : '✓ Check-in'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {checkedInParticipants.length > 0 && (
            <div className="checked-in-section">
              <h3>✅ Check-in გავლილი მონაწილეები ({checkedInParticipants.length})</h3>
              <div className="checked-in-list">
                {checkedInParticipants.map(checkedIn => {
                  const participant = participants.find(p => p.id === checkedIn.participant_id);
                  return (
                    <div key={checkedIn.id} className="checked-in-item">
                      <div className="participant-info">
                        <strong>{participant?.company_name}</strong>
                        <span>ბუთი: {participant?.booth_number}</span>
                        <span>ზომა: {participant?.booth_size}კვმ</span>
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
