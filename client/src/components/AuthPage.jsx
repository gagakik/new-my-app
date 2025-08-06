import React, { useState } from 'react';
import './AuthForms.css';

const AuthPage = ({ onLoginSuccess, showNotification }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginView ? 'login' : 'register';
    
    console.log('Sending request to:', `/api/${endpoint}`);
    console.log('Request data:', { username, password: '*'.repeat(password.length) });
    
    // Validation
    if (!username.trim() || !password.trim()) {
      showNotification('მომხმარებლის სახელი და პაროლი აუცილებელია', 'error');
      return;
    }

    if (!isLoginView && password.length < 6) {
      showNotification('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო', 'error');
      return;
    }
    
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        if (isLoginView) {
          showNotification(data.message, 'success');
          onLoginSuccess(data.role, data.token, data.userId, data.username);
        } else {
          showNotification('რეგისტრაცია წარმატებით დასრულდა. გთხოვთ, შეხვიდეთ სისტემაში.', 'success');
          setIsLoginView(true);
          setUsername('');
          setPassword('');
        }
      } else {
        showNotification(data.message || 'შეცდომა დაფიქსირდა', 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showNotification('ქსელის შეცდომა. გთხოვთ, შეამოწმოთ ინტერნეტ კავშირი.', 'error');
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