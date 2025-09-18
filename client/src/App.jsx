import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import MainContent from './components/MainContent';
import EventInfo from './components/EventInfo';
import Notification from './components/Notification';
import './index.css';
import './calendar-custom.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          background: 'var(--surface-primary)',
          color: 'var(--text-primary)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1>შეცდომა მოხდა</h1>
          <p>აპლიკაციაში შეცდომა მოხდა. გთხოვთ განაახლოთ გვერდი.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '0.75rem 1.5rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            გვერდის განახლება
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    setActiveView('main'); 
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
        setActiveView('main'); 
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

    return <MainContent 
      showNotification={showNotification} 
      userRole={userRole} 
      userName={userName}
      onLogout={handleLogout}
    />;
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <main>
            <Routes>
              <Route 
                path="/event-info" 
                element={<EventInfo />} 
              />
              <Route 
                path="/" 
                element={renderContent()}
              />
              <Route 
                path="*" 
                element={<Navigate to="/" replace />}
              />
            </Routes>
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
      </Router>
    </ErrorBoundary>
  );
}

export default App;
