import React from 'react';
import './Header.css';

const Header = ({ isLoggedIn, userRole, userName, onLogout, onViewChange }) => { // დავამატეთ userName
  return (
    <header className="header">
      <div className="logo">გამოფენების პორტალი</div>
      <nav>
        {isLoggedIn ? (
          <>
            <span className="user-info">როლი: {userRole} | მომხმარებელი: {userName}</span> {/* დავამატეთ userName */}
            {userRole === 'admin' && (
              <button onClick={() => onViewChange('users')} className="nav-btn">
                მომხმარებლების მართვა
              </button>
            )}
            <button onClick={() => onViewChange('exhibitions')} className="nav-btn">
                გამოფენები
            </button>
            <button onClick={() => onViewChange('equipment')} className="nav-btn"> {/* ახალი ღილაკი */}
                აღჭურვილობა
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
