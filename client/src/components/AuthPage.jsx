import React, { useState } from 'react';
import './AuthForms.css';

const AuthPage = ({ onLoginSuccess, showNotification }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? 'login' : 'register';
    const response = await fetch(`${window.location.origin}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      if (isLoginView) {
        showNotification(data.message, 'success');
        onLoginSuccess(data.role, data.token, data.userId, data.username); // გადავეცით userId და username
      } else {
        showNotification('რეგისტრაცია წარმატებით დასრულდა. გთხოვთ, შეხვიდეთ სისტემაში.', 'success');
        setIsLoginView(true);
      }
    } else {
      showNotification(data.message, 'error');
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLoginView ? 'შესვლა' : 'რეგისტრაცია'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">მომხმარებლის სახელი:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">პაროლი:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="auth-btn">
          {isLoginView ? 'შესვლა' : 'რეგისტრაცია'}
        </button>
      </form>
      <button onClick={() => setIsLoginView(!isLoginView)} className="toggle-btn">
        {isLoginView ? 'არ გაქვთ ანგარიში? შექმენით!' : 'უკვე გაქვთ ანგარიში? შედით!'}
      </button>
    </div>
  );
};

export default AuthPage;