
import React, { useState, useEffect } from 'react';
import './CompletionReports.css';

const CompletionReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/event-completion-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        console.error('Error fetching reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/event-completion-reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE');
  };

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  return (
    <div className="completion-reports">
      <div className="reports-header">
        <h2>დასრულებული ივენთების ანგარიშები</h2>
      </div>

      {selectedReport ? (
        <div className="report-details">
          <div className="report-header">
            <button 
              className="back-button"
              onClick={() => setSelectedReport(null)}
            >
              ← უკან
            </button>
            <h3>{selectedReport.event_name}</h3>
            <span className="completion-date">
              დასრულდა: {formatDate(selectedReport.completion_date)}
            </span>
          </div>

          <div className="report-summary">
            <div className="summary-grid">
              <div className="summary-card">
                <h4>მონაწილეები</h4>
                <span className="summary-value">{selectedReport.total_participants}</span>
              </div>
              <div className="summary-card">
                <h4>სტენდები</h4>
                <span className="summary-value">{selectedReport.total_booths}</span>
              </div>
              <div className="summary-card">
                <h4>მთლიანი შემოსავალი</h4>
                <span className="summary-value">{selectedReport.total_revenue?.toFixed(2)} ₾</span>
              </div>
              <div className="summary-card">
                <h4>აღჭურვილობის შემოსავალი</h4>
                <span className="summary-value">{selectedReport.total_equipment_revenue?.toFixed(2)} ₾</span>
              </div>
            </div>
          </div>

          {selectedReport.notes && (
            <div className="report-notes">
              <h4>შენიშვნები</h4>
              <p>{selectedReport.notes}</p>
            </div>
          )}

          <div className="archived-participants">
            <h4>არქივირებული მონაწილეები</h4>
            <div className="participants-table">
              <table>
                <thead>
                  <tr>
                    <th>კომპანია</th>
                    <th>სტენდი</th>
                    <th>ზომა (მ²)</th>
                    <th>გადახდის სტატუსი</th>
                    <th>თანხა</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.archived_participants?.map((participant) => (
                    <tr key={participant.id}>
                      <td>{participant.company_name}</td>
                      <td>{participant.booth_number || '-'}</td>
                      <td>{participant.booth_size || '-'}</td>
                      <td>
                        <span className={`status ${participant.payment_status?.replace(/\s+/g, '-').toLowerCase()}`}>
                          {participant.payment_status}
                        </span>
                      </td>
                      <td>{participant.payment_amount?.toFixed(2)} ₾</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="reports-list">
          {reports.length === 0 ? (
            <div className="no-reports">
              <p>დასრულებული ივენთები არ არის</p>
            </div>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className="report-card"
                  onClick={() => fetchReportDetails(report.id)}
                >
                  <div className="report-card-header">
                    <h3>{report.event_name}</h3>
                    <span className="completion-date">
                      {formatDate(report.completion_date)}
                    </span>
                  </div>
                  <div className="report-card-stats">
                    <div className="stat">
                      <span className="stat-label">მონაწილეები:</span>
                      <span className="stat-value">{report.total_participants}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">შემოსავალი:</span>
                      <span className="stat-value">{report.total_revenue?.toFixed(2)} ₾</span>
                    </div>
                  </div>
                  <div className="report-card-footer">
                    <span className="created-by">შექმნა: {report.created_by_username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompletionReports;
