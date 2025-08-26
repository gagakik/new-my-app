import React, { useState, useEffect } from 'react';
import './Statistics.css';

const Statistics = ({ showNotification, userRole }) => {
  const [stats, setStats] = useState({
    companies: 0,
    equipment: 0,
    spaces: 0,
    exhibitions: 0,
    users: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGeneralStatistics();
  }, []);

  const fetchGeneralStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (!token) {
        showNotification('ავტორიზაციის ტოკენი არ არის', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/statistics/general', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Statistics data:', data);
        setStats(data);
      } else {
        const errorText = await response.text();
        console.error('Statistics error response:', errorText);
        
        if (response.status === 403) {
          showNotification('წვდომა აკრძალულია. შესაძლოა ტოკენი ვადაგასული იყოს.', 'error');
        } else {
          showNotification(`სტატისტიკის ჩატვირთვა ვერ მოხერხდა (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('სტატისტიკის შეცდომა:', error);
      showNotification('სტატისტიკის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading-spinner">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <h2>ზოგადი სტატისტიკა</h2>
      <div className="stats-grid">
        <div className="stat-card companies">
          <div className="stat-icon">🏢</div>
          <h3>კომპანიები</h3>
          <div className="stat-number">{stats.companies}</div>
          <p>რეგისტრირებული კომპანიები</p>
        </div>
        <div className="stat-card equipment">
          <div className="stat-icon">⚙️</div>
          <h3>აღჭურვილობა</h3>
          <div className="stat-number">{stats.equipment}</div>
          <p>სულ აღჭურვილობის ერთეული</p>
        </div>
        <div className="stat-card spaces">
          <div className="stat-icon">🏛️</div>
          <h3>სივრცეები</h3>
          <div className="stat-number">{stats.spaces}</div>
          <p>ხელმისაწვდომი სივრცეები</p>
        </div>
        <div className="stat-card exhibitions">
          <div className="stat-icon">🎨</div>
          <h3>გამოფენები</h3>
          <div className="stat-number">{stats.exhibitions}</div>
          <p>ორგანიზებული გამოფენები</p>
        </div>
        <div className="stat-card users">
          <div className="stat-icon">👥</div>
          <h3>მომხმარებლები</h3>
          <div className="stat-number">{stats.users}</div>
          <p>რეგისტრირებული მომხმარებლები</p>
        </div>
      </div>
    </div>
  );
};

export default Statistics;