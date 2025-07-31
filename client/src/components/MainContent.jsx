import React, { useState } from 'react';
import ExhibitionsList from './ExhibitionsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';
import ServicesList from './ServicesList';
import EventsList from './EventsList';
import BookingsList from './BookingsList';
import Statistics from './Statistics';

import './MainContent.css';

const MainContent = ({ showNotification, userRole }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeComponent, setActiveComponent] = useState(null); // Initialize activeComponent state

  return (
    <div className="main-content">
      <nav className="main-nav">
          <button 
            className={activeSection === 'dashboard' ? 'active' : ''} 
            onClick={() => setActiveSection('dashboard')}
          >
            <i className="icon-dashboard"></i>
            დეშბორდი
          </button>
          <button 
            className={activeSection === 'exhibitions' ? 'active' : ''} 
            onClick={() => setActiveSection('exhibitions')}
          >
            <i className="icon-exhibitions"></i>
            გამოფენები
          </button>
          <button 
            className={activeSection === 'companies' ? 'active' : ''} 
            onClick={() => setActiveSection('companies')}
          >
            <i className="icon-companies"></i>
            კომპანიები
          </button>
          <button 
            className={activeSection === 'equipment' ? 'active' : ''} 
            onClick={() => setActiveSection('equipment')}
          >
            <i className="icon-equipment"></i>
            აღჭურვილობა
          </button>
          <button 
            className={activeSection === 'spaces' ? 'active' : ''} 
            onClick={() => setActiveSection('spaces')}
          >
            <i className="icon-spaces"></i>
            სივრცეები
          </button>
          <button 
            className={activeSection === 'services' ? 'active' : ''} 
            onClick={() => setActiveSection('services')}
          >
            <i className="icon-services"></i>
            სერვისები
          </button>
          <button 
            className={activeSection === 'events' ? 'active' : ''} 
            onClick={() => setActiveSection('events')}
          >
            <i className="icon-events"></i>
            ივენთები
          </button>
          <button 
            className={activeSection === 'bookings' ? 'active' : ''} 
            onClick={() => setActiveSection('bookings')}
          >
            <i className="icon-bookings"></i>
            ჯავშნები
          </button>
          <button 
            className={activeSection === 'statistics' ? 'active' : ''} 
            onClick={() => setActiveSection('statistics')}
          >
            <i className="icon-statistics"></i>
            სტატისტიკა
          </button>
          {userRole === 'admin' && (
            <button 
              className={activeSection === 'users' ? 'active' : ''} 
              onClick={() => setActiveSection('users')}
            >
              <i className="icon-users"></i>
              მომხმარებლები
            </button>
          )}
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
          {activeSection === 'services' && (
            <ServicesList showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'events' && (
            <EventsList showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'bookings' && (
            <BookingsList showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'statistics' && (
            <Statistics showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'users' && userRole === 'admin' && (
            <UserManagement showNotification={showNotification} />
          )}
        </div>
    </div>
  );
};

export default MainContent;