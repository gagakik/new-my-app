import React, { useState, useEffect } from 'react';
import './UserStatistics.css';

const UserStatistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserStatistics();
  }, []);

  const fetchUserStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/statistics/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('სტატისტიკის შეცდომა:', error);
      setError('სტატისტიკის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>იტვირთება...</div>;
  if (error) return <div>შეცდომა: {error}</div>;

  return (
    <div className="user-statistics">
      <h2>მომხმარებლების სტატისტიკა</h2>
      <div className="statistics-summary">
        <h3>მიმოხილვა</h3>
        <p>სულ მომხმარებელი: {statistics.length}</p>
        <p>სულ შექმნილი კომპანია: {statistics.reduce((sum, stat) => sum + parseInt(stat.companies_created || 0), 0)}</p>
        <p>სულ შექმნილი აღჭურვილობა: {statistics.reduce((sum, stat) => sum + parseInt(stat.equipment_created || 0), 0)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>მომხმარებელი</th>
            <th>როლი</th>
            <th>შექმნილი კომპანიები</th>
            <th>შექმნილი აღჭურვილობა</th>
            <th>შექმნილი სივრცეები</th>
            <th>შექმნილი გამოფენები</th>
          </tr>
        </thead>
        <tbody>
          {statistics.map(stat => (
            <tr key={stat.id}>
              <td>{stat.username}</td>
              <td>{stat.role}</td>
              <td><strong>{stat.companies_created || 0}</strong></td>
              <td>{stat.equipment_created || 0}</td>
              <td>{stat.spaces_created || 0}</td>
              <td>{stat.exhibitions_created || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserStatistics;