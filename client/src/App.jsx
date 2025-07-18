import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExhibitionsList from './components/ExhibitionsList';
import UserManagement from './components/UserManagement';
import Notification from './components/Notification'; // ახალი იმპორტი
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [activeView, setActiveView] = useState('auth');
  const [notification, setNotification] = useState({ message: '', type: '' }); // ახალი მდგომარეობა

  const handleLoginSuccess = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setActiveView('exhibitions');
    showNotification('შესვლა წარმატებით დასრულდა!', 'success');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setActiveView('auth');
    localStorage.removeItem('userRole');
    showNotification('თქვენ წარმატებით გამოხვედით სისტემიდან.', 'info');
  };
  
  const handleViewChange = (view) => {
      setActiveView(view);
  };
  
  // ახალი ფუნქცია შეტყობინების საჩვენებლად
  const showNotification = (message, type) => {
    setNotification({ message, type });
  };
  
  // ფუნქცია შეტყობინების დასახურად
  const clearNotification = () => {
    setNotification({ message: '', type: '' });
  };

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setIsLoggedIn(true);
      setUserRole(storedRole);
      setActiveView('exhibitions');
    }
  }, []);

  const renderContent = () => {
    if (!isLoggedIn) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} showNotification={showNotification} />;
    }

    if (activeView === 'exhibitions') {
      return <ExhibitionsList showNotification={showNotification} />;
    }

    if (activeView === 'users') {
        return <UserManagement showNotification={showNotification} />;
    }
    
    return null;
  };

  return (
    <div className="App">
      <Header 
        isLoggedIn={isLoggedIn} 
        userRole={userRole} 
        onLogout={handleLogout} 
        onViewChange={handleViewChange}
      /> 
      <main>
        {renderContent()}
      </main>
      <Footer />
      {/* შეტყობინების კომპონენტი */}
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