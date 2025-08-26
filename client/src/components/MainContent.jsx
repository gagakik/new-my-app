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

import './MainContent.css';

const MainContent = ({ showNotification, userRole, userName, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSectionChange = (section) => {
    try {
      setLoading(true);
      setError(null);
      setActiveSection(section);
      setIsMenuOpen(false); // Close menu on mobile when section is selected
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
        <div className="user-info">
          <span>მომხმარებელი: {userName}</span>
          <span className="user-role">({userRole})</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          გამოსვლა
        </button>
      </div>
      <div className="main-layout">
        <nav className={`main-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
          <button className="mobile-menu-toggle" onClick={toggleMenu}>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="hamburger"></span>
            <span className="menu-text">მენიუ</span>
          </button>

          <div className="nav-items">
            <button
              className={activeSection === 'dashboard' ? 'active' : ''}
              onClick={() => handleSectionChange('dashboard')}
            >
              <i className="icon-dashboard"></i>
              დეშბორდი
            </button>
            <button
              className={activeSection === 'exhibitions' ? 'active' : ''}
              onClick={() => handleSectionChange('exhibitions')}
            >
              <i className="icon-exhibitions"></i>
              გამოფენები
            </button>
            <button
              className={activeSection === 'companies' ? 'active' : ''}
              onClick={() => handleSectionChange('companies')}
            >
              <i className="icon-companies"></i>
              კომპანიები
            </button>
            <button
              className={activeSection === 'equipment' ? 'active' : ''}
              onClick={() => handleSectionChange('equipment')}
            >
              <i className="icon-equipment"></i>
              აღჭურვილობა
            </button>
            <button
              className={activeSection === 'spaces' ? 'active' : ''}
              onClick={() => handleSectionChange('spaces')}
            >
              <i className="icon-spaces"></i>
              სივრცეები
            </button>
            <button
              className={activeSection === 'events' ? 'active' : ''}
              onClick={() => handleSectionChange('events')}
            >
              <i className="icon-events"></i>
              ივენთები
            </button>
            <button
              className={activeSection === 'statistics' ? 'active' : ''}
              onClick={() => handleSectionChange('statistics')}
            >
              <i className="icon-statistics"></i>
              სტატისტიკა
            </button>
            {userRole === 'admin' && (
              <button
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => handleSectionChange('users')}
              >
                <i className="icon-users"></i>
                მომხმარებლები
              </button>
            )}
             {userRole === 'admin' && (
              <button
                className={activeSection === 'eventReports' ? 'active' : ''}
                onClick={() => handleSectionChange('eventReports')}
              >
                <i className="icon-reports"></i>
                Event Reports
              </button>
            )}
          </div>
        </nav>

        <div className="content-area">
          {activeSection === 'dashboard' && (
            <div className="dashboard">
              <div className="dashboard-header">
                <h1>მთავარი დეშბორდი</h1>
                <p>თქვენი ბიზნესის მთავარი მეტრიკები და ანალიტიკა ერთ ადგილას. აქ თვალს ადევნებთ ყველა მნიშვნელოვან ინფორმაციას.</p>
                <div className="dashboard-stats-preview">
                  <div className="preview-stat">
                    <div className="preview-stat-label">აქტიური</div>
                    <div className="preview-stat-value">🟢</div>
                  </div>
                  <div className="preview-stat">
                    <div className="preview-stat-label">სტატუსი</div>
                    <div className="preview-stat-value">✅</div>
                  </div>
                  <div className="preview-stat">
                    <div className="preview-stat-label">ონლაინ</div>
                    <div className="preview-stat-value">👥</div>
                  </div>
                </div>
              </div>
              <Statistics showNotification={showNotification} userRole={userRole} />
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
            <UserManagement showNotification={showNotification} />
          )}
           {activeSection === 'eventReports' && (
            <EventReports 
              showNotification={showNotification} 
              userRole={userRole} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent;