
import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Button, Typography } from '@mui/material';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import MainContent from './components/MainContent';
import Notification from './components/Notification';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      marginBottom: '1rem',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      marginBottom: '0.75rem',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      marginBottom: '0.5rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

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
        <Container 
          maxWidth="sm" 
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" color="error" gutterBottom>
              შეცდომა მოხდა
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              აპლიკაციაში შეცდომა მოხდა. გთხოვთ განაახლოთ გვერდი.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              გვერდის განახლება
            </Button>
          </Box>
        </Container>
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
      return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h6">იტვირთება აპლიკაცია...</Typography>
        </Container>
      );
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Box component="main" sx={{ flexGrow: 1 }}>
            {renderContent()}
          </Box>
          <Footer />
          {notification.message && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={clearNotification}
            />
          )}
        </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
