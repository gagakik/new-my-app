import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExhibitionsList from './components/ExhibitionsList';
import UserManagement from './components/UserManagement';
import EquipmentList from './components/EquipmentList';
import Notification from './components/Notification';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState(null); // ახალი სტეიტი მომხმარებლის სახელისთვის
  const [activeView, setActiveView] = useState('auth');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // handleLoginSuccess ფუნქცია განახლებულია userId-ის და userName-ის მისაღებად
  const handleLoginSuccess = (role, token, userId, username) => {
    setIsLoggedIn(true);
    setUserRole(role);
    setUserName(username); // მომხმარებლის სახელის დაყენება
    localStorage.setItem('userRole', role);
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId); // userId-ის შენახვა
    localStorage.setItem('userName', username); // მომხმარებლის სახელის შენახვა
    setActiveView('equipment'); // ნაგულისხმევად ვაჩვენოთ აღჭურვილობის გვერდი
    showNotification('შესვლა წარმატებით დასრულდა!', 'success');
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName(null); // მომხმარებლის სახელის გასუფთავება
    setActiveView('auth');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName'); // მომხმარებლის სახელის გასუფთავება
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
    const storedUserName = localStorage.getItem('userName'); // მომხმარებლის სახელის აღება
    if (storedRole && storedToken) {
      setIsLoggedIn(true);
      setUserRole(storedRole);
      setUserName(storedUserName); // მომხმარებლის სახელის დაყენება
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

    if (activeView === 'equipment') {
        return <EquipmentList showNotification={showNotification} userRole={userRole} />;
    }
    
    return null;
  };

  return (
    <div className="App">
      <Header 
        isLoggedIn={isLoggedIn} 
        userRole={userRole} 
        userName={userName} // userName გადავეცით Header-ს
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
