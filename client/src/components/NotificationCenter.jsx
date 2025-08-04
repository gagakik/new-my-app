
import React, { useState, useEffect } from 'react';
import './NotificationCenter.css';

const NotificationCenter = ({ showNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // პერიოდული განახლება ყოველ 30 წამში
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('ნოტიფიკაციების ჩატვირთვის შეცდომა:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('ნოტიფიკაციის განახლების შეცდომა:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'payment': return '💳';
      case 'event': return '🎪';
      default: return 'ℹ️';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ახლახან';
    if (diffMins < 60) return `${diffMins} წუთის წინ`;
    if (diffHours < 24) return `${diffHours} საათის წინ`;
    if (diffDays < 7) return `${diffDays} დღის წინ`;
    return date.toLocaleDateString('ka-GE');
  };

  return (
    <div className="notification-center">
      <button 
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>შეტყობინებები</h4>
            <button 
              className="close-dropdown"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>შეტყობინებები არ არის</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {formatDate(notification.created_at)}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <button className="view-all-btn">
                ყველას ნახვა
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
