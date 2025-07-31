
import React from 'react';

const Statistics = ({ showNotification, userRole }) => {
  return (
    <div className="statistics-container">
      <h2>სტატისტიკა</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>კომპანიები</h3>
          <p>მალე ჩაემატება...</p>
        </div>
        <div className="stat-card">
          <h3>ივენთები</h3>
          <p>მალე ჩაემატება...</p>
        </div>
        <div className="stat-card">
          <h3>გამოფენები</h3>
          <p>მალე ჩაემატება...</p>
        </div>
        <div className="stat-card">
          <h3>შემოსავალი</h3>
          <p>მალე ჩაემატება...</p>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
