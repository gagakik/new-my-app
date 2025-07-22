import React from 'react';
import './Header.css';

const Header = ({ isLoggedIn, userRole, onLogout, onViewChange }) => {
  return (
    <header className="header">
      <div className="logo">გამოფენების პორტალი</div>
      <nav>
        {isLoggedIn ? (
          <>
            <span className="user-info">შესული ხართ როგორც: {userRole}</span>
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
