import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExhibitionsList from './components/ExhibitionsList';
import UserManagement from './components/UserManagement';
import EquipmentList from './components/EquipmentList';
import CompaniesList from './components/CompaniesList';
import SpacesList from './components/SpacesList';
import ServicesList from './components/ServicesList';
import BookingsList from './components/BookingsList';

import Notification from './components/Notification';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [activeView, setActiveView] = useState('auth');
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [isAuthReady, setIsAuthReady] = useState(false);

  const handleLoginSuccess = (role, token, userId, username) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(username);
    localStorage.setItem('userRole', role);
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userName', username);
    setActiveView('companies'); 
    showNotification('შესვლა წარმატებით დასრულდა!', 'success');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName(null);
    setActiveView('auth');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    showNotification('თქვენ წარმატებით გამოხვედით სისტემიდან.', 'info');
  };
  
  const handleViewChange = (view) => {
      setActiveView(view);
  };
  
  const showNotification = (message, type) => {
    setNotification({ message, type });
  };
  
  const clearNotification = () => {
    setNotification({ message: '', type: '' });
  };

  useEffect(() => {
    const checkAuthStatus = () => {
      const storedRole = localStorage.getItem('userRole');
      const storedToken = localStorage.getItem('token');
      const storedUserName = localStorage.getItem('userName');
      
      if (storedRole && storedToken) {
        setIsLoggedIn(true);
        setUserRole(storedRole);
        setUserName(storedUserName);
        setActiveView('companies'); 
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setUserName(null);
        setActiveView('auth');
      }
      setIsAuthReady(true);
    };

    checkAuthStatus();
  }, []);

  const renderContent = () => {
    if (!isAuthReady) {
      return <div>იტვირთება აპლიკაცია...</div>;
    }

    if (!isLoggedIn) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} showNotification={showNotification} />;
    }

    if (activeView === 'exhibitions') {
      return <ExhibitionsList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'users') {
        return <UserManagement showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'equipment') {
        return <EquipmentList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'companies') {
        return <CompaniesList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'spaces') {
        return <SpacesList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'services') {
        return <ServicesList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'bookings') {
        return <BookingsList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'statistics') {
        return <Statistics showNotification={showNotification} userRole={userRole} />;
    }
    
    return null;
  };

  return (
    <div className="App">
      <Header 
        isLoggedIn={isLoggedIn} 
        userRole={userRole} 
        userName={userName}
        activeView={activeView}
        onLogout={handleLogout} 
        onViewChange={handleViewChange}
      /> 
      <main>
        {renderContent()}
      </main>
      <Footer />
      {notification.message && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
        />
      )}
    </div>
  );
}

export default App;
