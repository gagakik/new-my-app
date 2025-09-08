
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Badge,
  Tooltip,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard,
  Business,
  Event,
  Store,
  CalendarToday,
  Assessment,
  Build,
  AttachMoney,
  Campaign,
  AdminPanelSettings,
  People,
  Logout,
  DarkMode,
  LightMode,
  QrCodeScanner,
  ExpandLess,
  ExpandMore,
  AccountCircle,
  Notifications
} from '@mui/icons-material';
import UserProfile from './UserProfile';
import NotificationCenter from './NotificationCenter';
import QRScanner from './QRScanner';

const Header = ({ isLoggedIn, userRole, userName, activeView, onLogout, onViewChange, showNotification }) => {
  
  const [anchorEl, setAnchorEl] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const theme = newMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  const handleMenuOpen = (event, menuKey) => {
    setAnchorEl({ ...anchorEl, [menuKey]: event.currentTarget });
  };

  const handleMenuClose = (menuKey) => {
    setAnchorEl({ ...anchorEl, [menuKey]: null });
  };

  const handleViewChange = (view) => {
    onViewChange(view);
    setAnchorEl({});
    setMobileDrawerOpen(false);
  };

  const handleExpandMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const getRoleBasedMenus = () => {
    const menus = [];

    // Dashboard (for all users)
    menus.push({
      key: 'dashboard',
      label: 'Dashboard',
      icon: <Dashboard />,
      single: true,
      sx: {
        colors: 'primary.main'
      },
      action: () => handleViewChange('dashboard')
    });

    // Sales role
    if (userRole === 'sales' || userRole === 'admin') {
      menus.push({
        key: 'sales',
        label: 'Sales',
        icon: <Business />,
        sx: {
          colors: 'primary.main'
        },
        items: [
          { key: 'exhibitions', label: 'გამოფენები', icon: <Event /> },
          { key: 'companies', label: 'კომპანიები', icon: <Business /> },
          { key: 'spaces', label: 'სივრცეები', icon: <Store /> },
          { key: 'events', label: 'ივენთები', icon: <Event /> },
          { key: 'bookings', label: 'ჯავშნები', icon: <CalendarToday /> },
          { key: 'statistics', label: 'სტატისტიკა', icon: <Assessment /> },
          { key: 'eventReports', label: 'Event Reports', icon: <Assessment /> }
        ]
      });
    }

    // Operation role
    if (userRole === 'operation' || userRole === 'admin') {
      menus.push({
        key: 'operation',
        label: 'Operation',
        icon: <Build />,
        items: [
          { key: 'equipment', label: 'აღჭურვილობა', icon: <Build /> }
        ]
      });
    }

    // Finance menu (for all users)
    menus.push({
      key: 'finance',
      label: 'Finance',
      icon: <AttachMoney />,
      single: true,
      action: () => handleViewChange('finance')
    });

    // Marketing menu (for all users)
    menus.push({
      key: 'marketing',
      label: 'Marketing',
      icon: <Campaign />,
      single: true,
      action: () => handleViewChange('marketing')
    });

    // Admin only sections
    if (userRole === 'admin') {
      menus.push({
        key: 'admin',
        label: 'Admin',
        icon: <AdminPanelSettings />,
        items: [
          { key: 'users', label: 'მომხმარებლები', icon: <People /> }
        ]
      });
    }

    return menus;
  };

  const renderDesktopMenu = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }} justifyContent={'center'}>
      {getRoleBasedMenus().map((menu) => (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center'}}
          key={menu.key}>
          {menu.single ? (
            <Button
              onClick={menu.action}
              startIcon={menu.icon}
              sx={{
                color: activeView === menu.key ? 'primary.main' : '#fff',
                fontWeight: activeView === menu.key ? 600 : 400,
                textTransform: 'none',
                px: 2,
                py: 1,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease'
              }}
            >
              {menu.label}
            </Button>
          ) : (
            <>
              <Button
                onClick={(e) => handleMenuOpen(e, menu.key)}
                endIcon={<ExpandMore />}
                startIcon={menu.icon}
                sx={{
                  color: '#fff',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {menu.label}
              </Button>
              <Menu
                anchorEl={anchorEl[menu.key]}
                open={Boolean(anchorEl[menu.key])}
                onClose={() => handleMenuClose(menu.key)}
                PaperProps={{
                  sx: {
                    mt: 1,
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    border: '1px solid',
                    borderColor: 'divider',
                    minWidth: 200
                  }
                }}
              >
                {menu.items.map((item) => (
                  <MenuItem
                    key={item.key}
                    onClick={() => {
                      handleViewChange(item.key);
                      handleMenuClose(menu.key);
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderRadius: 1,
                      mx: 0.5,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      backgroundColor: activeView === item.key ? 'action.selected' : 'transparent'
                    }}
                  >
                    <ListItemIcon sx={{ color: activeView === item.key ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: activeView === item.key ? 600 : 400,
                        color: activeView === item.key ? 'primary.main' : 'text.primary'
                      }}
                    />
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      ))}
    </Box>
  );

  const renderMobileMenu = () => (
    <Drawer
      anchor="left"
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: 'background.paper',
          borderRadius: '0 16px 16px 0'
        }
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Expo Georgia
          </Typography>
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        {isLoggedIn && (
          <Box sx={{ textAlign: 'center' }}>
            <Chip 
              label={userRole} 
              color="primary" 
              size="small" 
              sx={{ mb: 1, textTransform: 'uppercase', fontWeight: 600 }} 
            />
            <Typography variant="body2" color="text.secondary">
              {userName}
            </Typography>
          </Box>
        )}
      </Box>

      <List sx={{ flex: 1, py: 1 }}>
        {getRoleBasedMenus().map((menu) => (
          <Box key={menu.key}>
            {menu.single ? (
              <ListItemButton
                onClick={menu.action}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  mb: 0.5,
                  backgroundColor: activeView === menu.key ? 'action.selected' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <ListItemIcon sx={{ color: activeView === menu.key ? 'primary.main' : 'text.secondary' }}>
                  {menu.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={menu.label}
                  primaryTypographyProps={{
                    fontWeight: activeView === menu.key ? 600 : 400,
                    color: activeView === menu.key ? 'primary.main' : 'text.primary'
                  }}
                />
              </ListItemButton>
            ) : (
              <>
                <ListItemButton
                  onClick={() => handleExpandMenu(menu.key)}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    mb: 0.5,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: 'text.secondary' }}>
                    {menu.icon}
                  </ListItemIcon>
                  <ListItemText primary={menu.label} />
                  {expandedMenus[menu.key] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={expandedMenus[menu.key]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {menu.items.map((item) => (
                      <ListItemButton
                        key={item.key}
                        onClick={() => handleViewChange(item.key)}
                        sx={{
                          pl: 4,
                          mx: 1,
                          borderRadius: 2,
                          mb: 0.5,
                          backgroundColor: activeView === item.key ? 'action.selected' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          }
                        }}
                      >
                        <ListItemIcon sx={{ 
                          color: activeView === item.key ? 'primary.main' : 'text.secondary',
                          minWidth: 40 
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.875rem',
                            fontWeight: activeView === item.key ? 600 : 400,
                            color: activeView === item.key ? 'primary.main' : 'text.primary'
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            )}
          </Box>
        ))}
      </List>

      {isLoggedIn && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={onLogout}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            გასვლა
          </Button>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={isDarkMode ? <LightMode /> : <DarkMode />}
            onClick={toggleDarkMode}
            sx={{ textTransform: 'none' }}
          >
            {isDarkMode ? 'ღია თემა' : 'მუქი თემა'}
          </Button>
        </Box>
      )}
    </Drawer>
  );

  return (
    <>
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary'
        }}
      >
        <Container maxWidth="xl" display="flex" alignItems="center" justifyContent="space-between">
          <Toolbar sx={{ px: { xs: 0, sm: 2 } }}>
            {/* Logo */}
            <Typography
              variant="h6"
              sx={{
                flexGrow: { xs: 1, md: 0 },
                fontWeight: 700,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mr: { md: 4 }
              }}
            >
              🏢 logo
            </Typography>

            {/* Desktop Navigation */}
            {isLoggedIn && renderDesktopMenu()}

            <Box sx={{ flexGrow: 1 }} />

            {/* Right side actions */}
            {isLoggedIn ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* User info - Desktop only */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
                  <Box sx={{ textAlign: 'right', mr: 1 }}>
                    <Chip 
                      label={userRole} 
                      color="primary" 
                      size="small" 
                      sx={{ mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }} 
                    />
                    <Typography variant="body2" color="text.secondary">
                      {userName}
                    </Typography>
                  </Box>
                </Box>

                {/* Theme toggle - Desktop only */}
                <Tooltip title={isDarkMode ? 'ღია თემაზე გადართვა' : 'მუქ თემაზე გადართვა'}>
                  <IconButton
                    onClick={toggleDarkMode}
                    sx={{ 
                      display: { xs: 'none', md: 'flex' },
                      bgcolor: 'action.hover',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isDarkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                </Tooltip>

                {/* QR Scanner */}
                <Tooltip title="QR კოდის სკანერი">
                  <IconButton
                    onClick={() => setShowQRScanner(true)}
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': {
                        bgcolor: 'action.selected',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <QrCodeScanner />
                  </IconButton>
                </Tooltip>

                {/* Logout - Desktop only */}
                <Button
                  onClick={onLogout}
                  variant="outlined"
                  startIcon={<Logout />}
                  sx={{ 
                    display: { xs: 'none', md: 'flex' },
                    textTransform: 'none',
                    color: '#ffffffff',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  Logout
                </Button>

                {/* Mobile menu button */}
                <IconButton
                  onClick={() => setMobileDrawerOpen(true)}
                  sx={{ 
                    display: { xs: 'flex', md: 'none' },
                    bgcolor: 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    }
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                სტუმარი
              </Typography>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      {renderMobileMenu()}

      {/* Modals */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
          showNotification={showNotification}
        />
      )}

      {showQRScanner && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          showNotification={showNotification}
        />
      )}
    </>
  );
};

export default Header;
