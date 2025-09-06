import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // შეტყობინება გაქრება 3 წამში
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className={`notification ${type}`}>
      <div className="notification-content">
        {message}
      </div>
      <button className="close-btn" onClick={onClose} aria-label="დახურვა">
        &times;
      </button>
    </div>
  );
};

export default Notification;