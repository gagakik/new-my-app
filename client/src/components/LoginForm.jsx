import React, { useState } from 'react';
import './AuthForms.css';

const LoginForm = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // ტოკენისა და მომხმარებლის მონაცემების შენახვა
        if (data.token && data.role && data.userId && data.username) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userName', data.username);
            
            // გადავცემთ ყველა საჭირო პარამეტრი App.jsx-ს
            onLoginSuccess(data.role, data.token, data.userId, data.username);
            alert(data.message);
        } else {
            alert('ავტორიზაცია ვერ მოხერხდა: მონაცემები არასრულია.');
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('შეცდომა ავტორიზაციისას:', error);
      alert('დაფიქსირდა შეცდომა სერვერთან კავშირისას.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>სახელი</label>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
      </div>
      <div className="form-group">
        <label>პაროლი</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
      </div>
      <button type="submit">შესვლა</button>
    </form>
  );
};

export default LoginForm;