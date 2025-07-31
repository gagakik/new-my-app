import React, { useState } from 'react';
import ExhibitionsList from './ExhibitionsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';
import ServicesList from './ServicesList';
import BookingsList from './BookingsList';
import EventsList from './EventsList'; // Added EventsList import

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
          {activeSection === 'bookings' && (
            <BookingsList showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'statistics' && (
            <Statistics showNotification={showNotification} userRole={userRole} />
          )}
          {activeSection === 'users' && userRole === 'admin' && (
            <UserManagement showNotification={showNotification} />
          )}
          {(userRole === 'admin' || userRole === 'sales' || userRole === 'marketing') && (
            <div className="section">
              <h3>Sales და Marketing</h3>
              <button
                onClick={() => setActiveComponent('exhibitions')}
                className={activeComponent === 'exhibitions' ? 'active' : ''}
              >
                გამოფენები
              </button>
              <button
                onClick={() => setActiveComponent('companies')}
                className={activeComponent === 'companies' ? 'active' : ''}
              >
                კომპანიები
              </button>
              <button
                onClick={() => setActiveComponent('services')}
                className={activeComponent === 'services' ? 'active' : ''}
              >
                ყოველწლური სერვისები
              </button>
              <button
                onClick={() => setActiveComponent('events')}
                className={activeComponent === 'events' ? 'active' : ''}
              >
                ივენთები
              </button>
              <button
                onClick={() => setActiveComponent('bookings')}
                className={activeComponent === 'bookings' ? 'active' : ''}
              >
                ჯავშნები
              </button>
            </div>
          )}
          {activeComponent === 'exhibitions' && (
            <ExhibitionsList showNotification={showNotification} userRole={userRole} />
          )}
          {activeComponent === 'companies' && (
            <CompaniesList showNotification={showNotification} userRole={userRole} />
          )}
          {activeComponent === 'services' && (
            <ServicesList showNotification={showNotification} userRole={userRole} />
          )}
          {activeComponent === 'events' && (
            <EventsList showNotification={showNotification} userRole={userRole} />
          )}
          {activeComponent === 'bookings' && (
            <BookingsList showNotification={showNotification} userRole={userRole} />
          )}
        </div>
    </div>
  );
};

export default MainContent;