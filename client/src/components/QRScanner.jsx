
import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import './QRScanner.css';

const QRScanner = ({ onClose, showNotification }) => {
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
          facingMode: 'environment' // უკანა კამერის გამოყენება
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
      
      // QR კოდის სკანირება jsQR ბიბლიოთეკით
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

    // განახლება ყოველ 100ms-ში
    if (isScanning) {
      requestAnimationFrame(scanForQR);
    }
  };

  const handleManualInput = (inputData) => {
    try {
      // Clean the input data from any encoding issues
      const cleanedInput = inputData.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const qrData = JSON.parse(cleanedInput);
      
      if (qrData.type === 'event_invitation') {
        // Convert status back to Georgian for display
        const statusDisplayMap = {
          'registered': 'რეგისტრირებული',
          'approved': 'დადასტურებული', 
          'pending': 'მოლოდინში',
          'cancelled': 'გაუქმებული'
        };
        
        if (qrData.registration_status && statusDisplayMap[qrData.registration_status]) {
          qrData.registration_status_display = statusDisplayMap[qrData.registration_status];
        }
        
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

  return (
    <div className="qr-scanner-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>QR კოდის სკანერი</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <button className="modal-close-body" onClick={onClose} title="დახურვა">
            ✕
          </button>
          {!scannedData ? (
            <div className="scanner-section">
              {hasCamera ? (
                <div className="camera-section">
                  <video
                    ref={videoRef}
                    className="camera-preview"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="camera-controls">
                    {!isScanning ? (
                      <button
                        onClick={startCamera}
                        className="start-scan-btn"
                      >
                        სკანირების დაწყება
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="stop-scan-btn"
                      >
                        სკანირების შეჩერება
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-camera">
                  <p>კამერა მიუწვდომელია</p>
                </div>
              )}

              <div className="manual-input">
                <h4>ან შეიყვანეთ QR კოდის მონაცემები ხელით:</h4>
                <textarea
                  placeholder="ჩასვით QR კოდის JSON მონაცემები აქ..."
                  rows="4"
                  onPaste={(e) => {
                    setTimeout(() => {
                      handleManualInput(e.target.value);
                    }, 100);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="scanned-data">
              <h4>QR კოდის ინფორმაცია</h4>
              <div className="data-display">
                <div className="data-item">
                  <strong>ივენთი:</strong> {scannedData.event_name}
                </div>
                <div className="data-item">
                  <strong>კომპანია:</strong> {scannedData.company_name}
                </div>
                {scannedData.booth_number && (
                  <div className="data-item">
                    <strong>სტენდი:</strong> #{scannedData.booth_number}
                  </div>
                )}
                {scannedData.booth_size && (
                  <div className="data-item">
                    <strong>სტენდის ზომა:</strong> {scannedData.booth_size} მ²
                  </div>
                )}
                {scannedData.start_date && (
                  <div className="data-item">
                    <strong>თარიღები:</strong> {formatDate(scannedData.start_date)} - {formatDate(scannedData.end_date)}
                  </div>
                )}
                {scannedData.booth_location && (
                  <div className="data-item">
                    <strong>ადგილმდებარეობა:</strong> {scannedData.booth_location}
                  </div>
                )}
                {(scannedData.registration_status || scannedData.registration_status_display) && (
                  <div className="data-item">
                    <strong>სტატუსი:</strong> {scannedData.registration_status_display || scannedData.registration_status}
                  </div>
                )}
                {scannedData.custom_message && (
                  <div className="data-item">
                    <strong>შეტყობინება:</strong> {scannedData.custom_message}
                  </div>
                )}
              </div>
              
              <div className="scan-actions">
                <button
                  onClick={() => setScannedData(null)}
                  className="scan-again-btn"
                >
                  კიდევ სკანირება
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
