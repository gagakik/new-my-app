
import React, { useState, useEffect } from 'react';
import './UserProfile.css';
import api from '../services/api';

const UserProfile = ({ showNotification, userRole, userName, userId }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUserInfo(response.data);
    } catch (error) {
      console.error('მომხმარებლის ინფორმაციის მიღების შეცდომა:', error);
      // Use localStorage data as fallback
      setUserInfo({
        id: userId || localStorage.getItem('userId'),
        username: userName || localStorage.getItem('userName'),
        role: userRole || localStorage.getItem('userRole'),
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'ადმინისტრატორი',
      'manager': 'მენეჯერი',
      'sales': 'გაყიდვები',
      'marketing': 'მარკეტინგი',
      'operation': 'ოპერაცია',
      'finance': 'ფინანსები',
      'user': 'მომხმარებელი'
    };
    return roleNames[role] || role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'უცნობი';
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="user-profile-container">
        <div className="loading">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2>👤 მომხმარებლის პროფილი</h2>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>მომხმარებლის სახელი:</label>
              <span className="info-value">{userInfo?.username}</span>
            </div>

            <div className="info-group">
              <label>როლი:</label>
              <span className={`role-badge role-${userInfo?.role}`}>
                {getRoleDisplayName(userInfo?.role)}
              </span>
            </div>

            <div className="info-group">
              <label>რეგისტრაციის თარიღი:</label>
              <span className="info-value">{formatDate(userInfo?.created_at)}</span>
            </div>

            <div className="info-group">
              <label>მომხმარებლის ID:</label>
              <span className="info-value">{userInfo?.id}</span>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <h3>სტატისტიკა</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">სტატუსი:</span>
              <span className="stat-value active">აქტიური</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ბოლო შესვლა:</span>
              <span className="stat-value">ახლა</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
