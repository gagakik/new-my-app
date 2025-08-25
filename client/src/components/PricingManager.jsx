
import React, { useState, useEffect } from 'react';
import './PricingManager.css';

const PricingManager = ({ exhibitionId, showNotification }) => {
  const [pricingRules, setPricingRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'early_bird',
    discount_percentage: '',
    fixed_discount_amount: '',
    start_date: '',
    end_date: '',
    min_area_sqm: '',
    max_area_sqm: '',
    min_participants: '',
    priority: 1,
    is_active: true
  });

  const ruleTypes = [
    { value: 'early_bird', label: 'ადრეული რეგისტრაცია' },
    { value: 'volume', label: 'მოცულობითი ფასდაკლება' },
    { value: 'seasonal', label: 'სეზონური ფასდაკლება' },
    { value: 'last_minute', label: 'ბოლო წუთის ფასდაკლება' }
  ];

  useEffect(() => {
    if (exhibitionId) {
      fetchPricingRules();
    }
  }, [exhibitionId]);

  const fetchPricingRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/pricing/rules/${exhibitionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPricingRules(data);
      } else {
        throw new Error('ფასწარმოების წესების მიღება ვერ მოხერხდა');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingRule 
        ? `/api/pricing/rules/${editingRule.id}`
        : '/api/pricing/rules';
      
      const method = editingRule ? 'PUT' : 'POST';
      
      const submitData = {
        ...formData,
        exhibition_id: exhibitionId,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        fixed_discount_amount: formData.fixed_discount_amount ? parseFloat(formData.fixed_discount_amount) : null,
        min_area_sqm: formData.min_area_sqm ? parseFloat(formData.min_area_sqm) : null,
        max_area_sqm: formData.max_area_sqm ? parseFloat(formData.max_area_sqm) : null,
        min_participants: formData.min_participants ? parseInt(formData.min_participants) : null,
        priority: parseInt(formData.priority)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        fetchPricingRules();
        resetForm();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      discount_percentage: rule.discount_percentage || '',
      fixed_discount_amount: rule.fixed_discount_amount || '',
      start_date: rule.start_date ? new Date(rule.start_date).toISOString().slice(0, 16) : '',
      end_date: rule.end_date ? new Date(rule.end_date).toISOString().slice(0, 16) : '',
      min_area_sqm: rule.min_area_sqm || '',
      max_area_sqm: rule.max_area_sqm || '',
      min_participants: rule.min_participants || '',
      priority: rule.priority,
      is_active: rule.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('ნამდვილად გსურთ ამ ფასწარმოების წესის წაშლა?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/pricing/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        fetchPricingRules();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'early_bird',
      discount_percentage: '',
      fixed_discount_amount: '',
      start_date: '',
      end_date: '',
      min_area_sqm: '',
      max_area_sqm: '',
      min_participants: '',
      priority: 1,
      is_active: true
    });
    setEditingRule(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  return (
    <div className="pricing-manager">
      <div className="pricing-header">
        <h3>ფასწარმოების მართვა</h3>
        <button 
          className="add-rule-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'გაუქმება' : 'ახალი წესის დამატება'}
        </button>
      </div>

      {showForm && (
        <form className="pricing-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>წესის სახელი</label>
              <input
                type="text"
                name="rule_name"
                value={formData.rule_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>წესის ტიპი</label>
              <select
                name="rule_type"
                value={formData.rule_type}
                onChange={handleInputChange}
                required
              >
                {ruleTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ფასდაკლება (%)</label>
              <input
                type="number"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>ფიქსირებული ფასდაკლება (€)</label>
              <input
                type="number"
                name="fixed_discount_amount"
                value={formData.fixed_discount_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>დაწყების თარიღი</label>
              <input
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label>დასრულების თარიღი</label>
              <input
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>მინ. ფართობი (კვმ)</label>
              <input
                type="number"
                name="min_area_sqm"
                value={formData.min_area_sqm}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>მაქს. ფართობი (კვმ)</label>
              <input
                type="number"
                name="max_area_sqm"
                value={formData.max_area_sqm}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>მინ. მონაწილეთა რაოდენობა</label>
              <input
                type="number"
                name="min_participants"
                value={formData.min_participants}
                onChange={handleInputChange}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>პრიორიტეტი</label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                min="1"
                max="10"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              აქტიური
            </label>
          </div>

          <div className="form-actions">
            <button type="submit">
              {editingRule ? 'განახლება' : 'დამატება'}
            </button>
            <button type="button" onClick={resetForm}>
              გაუქმება
            </button>
          </div>
        </form>
      )}

      <div className="pricing-rules-list">
        {pricingRules.length === 0 ? (
          <p>ფასწარმოების წესები არ მოიძებნა</p>
        ) : (
          <table className="pricing-table">
            <thead>
              <tr>
                <th>წესის სახელი</th>
                <th>ტიპი</th>
                <th>ფასდაკლება</th>
                <th>ვადები</th>
                <th>პირობები</th>
                <th>სტატუსი</th>
                <th>მოქმედებები</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.map(rule => (
                <tr key={rule.id}>
                  <td>{rule.rule_name}</td>
                  <td>
                    {ruleTypes.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                  </td>
                  <td>
                    {rule.discount_percentage > 0 && `${rule.discount_percentage}%`}
                    {rule.fixed_discount_amount > 0 && `€${rule.fixed_discount_amount}`}
                  </td>
                  <td>
                    {rule.start_date && <div>დაწყება: {new Date(rule.start_date).toLocaleDateString('ka-GE')}</div>}
                    {rule.end_date && <div>დასრულება: {new Date(rule.end_date).toLocaleDateString('ka-GE')}</div>}
                  </td>
                  <td>
                    {rule.min_area_sqm && <div>მინ: {rule.min_area_sqm} კვმ</div>}
                    {rule.max_area_sqm && <div>მაქს: {rule.max_area_sqm} კვმ</div>}
                    {rule.min_participants && <div>მინ მონაწილეები: {rule.min_participants}</div>}
                  </td>
                  <td>
                    <span className={`status ${rule.is_active ? 'active' : 'inactive'}`}>
                      {rule.is_active ? 'აქტიური' : 'არააქტიური'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button onClick={() => handleEdit(rule)} className="edit-btn">
                        რედაქტირება
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="delete-btn">
                        წაშლა
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PricingManager;
