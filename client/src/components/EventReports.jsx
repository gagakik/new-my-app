
import React, { useState, useEffect } from 'react';
import './EventReports.css';

const EventReports = ({ onClose, showNotification, userRole }) => {
  const [reportType, setReportType] = useState('participants');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

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
      console.error('ივენთების მიღების შეცდომა:', error);
    }
  };

  const generateReport = async () => {
    if (!selectedEvent && reportType !== 'summary') {
      showNotification('გთხოვთ აირჩიოთ ივენთი', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        type: reportType,
        eventId: selectedEvent,
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      const response = await fetch(`/api/reports/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        showNotification('რეპორტი წარმატებით შეიქმნა', 'success');
      } else {
        showNotification('რეპორტის შექმნა ვერ მოხერხდა', 'error');
      }
    } catch (error) {
      console.error('რეპორტის შექმნის შეცდომა:', error);
      showNotification('შეცდომა რეპორტის შექმნისას', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    if (!reportData) return;

    const fileName = `report_${reportType}_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(reportData, fileName);
    } else if (format === 'pdf') {
      exportToPDF(reportData, fileName);
    }
  };

  const exportToCSV = (data, fileName) => {
    if (!data.participants) return;
    
    const headers = ['კომპანია', 'ქვეყანა', 'სტატუსი', 'გადახდა', 'თანხა', 'რეგისტრაცია'];
    const csvContent = [
      headers.join(','),
      ...data.participants.map(p => [
        p.company_name,
        p.country,
        p.registration_status,
        p.payment_status,
        p.payment_amount || 0,
        new Date(p.registration_date).toLocaleDateString('ka-GE')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    link.click();
  };

  const exportToPDF = (data, fileName) => {
    // PDF ექსპორტი - მოგვიანებით დავამატებთ jsPDF ბიბლიოთეკით
    showNotification('PDF ექსპორტი მომზადების ეტაპზეა', 'info');
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'participants':
        return (
          <div className="report-content">
            <div className="report-stats">
              <div className="stat-card">
                <h4>სულ მონაწილეები</h4>
                <span className="stat-number">{reportData.totalParticipants}</span>
              </div>
              <div className="stat-card">
                <h4>დადასტურებული</h4>
                <span className="stat-number confirmed">{reportData.confirmedParticipants}</span>
              </div>
              <div className="stat-card">
                <h4>გადახდილი</h4>
                <span className="stat-number paid">{reportData.paidParticipants}</span>
              </div>
              <div className="stat-card">
                <h4>ჯამური შემოსავალი</h4>
                <span className="stat-number revenue">{reportData.totalRevenue}₾</span>
              </div>
            </div>

            {reportData.participants && (
              <div className="participants-summary">
                <h4>მონაწილეების დეტალები</h4>
                <div className="summary-table">
                  <div className="table-header">
                    <div>კომპანია</div>
                    <div>ქვეყანა</div>
                    <div>სტატუსი</div>
                    <div>გადახდა</div>
                    <div>თანხა</div>
                  </div>
                  {reportData.participants.map((participant, index) => (
                    <div key={index} className="table-row">
                      <div>{participant.company_name}</div>
                      <div>{participant.country}</div>
                      <div>
                        <span className={`status-badge ${participant.registration_status.toLowerCase()}`}>
                          {participant.registration_status}
                        </span>
                      </div>
                      <div>
                        <span className={`payment-badge ${participant.payment_status.toLowerCase()}`}>
                          {participant.payment_status}
                        </span>
                      </div>
                      <div>{participant.payment_amount}₾</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'financial':
        return (
          <div className="report-content">
            <div className="financial-stats">
              <div className="stat-card">
                <h4>მოსალოდნელი შემოსავალი</h4>
                <span className="stat-number">{reportData.expectedRevenue}₾</span>
              </div>
              <div className="stat-card">
                <h4>ფაქტიური შემოსავალი</h4>
                <span className="stat-number paid">{reportData.actualRevenue}₾</span>
              </div>
              <div className="stat-card">
                <h4>ვადაგადაცილებული</h4>
                <span className="stat-number overdue">{reportData.overdueAmount}₾</span>
              </div>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="report-content">
            <div className="summary-stats">
              <div className="stat-card">
                <h4>სულ ივენთები</h4>
                <span className="stat-number">{reportData.totalEvents}</span>
              </div>
              <div className="stat-card">
                <h4>აქტიური ივენთები</h4>
                <span className="stat-number active">{reportData.activeEvents}</span>
              </div>
              <div className="stat-card">
                <h4>სულ მონაწილეები</h4>
                <span className="stat-number">{reportData.totalParticipants}</span>
              </div>
              <div className="stat-card">
                <h4>ჯამური შემოსავალი</h4>
                <span className="stat-number revenue">{reportData.totalRevenue}₾</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="event-reports-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>ივენთების რეპორტები</h3>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="report-controls">
            <div className="control-group">
              <label>რეპორტის ტიპი</label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="participants">მონაწილეების ანალიზი</option>
                <option value="financial">ფინანსური ანალიზი</option>
                <option value="summary">ზოგადი მიმოხილვა</option>
              </select>
            </div>

            {reportType !== 'summary' && (
              <div className="control-group">
                <label>ივენთი</label>
                <select 
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                >
                  <option value="">აირჩიეთ ივენთი</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.service_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="control-group">
              <label>თარიღების ინტერვალი</label>
              <div className="date-range">
                <input 
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
                <span>-</span>
                <input 
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>

            <div className="control-actions">
              <button 
                className="generate-btn"
                onClick={generateReport}
                disabled={loading}
              >
                {loading ? 'იქმნება...' : 'რეპორტის შექმნა'}
              </button>
              
              {reportData && (
                <div className="export-actions">
                  <button 
                    className="export-btn csv"
                    onClick={() => exportReport('csv')}
                  >
                    CSV ექსპორტი
                  </button>
                  <button 
                    className="export-btn pdf"
                    onClick={() => exportReport('pdf')}
                  >
                    PDF ექსპორტი
                  </button>
                </div>
              )}
            </div>
          </div>

          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

export default EventReports;
