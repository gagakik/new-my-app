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
  useTheme,
  Collapse,
  Badge,
  Tooltip,
  Container
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
  Notifications,
  Construction
} from '@mui/icons-material';
import QRScanner from './QRScanner';

const Header = ({ isLoggedIn, userRole, userName, activeView, onLogout, onViewChange, showNotification }) => {
  const theme = useTheme();

  const [anchorEl, setAnchorEl] = useState({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
      action: () => handleViewChange('dashboard')
    });

    // Calendar (for all users)
    menus.push({
      key: 'calendar',
      label: 'Calendar',
      icon: <CalendarToday />,
      single: true,
      action: () => handleViewChange('calendar')
    });

    // Sales role
    if (userRole === 'sales' || userRole === 'admin') {
      menus.push({
        key: 'sales',
        label: 'Sales',
        icon: <Business />,
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
          { key: 'equipment', label: 'აღჭურვილობა', icon: <Build /> },
          { key: 'operationdashboard', label: 'სტენდების მართვა', icon: <Construction /> }
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
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, flexDirection: 'row', width: '100%', justifyContent: 'center' }}>
      {getRoleBasedMenus().map((menu) => (
        <Box key={menu.key}
        sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexDirection: 'row' }}
        >
          {menu.single ? (
            <Button
              size='small'
              onClick={menu.action}
              startIcon={menu.icon}
                sx={{
                  background: 'linear-gradient(135deg, #667eea60 0%, #764ba246 100%)',
                  color: '#000000ff',
                  textTransform: 'none',
                  boxShadow: '0 0 5px #745ba7',
                  px: 1,
                  py: 1,
                  ml: 1,
                  borderRadius: 2,
                  '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                  transition: 'all 0.2s ease'
                }}
            >
              {menu.label}
            </Button>
          ) : (
            <>
           
              <Button
                onClick={(e) => handleMenuOpen(e, menu.key)}
                size='small'
                endIcon={<ExpandMore />}
                startIcon={menu.icon}
                sx={{
                  background: 'linear-gradient(135deg, #667eea60 0%, #764ba246 100%)',
                  color: '#000000ff',
                  textTransform: 'none',
                  boxShadow: '0 0 5px #745ba7',
                  ml: 1,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                  transition: 'all 0.2s ease'
                }}
              >
                {menu.label}
              </Button>
              <Menu
              size='small'
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
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            🏢 logo
          </Typography>
          <IconButton onClick={() => setMobileDrawerOpen(false)} size="small" >
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
            color='error'
            startIcon={<Logout />}
            onClick={onLogout}
            sx={{ mb: 2, textTransform: 'none', border:'none'}}
          >
            EXIT
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={isDarkMode ? <LightMode /> : <DarkMode />}
            onClick={toggleDarkMode}
            sx={{ minWidth: 'auto',px:2,
                                color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'15px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
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
        sx={{ minWidth: 'auto',px:2,
                                color:'#000000ff', background: '#ffffffff',boxShadow: '0 0 5px #745ba7',borderRadius:'15px', '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   }   }}
      >
        <Toolbar>
          <Container
          maxWidth="xl"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2
          }}
        >
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
                <Box sx={{ textAlign: 'right', mr: 1, display: 'flex', flexDirection: 'row-reverse', gap: 0.8, alignItems: 'center' }}>
                  <Chip
                    label={userRole}
                    color="primary"
                    size="small"
                    sx={{ mb: 0.5, textTransform: 'uppercase', fontWeight: 300 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {userName}
                  </Typography>
                </Box>
              </Box>

              {/* Theme toggle - Desktop only */}
              <Tooltip title={isDarkMode ? 'ღია თემაზე გადართვა' : 'მუქ თემაზე გადართვა'}>
                <IconButton
                  size='small'
                  onClick={toggleDarkMode}
                                                      sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.5s ease'
                                      }}
                >
                  {isDarkMode ? <LightMode /> : <DarkMode />}
                </IconButton>
              </Tooltip>

              {/* QR Scanner */}
              <Tooltip title="QR კოდის სკანერი">
                <IconButton
                  size='small'
                  onClick={() => setShowQRScanner(true)}
                                                      sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.5s ease'
                                      }}
                >
                  <QrCodeScanner />
                </IconButton>
              </Tooltip>

              {/* Logout - Desktop only */}
              <Button
                onClick={onLogout}
                variant="outlined"
                size='small'
                startIcon={<Logout />}
                                    sx={{
                                        background: '#ffffffff',
                                        color: '#000000ff',
                                        textTransform: 'none',
                                        boxShadow: '0 0 5px #745ba7',
                                        px: 1,
                                        py: 1,
                                        borderRadius: 2,
                                        '&:hover': { boxShadow: '0 0 10px #745ba7', color: '#745ba7'   } ,
                                        transition: 'all 0.5s ease'
                                      }}
              >
                EXIT
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
        </Container>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {renderMobileMenu()}

      {/* QR Scanner Modal */}
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