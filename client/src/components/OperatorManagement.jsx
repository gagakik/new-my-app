
import React, { useState, useEffect } from 'react';
import './OperatorManagement.css';

const OperatorManagement = ({ showNotification, userRole }) => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'operator',
    status: 'active'
  });

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/operators', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOperators(data);
      } else {
        throw new Error('ოპერატორების ჩამოტვირთვის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const method = editingOperator ? 'PUT' : 'POST';
      const url = editingOperator ? `/api/operators/${editingOperator.id}` : '/api/operators';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification(
          editingOperator ? 'ოპერატორი განახლებულია' : 'ოპერატორი დამატებულია',
          'success'
        );
        setShowForm(false);
        setEditingOperator(null);
        setFormData({ name: '', email: '', phone: '', role: 'operator', status: 'active' });
        fetchOperators();
      } else {
        throw new Error('ოპერატორის შენახვის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const handleEdit = (operator) => {
    setEditingOperator(operator);
    setFormData({
      name: operator.name,
      email: operator.email,
      phone: operator.phone,
      role: operator.role,
      status: operator.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('დარწმუნებული ხართ, რომ გსურთ ამ ოპერატორის წაშლა?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/operators/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('ოპერატორი წაშლილია', 'success');
        fetchOperators();
      } else {
        throw new Error('ოპერატორის წაშლის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOperator(null);
    setFormData({ name: '', email: '', phone: '', role: 'operator', status: 'active' });
  };

  return (
    <div className="operator-management">
      <div className="operator-header">
        <h2>ოპერატორების მართვა</h2>
        <button 
          className="add-operator-btn"
          onClick={() => setShowForm(true)}
        >
          + ახალი ოპერატორი
        </button>
      </div>

      {showForm && (
        <div className="operator-form-modal">
          <div className="operator-form">
            <h3>{editingOperator ? 'ოპერატორის რედაქტირება' : 'ახალი ოპერატორის დამატება'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>სახელი</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>ელ. ფოსტა</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>ტელეფონი</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>როლი</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="operator">ოპერატორი</option>
                  <option value="supervisor">ზედამხედველი</option>
                </select>
              </div>
              <div className="form-group">
                <label>სტატუსი</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">აქტიური</option>
                  <option value="inactive">არააქტიური</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingOperator ? 'განახლება' : 'დამატება'}
                </button>
                <button type="button" className="cancel-btn" onClick={resetForm}>
                  გაუქმება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">იტვირთება...</div>
      ) : (
        <div className="operators-list">
          {operators.length === 0 ? (
            <div className="no-operators">
              <p>ოპერატორები არ მოიძებნა</p>
            </div>
          ) : (
            <div className="operators-grid">
              {operators.map(operator => (
                <div key={operator.id} className="operator-card">
                  <div className="operator-info">
                    <h3>{operator.name}</h3>
                    <p className="operator-email">{operator.email}</p>
                    <p className="operator-phone">{operator.phone}</p>
                    <div className="operator-meta">
                      <span className={`operator-role ${operator.role}`}>
                        {operator.role === 'operator' ? 'ოპერატორი' : 'ზედამხედველი'}
                      </span>
                      <span className={`operator-status ${operator.status}`}>
                        {operator.status === 'active' ? 'აქტიური' : 'არააქტიური'}
                      </span>
                    </div>
                  </div>
                  <div className="operator-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(operator)}
                      title="რედაქტირება"
                    >
                      ✏️
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(operator.id)}
                      title="წაშლა"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OperatorManagement;
