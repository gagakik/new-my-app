import React, { useState } from 'react';
import ExhibitionsList from './ExhibitionsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';
import EventsList from './EventsList';
import Statistics from './Statistics';
import EventReports from './EventReports';
import UserProfile from './UserProfile';
import Header from './Header';

import './MainContent.css';

const MainContent = ({ showNotification, userRole, userName, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSectionChange = (section) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Changing to section:', section); // Debug log
      setActiveSection(section);
    } catch (err) {
      setError('Section change failed');
      showNotification('სექციის ცვლილება ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="user-header">
        <Header
          isLoggedIn={true}
          userRole={userRole}
          userName={userName}
          activeView={activeSection}
          onLogout={onLogout}
          onViewChange={handleSectionChange}
          showNotification={showNotification}
        />
      </div>
      <div className="content-area full-width">
        {activeSection === 'dashboard' && (
          <div className="dashboard">
            <div className="dashboard-header">
              <h1>მთავარი დეშბორდი</h1>
              <p>თქვენი ბიზნესის მთავარი მეტრიკები და ანალიტიკა ერთ ადგილას. აქ თვალს ადევნებთ ყველა მნიშვნელოვან ინფორმაციას.</p>
            </div>
          </div>
        )}
        {activeSection === 'exhibitions' && (
          <ExhibitionsList showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'companies' && (
          <CompaniesList showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'equipment' && (
          <EquipmentList showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'spaces' && (
          <SpacesList showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'events' && (
          <EventsList showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'statistics' && (
          <Statistics showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'users' && userRole === 'admin' && (
          <UserManagement showNotification={showNotification} userRole={userRole} />
        )}
        {activeSection === 'eventReports' && userRole === 'admin' && (
          <EventReports
            showNotification={showNotification}
            userRole={userRole}
          />
        )}
        {activeSection === 'finance' && (
          <div className="finance-section">
            <div className="section-header">
              <h1>ფინანსები</h1>
              <p>ფინანსური მართვისა და ანალიტიკის სექცია. მალე დაემატება...</p>
            </div>
          </div>
        )}
        {activeSection === 'marketing' && (
          <div className="marketing-section">
            <div className="section-header">
              <h1>მარკეტინგი</h1>
              <p>მარკეტინგული კამპანიებისა და აქტივობების მართვის სექცია. მალე დაემატება...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;