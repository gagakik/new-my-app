import React from 'react';
import './Header.css';

const Header = ({ isLoggedIn, userRole, onLogout, onViewChange }) => {
  return (
    <header className="header">
      <div className="logo">პორტალი</div>
      <nav>
        {isLoggedIn ? (
          <>
            <span className="user-info">Login: {userRole}</span>
            {userRole === 'admin' && (
              <button onClick={() => onViewChange('users')} className="nav-btn">
                USER
              </button>
            )}
            <button onClick={() => onViewChange('exhibitions')} className="nav-btn">
                EXEBITION
            </button>
            <button onClick={onLogout} className="logout-btn">
              Log Out
            </button>
          </>
        ) : (
          <span className="guest-info">Guest</span>
        )}
      </nav>
    </header>
  );
};

export default Header;