
import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Divider,
  Container,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  Build as BuildIcon,
  Room as RoomIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  ExitToApp as ExitIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';

// Import components
import Statistics from './Statistics';
import ExhibitionsList from './ExhibitionsList';
import EventsList from './EventsList';
import CompaniesList from './CompaniesList';
import EquipmentList from './EquipmentList';
import SpacesList from './SpacesList';
import UserManagement from './UserManagement';

function MainContent({ showNotification, userRole, userName, onLogout }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { id: 'dashboard', label: 'მთავარი', icon: <DashboardIcon />, roles: ['admin', 'manager', 'user'] },
    { id: 'events', label: 'ივენთები', icon: <EventIcon />, roles: ['admin', 'manager', 'sales', 'marketing'] },
    { id: 'exhibitions', label: 'გამოფენები', icon: <BusinessIcon />, roles: ['admin', 'manager'] },
    { id: 'companies', label: 'კომპანიები', icon: <BusinessIcon />, roles: ['admin', 'manager'] },
    { id: 'equipment', label: 'აღჭურვილობა', icon: <BuildIcon />, roles: ['admin', 'manager'] },
    { id: 'spaces', label: 'სივრცეები', icon: <RoomIcon />, roles: ['admin', 'manager'] },
    { id: 'statistics', label: 'სტატისტიკა', icon: <BarChartIcon />, roles: ['admin', 'manager'] },
    { id: 'users', label: 'მომხმარებლები', icon: <PeopleIcon />, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Container maxWidth="lg">
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                მოგესალმებით, {userName}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                თქვენი როლი: {userRole === 'admin' ? 'ადმინისტრატორი' : 
                              userRole === 'manager' ? 'მენეჯერი' : 'მომხმარებელი'}
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                სისტემის ფუნქციები
              </Typography>
              <Typography variant="body1">
                აირჩიეთ მენიუდან სასურველი განყოფილება სამუშაოდ.
              </Typography>
            </Paper>
          </Container>
        );
      case 'statistics':
        return <Statistics showNotification={showNotification} />;
      case 'events':
        return <EventsList showNotification={showNotification} userRole={userRole} />;
      case 'exhibitions':
        return <ExhibitionsList showNotification={showNotification} />;
      case 'companies':
        return <CompaniesList showNotification={showNotification} />;
      case 'equipment':
        return <EquipmentList showNotification={showNotification} />;
      case 'spaces':
        return <SpacesList showNotification={showNotification} />;
      case 'users':
        return <UserManagement showNotification={showNotification} />;
      default:
        return <div>არჩეული განყოფილება ვერ მოიძებნა</div>;
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Expo Georgia
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem 
            button 
            key={item.id}
            onClick={() => handleViewChange(item.id)}
            selected={activeView === item.id}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Expo Georgia Co - მართვის სისტემა
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountIcon />
            <Typography variant="body1" sx={{ mr: 2 }}>
              {userName}
            </Typography>
            <Button 
              color="inherit" 
              onClick={onLogout}
              startIcon={<ExitIcon />}
            >
              გასვლა
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          mt: '64px',
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}

export default MainContent;
