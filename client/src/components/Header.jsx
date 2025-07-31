
import React, { useState, useRef, useEffect } from 'react';
import './Header.css';

const Header = ({ isLoggedIn, userRole, userName, activeView, onLogout, onViewChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState({});
  const dropdownRefs = useRef({});

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
    setDropdownOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
          { key: 'spaces', label: 'სივრცეები', icon: '🏠' }
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
      items: [
        { key: 'profile-info', label: 'მომხმარებლის ინფორმაცია', icon: '📝' },
        { key: 'profile-registration', label: 'რეგისტრაციის თარიღი', icon: '📅' }
      ]
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
            <div className="user-info">
              <span className="user-role">{userRole}</span>
              <span className="user-name">{userName}</span>
            </div>
            
            <div className="nav-menu">
              {getRoleBasedMenus().map((menu) => (
                <div key={menu.key} className="nav-item">
                  {menu.single ? (
                    <button 
                      onClick={menu.action}
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
                            onClick={() => handleViewChange(item.key)}
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
            </div>

            <button onClick={onLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              <span className="logout-text">გასვლა</span>
            </button>
          </>
        ) : (
          <span className="guest-info">სტუმარი</span>
        )}
      </nav>
    </header>
  );
};

export default Header;
