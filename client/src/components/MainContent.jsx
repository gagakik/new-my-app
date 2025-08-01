import React, { useState } from 'react';
import ExhibitionsList from './ExhibitionsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';
import EventsList from './EventsList';
import Statistics from './Statistics';

import './MainContent.css';

const MainContent = ({ showNotification, userRole, userName, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeComponent, setActiveComponent] = useState(null); // Initialize activeComponent state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMenuOpen(false); // Close menu on mobile when section is selected
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
          </div>
        </nav>

        <div className="content-area">
          {activeSection === 'dashboard' && (
            <div className="dashboard">
              <div className="dashboard-header">
                <h1>დეშბორდი</h1>
                <p>მთავარი ინფორმაცია და სტატისტიკა</p>
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
        </div>
      </div>
    </div>
  );
};

export default MainContent;