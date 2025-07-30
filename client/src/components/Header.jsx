
import React, { useState, useRef, useEffect } from 'react';
import './Header.css';

const Header = ({ isLoggedIn, userRole, userName, activeView, onLogout, onViewChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleViewChange = (view) => {
    onViewChange(view);
    setDropdownOpen(false);
  };

  const menuItems = [
    { key: 'exhibitions', label: 'გამოფენები' },
    { key: 'equipment', label: 'აღჭურვილობა' },
    { key: 'companies', label: 'კომპანიები' },
    { key: 'spaces', label: 'სივრცეები' }
  ];

  return (
    <header className="header">
      <div className="logo">გამოფენების პორტალი</div>
      <nav>
        {isLoggedIn ? (
          <>
            <span className="user-info">როლი: {userRole} | მომხმარებელი: {userName}</span>
            
            {/* Admin only user management button */}
            {userRole === 'admin' && (
              <button 
                onClick={() => handleViewChange('users')} 
                className={`nav-btn ${activeView === 'users' ? 'active' : ''}`}
              >
                მომხმარებლების მართვა
              </button>
            )}
            
            {/* Dropdown Menu */}
            <div className={`dropdown ${dropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
              <button onClick={toggleDropdown} className="dropdown-btn">
                პარამეტრები
              </button>
              <div className="dropdown-content">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleViewChange(item.key)}
                    className={`dropdown-item ${activeView === item.key ? 'active' : ''}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other navigation buttons */}
            <button 
              onClick={() => handleViewChange('services')} 
              className={`nav-btn ${activeView === 'services' ? 'active' : ''}`}
            >
              სერვისები
            </button>
            <button 
              onClick={() => handleViewChange('bookings')} 
              className={`nav-btn ${activeView === 'bookings' ? 'active' : ''}`}
            >
              ჯავშნები
            </button>
            <button 
              onClick={() => handleViewChange('statistics')} 
              className={`nav-btn ${activeView === 'statistics' ? 'active' : ''}`}
            >
              სტატისტიკა
            </button>
            <button onClick={onLogout} className="logout-btn">
              გასვლა
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
