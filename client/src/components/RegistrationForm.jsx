import React, { useState } from 'react';
import './AuthForms.css';

const RegistrationForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('პაროლები არ ემთხვევა!');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('სერვერის პასუხი:', data);

      if (response.ok) {
        alert('რეგისტრაცია წარმატებით დასრულდა!');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      } else {
        alert('რეგისტრაცია ვერ მოხერხდა.');
      }
    } catch (error) {
      console.error('შეცდომა რეგისტრაციისას:', error);
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
      <div className="form-group">
        <label>გაიმეორეთ პაროლი</label>
        <input 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
        />
      </div>
      <button type="submit">რეგისტრაცია</button>
    </form>
  );
};

export default RegistrationForm;