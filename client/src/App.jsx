import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExhibitionsList from './components/ExhibitionsList';
import UserManagement from './components/UserManagement';
import EquipmentList from './components/EquipmentList'; // ახალი იმპორტი
import Notification from './components/Notification';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [activeView, setActiveView] = useState('auth');
  const [notification, setNotification] = useState({ message: '', type: '' });

  const handleLoginSuccess = (role, token) => {
    setIsLoggedIn(true);
    setUserRole(role);
    localStorage.setItem('userRole', role);
    localStorage.setItem('token', token);
    setActiveView('equipment'); // ნაგულისხმევად ვაჩვენოთ აღჭურვილობის გვერდი
    showNotification('შესვლა წარმატებით დასრულდა!', 'success');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    userRole(null); // შეცვლილია setUserRole-ით
    setActiveView('auth');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
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
    const storedRole = localStorage.getItem('userRole');
    const storedToken = localStorage.getItem('token');
    if (storedRole && storedToken) {
      setIsLoggedIn(true);
      setUserRole(storedRole);
      setActiveView('equipment'); // გვერდის განახლებისას აღჭურვილობის გვერდი
    }
  }, []);

  const renderContent = () => {
    if (!isLoggedIn) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} showNotification={showNotification} />;
    }

    if (activeView === 'exhibitions') {
      return <ExhibitionsList showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'users') {
        return <UserManagement showNotification={showNotification} userRole={userRole} />;
    }

    if (activeView === 'equipment') { // ახალი view აღჭურვილობისთვის
        return <EquipmentList showNotification={showNotification} userRole={userRole} />;
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
