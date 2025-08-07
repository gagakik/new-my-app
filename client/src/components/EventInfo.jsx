
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './EventInfo.css';

const EventInfo = () => {
  const [eventData, setEventData] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const data = {
      event: params.get('event'),
      company: params.get('company'),
      booth: params.get('booth'),
      size: params.get('size'),
      status: params.get('status')
    };
    
    setEventData(data);
  }, [location]);

  const getStatusInGeorgian = (status) => {
    const statusMap = {
      'registered': 'რეგისტრირებული',
      'approved': 'დადასტურებული',
      'pending': 'მოლოდინში',
      'cancelled': 'გაუქმებული'
    };
    return statusMap[status] || status;
  };

  if (!eventData) {
    return <div>იტვირთება...</div>;
  }

  return (
    <div className="event-info-page">
      <div className="event-info-container">
        <div className="logo-section">
          <h1>EXPO GEORGIA</h1>
          <p>Exhibition & Convention Center</p>
        </div>

        <div className="event-details">
          <h2>{eventData.event}</h2>
          
          <div className="company-info">
            <h3>{eventData.company}</h3>
          </div>

          <div className="booth-info">
            <div className="info-item">
              <strong>სტენდის ნომერი:</strong> #{eventData.booth}
            </div>
            <div className="info-item">
              <strong>სტენდის ზომა:</strong> {eventData.size} მ²
            </div>
            <div className="info-item">
              <strong>სტატუსი:</strong> {getStatusInGeorgian(eventData.status)}
            </div>
          </div>

          <div className="contact-info">
            <h4>საკონტაქტო ინფორმაცია:</h4>
            <p><strong>მისამართი:</strong> წერეთლის გამზ. №118, თბილისი</p>
            <p><strong>ტელეფონი:</strong> +995 322 341 100</p>
            <p><strong>Email:</strong> info@expogeorgia.ge</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventInfo;
