import React, { useState } from 'react';
import './AuthForms.css';

const LoginForm = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        // აქ ვამოწმებთ, არსებობს თუ არა role.
        // თუ არსებობს, გადავცემთ App.jsx-ს.
        if (data.role) {
            onLoginSuccess(data.role); 
        } else {
            alert('ავტორიზაცია ვერ მოხერხდა: როლი არ მოიძებნა.');
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