
import React, { useState, useEffect } from 'react';
import './Statistics.css';

const Statistics = ({ showNotification, userRole }) => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('ავტორიზაცია საჭიროა');
        }

        const response = await fetch('/api/statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'სტატისტიკის მიღება ვერ მოხერხდა.');
        }
        
        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err.message);
        showNotification(`შეცდომა სტატისტიკის ჩატვირთვისას: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [showNotification]);

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  if (error) {
    return <div className="error">შეცდომა: {error}</div>;
  }

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2) + ' ₾';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="statistics-container">
      <h2>სტატისტიკა</h2>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="stat-card">
          <div className="stat-number">{statistics.overview.total_exhibitions}</div>
          <div className="stat-label">სულ გამოფენები</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{statistics.overview.total_companies}</div>
          <div className="stat-label">სულ კომპანიები</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{statistics.overview.total_bookings}</div>
          <div className="stat-label">სულ ჯავშნები</div>
        </div>
        </div>

      {/* Monthly Bookings Chart */}
      <div className="chart-section">
        <h3>ყოველთვიური ჯავშნები</h3>
        <div className="chart-container">
          <table className="chart-table">
            <thead>
              <tr>
                <th>თვე</th>
                <th>ჯავშნების რაოდენობა</th>
              </tr>
            </thead>
            <tbody>
              {statistics.monthly_bookings.map((month, index) => (
                <tr key={index}>
                  <td>{formatDate(month.month)}</td>
                  <td>{month.booking_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Services */}
      <div className="chart-section">
        <h3>პოპულარული სერვისები</h3>
        <div className="services-ranking">
          {statistics.top_services.map((service, index) => (
            <div key={index} className="service-rank-item">
              <div className="rank-number">{index + 1}</div>
              <div className="service-info">
                <div className="service-name">{service.service_name}</div>
                <div className="service-stats">
                  {service.booking_count} ჯავშანი • {formatCurrency(service.total_revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;
