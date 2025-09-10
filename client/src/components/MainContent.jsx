
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import ExhibitionsList from './ExhibitionsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';
import EventsList from './EventsList';
import BookingsList from './BookingsList';
import Statistics from './Statistics';
import EventReports from './EventReports';
import Header from './Header';
import CalendarPage from '../pages/CalendarPage.jsx';

const MainContent = ({ showNotification, userRole, userName, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const theme = useTheme();

  const handleSectionChange = (section) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Changing to section:', section);
      setActiveSection(section);
    } catch (err) {
      setError('Section change failed');
      showNotification('სექციის ცვლილება ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <Fade in timeout={600}>
      <Box>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 3,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
              pointerEvents: 'none'
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1,  minHeight: '50vh' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 500,
                mb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                '&::after': {
                  content: '"📊"',
                  position: 'absolute',
                  top: -10,
                  right: -40,
                  fontSize: '2rem',
                  opacity: 0.3
                }
              }}
            >
              ზოგადი ინფორმაცია
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
            >
              ჭერის სიმაღლე 
              მე-3 პავილიონი - 410 სმ.
              მე-4 პავილიონი - 455 სმ.
              მე-5 პავილიონი - 455 სმ. 
              მე-6 პავილიონი - 455 სმ. 
              მე-11 პავილიონი - 600 სმ.

            </Typography>
            <CalendarPage/>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );

  const renderFinanceSection = () => (
    <Fade in timeout={600}>
      <Container maxWidth="lg">
        <Paper
          elevation={2}
          sx={{
            p: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
            borderRadius: 3
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: theme.palette.success.main
            }}
          >
            💰 ფინანსები
          </Typography>
          <Typography variant="h6" color="text.secondary">
            ფინანსური მართვისა და ანალიტიკის სექცია. მალე დაემატება...
          </Typography>
        </Paper>
      </Container>
    </Fade>
  );

  const renderMarketingSection = () => (
    <Fade in timeout={600}>
      <Container maxWidth="lg">
        <Paper
          elevation={2}
          sx={{
            p: 4,
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
            borderRadius: 3
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: theme.palette.warning.main
            }}
          >
            📢 მარკეტინგი
          </Typography>
          <Typography variant="h6" color="text.secondary">
            მარკეტინგული კამპანიებისა და აქტივობების მართვის სექცია. მალე დაემატება...
          </Typography>
        </Paper>
      </Container>
    </Fade>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <Typography variant="h6" color="text.secondary">
            იტვირთება...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Paper
          elevation={2}
          sx={{
            p: 4,
            textAlign: 'center',
            border: `1px solid ${theme.palette.error.main}`,
            borderRadius: 3,
            background: alpha(theme.palette.error.main, 0.05)
          }}
        >
          <Typography variant="h6" color="error.main" gutterBottom>
            ⚠️ შეცდომა
          </Typography>
          <Typography color="text.secondary">
            {error}
          </Typography>
        </Paper>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'exhibitions':
        return <ExhibitionsList showNotification={showNotification} userRole={userRole} />;
      case 'companies':
        return <CompaniesList showNotification={showNotification} userRole={userRole} />;
      case 'equipment':
        return <EquipmentList showNotification={showNotification} userRole={userRole} />;
      case 'spaces':
        return <SpacesList showNotification={showNotification} userRole={userRole} />;
      case 'events':
        return <EventsList showNotification={showNotification} userRole={userRole} />;
      case 'bookings':
        return <BookingsList showNotification={showNotification} userRole={userRole} />;
      case 'statistics':
        return <Statistics showNotification={showNotification} userRole={userRole} />;
      case 'users':
        return userRole === 'admin' ? (
          <UserManagement showNotification={showNotification} userRole={userRole} />
        ) : (
          <Paper
            elevation={2}
            sx={{
              p: 4,
              textAlign: 'center',
              border: `1px solid ${theme.palette.error.main}`,
              borderRadius: 3,
              background: alpha(theme.palette.error.main, 0.05)
            }}
          >
            <Typography variant="h5" color="error.main" gutterBottom>
              🚫 წვდომა აკრძალულია
            </Typography>
            <Typography color="text.secondary">
              ამ სექციაში შესვლის უფლება მხოლოდ ადმინისტრატორს აქვს
            </Typography>
          </Paper>
        );
      case 'eventReports':
        return userRole === 'admin' ? (
          <EventReports showNotification={showNotification} userRole={userRole} />
        ) : (
          <Paper
            elevation={2}
            sx={{
              p: 4,
              textAlign: 'center',
              border: `1px solid ${theme.palette.error.main}`,
              borderRadius: 3,
              background: alpha(theme.palette.error.main, 0.05)
            }}
          >
            <Typography variant="h5" color="error.main" gutterBottom>
              🚫 წვდომა აკრძალულია
            </Typography>
            <Typography color="text.secondary">
              ამ სექციაში შესვლის უფლება მხოლოდ ადმინისტრატორს აქვს
            </Typography>
          </Paper>
        );
      case 'finance':
        return renderFinanceSection();
      case 'marketing':
        return renderMarketingSection();
      default:
        return renderDashboard();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 50%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 50%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
          pointerEvents: 'none',
          zIndex: -1
        }
      }}
    >
      <Header
        isLoggedIn={true}
        userRole={userRole}
        userName={userName}
        activeView={activeSection}
        onLogout={onLogout}
        onViewChange={handleSectionChange}
        showNotification={showNotification}
      />
      
      <Container
        maxWidth="xl"
        sx={{
          py: 3,
          px: { xs: 2, sm: 3 },
          position: 'relative'
        }}
      >
        {renderContent()}
      </Container>
    </Box>
  );
};

export default MainContent;
