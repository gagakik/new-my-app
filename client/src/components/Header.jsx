import React, { useState, useRef, useEffect } from 'react';
import './Header.css';
import UserProfile from './UserProfile';
import NotificationCenter from './NotificationCenter';
import QRScanner from './QRScanner';

const Header = ({ isLoggedIn, userRole, userName, activeView, onLogout, onViewChange, unreadCount, showNotification }) => {
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const dropdownRefs = useRef({});
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);


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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach(key => {
        if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
          setDropdownOpen(prev => ({ ...prev, [key]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (key) => {
    setDropdownOpen(prev => {
      const newState = { ...prev };
      // Close all other dropdowns
      Object.keys(newState).forEach(k => {
        if (k !== key) newState[k] = false;
      });
      // Toggle the clicked dropdown
      newState[key] = !prev[key];
      return newState;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleViewChange = (view) => {
    onViewChange(view);
    setDropdownOpen({});
  };

  const getRoleBasedMenus = () => {
    const menus = [];

    // Sales role
    if (userRole === 'sales' || userRole === 'admin') {
      menus.push({
        key: 'sales',
        label: 'Sales',
        icon: '💼',
        items: [
          { key: 'companies', label: 'კომპანიები', icon: '🏬' },
          { key: 'spaces', label: 'სივრცეები', icon: '🏠' },
          { key: 'events', label: 'ივენთები', icon: '🎪' }
        ]
      });
    }

    // Operation role
    if (userRole === 'operation' || userRole === 'admin') {
      menus.push({
        key: 'operation',
        label: 'Operation',
        icon: '⚙️',
        single: true,
        action: () => handleViewChange('equipment')
      });
    }

    // Finance role (placeholder)
    if (userRole === 'finance' || userRole === 'admin') {
      menus.push({
        key: 'finance',
        label: 'Finance',
        icon: '💰',
        items: [
          { key: 'finance-placeholder', label: 'მოსაფიქრებელია', icon: '📊' }
        ]
      });
    }

    // Marketing role (placeholder)
    if (userRole === 'marketing' || userRole === 'admin') {
      menus.push({
        key: 'marketing',
        label: 'Marketing',
        icon: '📈',
        items: [
          { key: 'marketing-placeholder', label: 'მოსაფიქრებელია', icon: '📊' }
        ]
      });
    }

    // Manager role
    if (userRole === 'manager' || userRole === 'admin') {
      menus.push({
        key: 'manager',
        label: 'Manager',
        icon: '👔',
        single: true,
        action: () => handleViewChange('exhibitions')
      });
    }

    // Profile (for all users)
    menus.push({
      key: 'profile',
      label: 'Profile',
      icon: '👤',
      single: true,
      action: () => handleViewChange('profile')
    });

    // Admin (admin only)
    if (userRole === 'admin') {
      menus.push({
        key: 'admin',
        label: 'Admin',
        icon: '⚡',
        single: true,
        action: () => handleViewChange('users')
      });
    }

    return menus;
  };

  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">🏢</span>
        <span className="logo-text">გამოფენების პორტალი</span>
      </div>

      <nav className="nav">
        {isLoggedIn ? (
          <>
            <div className="user-info desktop-only">
              <span className="user-role">{userRole}</span>
              <span className="user-name">{userName}</span>
            </div>

            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
              <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
            </button>

            <div className={`nav-menu ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <div className="mobile-user-info">
                <span className="user-role">{userRole}</span>
                <span className="user-name">{userName}</span>
              </div>

              {getRoleBasedMenus().map((menu) => (
                <div key={menu.key} className="nav-item">
                  {menu.single ? (
                    <button 
                      onClick={() => {
                        menu.action();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`nav-btn single ${activeView === menu.key ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{menu.icon}</span>
                      <span className="nav-label">{menu.label}</span>
                    </button>
                  ) : (
                    <div 
                      className={`dropdown ${dropdownOpen[menu.key] ? 'open' : ''}`} 
                      ref={el => dropdownRefs.current[menu.key] = el}
                    >
                      <button 
                        onClick={() => toggleDropdown(menu.key)} 
                        className="dropdown-btn"
                      >
                        <span className="nav-icon">{menu.icon}</span>
                        <span className="nav-label">{menu.label}</span>
                        <span className="dropdown-arrow">▼</span>
                      </button>
                      <div className="dropdown-content">
                        {menu.items.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              handleViewChange(item.key);
                              setDropdownOpen({});
                              setIsMobileMenuOpen(false);
                            }}
                            className={`dropdown-item ${activeView === item.key ? 'active' : ''}`}
                          >
                            <span className="item-icon">{item.icon}</span>
                            <span className="item-label">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={toggleDarkMode} className="theme-toggle-btn mobile-theme">
                <span className="theme-icon">{isDarkMode ? '☀️' : '🌙'}</span>
                <span className="theme-text">{isDarkMode ? 'ნათელი რეჟიმი' : 'მუქი რეჟიმი'}</span>
              </button>

              <button onClick={onLogout} className="logout-btn mobile-logout">
                <span className="logout-icon">🚪</span>
                <span className="logout-text">გასვლა</span>
              </button>
            </div>

            <button onClick={toggleDarkMode} className="theme-toggle-btn desktop-only">
              <span className="theme-icon">{isDarkMode ? '☀️' : '🌙'}</span>
            </button>

            <button 
            className="notification-btn"
            onClick={() => setShowNotifications(true)}
            title="შეტყობინებები"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <button
            className="qr-scanner-btn"
            onClick={() => setShowQRScanner(true)}
            title="QR კოდის სკანერი"
          >
            📱
          </button>


            <button onClick={onLogout} className="logout-btn desktop-only">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">გასვლა</span>
            </button>
          </>
        ) : (
          <span className="guest-info">სტუმარი</span>
        )}
      </nav>

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
    </header>
  );
};

export default Header;