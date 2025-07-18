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
      {message}
      <button className="close-btn" onClick={onClose}>&times;</button>
    </div>
  );
};

export default Notification;