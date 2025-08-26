
import React, { useState, useEffect, useCallback } from 'react';
import './OperationalIntegratedView.css';

const OperationalIntegratedView = ({ showNotification, userRole }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [operators, setOperators] = useState([]);
  const [stands, setStands] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWorkHourForm, setShowWorkHourForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [workHourForm, setWorkHourForm] = useState({
    operator_id: '',
    stand_id: '',
    project_name: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    hourly_rate: '',
    description: ''
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch operators
      const operatorsResponse = await fetch('/api/operators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (operatorsResponse.ok) {
        const operatorsData = await operatorsResponse.json();
        setOperators(operatorsData);
      }

      // Fetch stands
      const standsResponse = await fetch('/api/stands', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (standsResponse.ok) {
        const standsData = await standsResponse.json();
        setStands(standsData);
      }

      // Fetch work hours
      const workHoursResponse = await fetch('/api/payroll/work-hours', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (workHoursResponse.ok) {
        const workHoursData = await workHoursResponse.json();
        setWorkHours(workHoursData);
      }

    } catch (error) {
      console.error('მონაცემების ჩამოტვირთვის შეცდომა:', error);
      showNotification('მონაცემების ჩამოტვირთვის შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // სამუშაო საათების დამატება
  const handleWorkHourSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payroll/work-hours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workHourForm)
      });

      if (response.ok) {
        showNotification('სამუშაო საათები დამატებულია', 'success');
        setShowWorkHourForm(false);
        setWorkHourForm({
          operator_id: '',
          stand_id: '',
          project_name: '',
          date: new Date().toISOString().split('T')[0],
          hours_worked: '',
          hourly_rate: '',
          description: ''
        });
        fetchData();
      } else {
        throw new Error('სამუშაო საათების დამატების შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  // ანაზღაურების გამოთვლა
  const calculatePayroll = async (periodId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/payroll/calculate-payroll/${periodId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayrollData(data);
        showNotification('ანაზღაურება გამოთვლილია', 'success');
      } else {
        throw new Error('ანაზღაურების გამოთვლის შეცდომა');
      }
    } catch (error) {
      showNotification(`შეცდომა: ${error.message}`, 'error');
    }
  };

  // Statistics calculations
  const calculateStats = () => {
    const totalOperators = operators.length;
    const activeOperators = operators.filter(op => op.status === 'active').length;
    const totalStands = stands.length;
    const occupiedStands = stands.filter(stand => stand.status === 'occupied').length;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyHours = workHours.filter(wh => {
      const workDate = new Date(wh.date);
      return workDate.getMonth() === currentMonth && workDate.getFullYear() === currentYear;
    });
    
    const totalMonthlyHours = monthlyHours.reduce((sum, wh) => sum + parseFloat(wh.hours_worked || 0), 0);
    const totalMonthlyEarnings = monthlyHours.reduce((sum, wh) => sum + parseFloat(wh.total_amount || 0), 0);

    return {
      totalOperators,
      activeOperators,
      totalStands,
      occupiedStands,
      totalMonthlyHours: totalMonthlyHours.toFixed(1),
      totalMonthlyEarnings: totalMonthlyEarnings.toFixed(2)
    };
  };

  const stats = calculateStats();

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  return (
    <div className="operational-integrated-view">
      <div className="view-header">
        <h1>📊 ინტეგრირებული ოპერაციული ხედვა</h1>
        <div className="view-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            მიმოხილვა
          </button>
          <button 
            className={`tab-btn ${activeTab === 'operators' ? 'active' : ''}`}
            onClick={() => setActiveTab('operators')}
          >
            ოპერატორები
          </button>
          <button 
            className={`tab-btn ${activeTab === 'work-hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('work-hours')}
          >
            სამუშაო საათები
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            ანაზღაურება
          </button>
        </div>
      </div>

      {/* მიმოხილვა ტაბი */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-number">{stats.activeOperators}/{stats.totalOperators}</div>
                <div className="stat-label">აქტიური ოპერატორები</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🏗️</div>
              <div className="stat-info">
                <div className="stat-number">{stats.occupiedStands}/{stats.totalStands}</div>
                <div className="stat-label">დაკავებული სტენდები</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <div className="stat-number">{stats.totalMonthlyHours}</div>
                <div className="stat-label">საათები ამ თვეში</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-number">{stats.totalMonthlyEarnings} ₾</div>
                <div className="stat-label">შემოსავალი ამ თვეში</div>
              </div>
            </div>
          </div>

          <div className="recent-activity">
            <h3>ბოლო აქტივობები</h3>
            <div className="activity-list">
              {workHours.slice(0, 5).map(wh => (
                <div key={wh.id} className="activity-item">
                  <div className="activity-info">
                    <span className="operator-name">{wh.operator_name}</span>
                    <span className="activity-desc">
                      {wh.hours_worked} საათი - {wh.project_name || wh.stand_name}
                    </span>
                  </div>
                  <div className="activity-amount">{wh.total_amount} ₾</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* სამუშაო საათების ტაბი */}
      {activeTab === 'work-hours' && (
        <div className="work-hours-section">
          <div className="section-header">
            <h2>⏰ სამუშაო საათების მართვა</h2>
            <button 
              className="add-btn"
              onClick={() => setShowWorkHourForm(true)}
            >
              + საათების დამატება
            </button>
          </div>

          {showWorkHourForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>სამუშაო საათების დამატება</h3>
                  <button 
                    className="close-btn"
                    onClick={() => setShowWorkHourForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleWorkHourSubmit} className="work-hour-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>ოპერატორი</label>
                      <select
                        value={workHourForm.operator_id}
                        onChange={(e) => setWorkHourForm({...workHourForm, operator_id: e.target.value})}
                        required
                      >
                        <option value="">აირჩიეთ ოპერატორი</option>
                        {operators.map(op => (
                          <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>სტენდი</label>
                      <select
                        value={workHourForm.stand_id}
                        onChange={(e) => setWorkHourForm({...workHourForm, stand_id: e.target.value})}
                      >
                        <option value="">აირჩიეთ სტენდი</option>
                        {stands.map(stand => (
                          <option key={stand.id} value={stand.id}>{stand.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>პროექტის სახელწოდება</label>
                      <input
                        type="text"
                        value={workHourForm.project_name}
                        onChange={(e) => setWorkHourForm({...workHourForm, project_name: e.target.value})}
                        placeholder="პროექტის სახელწოდება"
                      />
                    </div>

                    <div className="form-group">
                      <label>თარიღი</label>
                      <input
                        type="date"
                        value={workHourForm.date}
                        onChange={(e) => setWorkHourForm({...workHourForm, date: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>სამუშაო საათები</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={workHourForm.hours_worked}
                        onChange={(e) => setWorkHourForm({...workHourForm, hours_worked: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>საათობრივი ღირებულება (₾)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={workHourForm.hourly_rate}
                        onChange={(e) => setWorkHourForm({...workHourForm, hourly_rate: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>აღწერა</label>
                      <textarea
                        value={workHourForm.description}
                        onChange={(e) => setWorkHourForm({...workHourForm, description: e.target.value})}
                        placeholder="სამუშაოს აღწერა..."
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-btn">შენახვა</button>
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowWorkHourForm(false)}
                    >
                      გაუქმება
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="work-hours-table">
            <div className="table-header">
              <div className="header-cell">ოპერატორი</div>
              <div className="header-cell">თარიღი</div>
              <div className="header-cell">საათები</div>
              <div className="header-cell">პროექტი/სტენდი</div>
              <div className="header-cell">საათობრივი ღირებულება</div>
              <div className="header-cell">ჯამი</div>
              <div className="header-cell">სტატუსი</div>
              <div className="header-cell">მოქმედებები</div>
            </div>
            
            {workHours.map(wh => (
              <div key={wh.id} className="table-row">
                <div className="table-cell">{wh.operator_name}</div>
                <div className="table-cell">{new Date(wh.date).toLocaleDateString('ka-GE')}</div>
                <div className="table-cell">{wh.hours_worked}</div>
                <div className="table-cell">{wh.project_name || wh.stand_name}</div>
                <div className="table-cell">{wh.hourly_rate} ₾</div>
                <div className="table-cell">{wh.total_amount} ₾</div>
                <div className="table-cell">
                  <span className={`status-badge ${wh.status}`}>
                    {wh.status === 'pending' ? 'მოლოდინში' : 
                     wh.status === 'approved' ? 'დამტკიცებული' : 'უარყოფილი'}
                  </span>
                </div>
                <div className="table-cell">
                  <button className="btn-approve">✓</button>
                  <button className="btn-reject">✗</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ანაზღაურების ტაბი */}
      {activeTab === 'payroll' && (
        <div className="payroll-section">
          <div className="section-header">
            <h2>💰 ანაზღაურების მართვა</h2>
            <button 
              className="add-btn"
              onClick={() => setShowPayrollForm(true)}
            >
              + პერიოდის შექმნა
            </button>
          </div>

          <div className="payroll-summary">
            <div className="summary-cards">
              <div className="summary-card">
                <h4>მიმდინარე თვე</h4>
                <div className="summary-value">{stats.totalMonthlyEarnings} ₾</div>
                <div className="summary-detail">{stats.totalMonthlyHours} საათი</div>
              </div>
              
              <div className="summary-card">
                <h4>საშუალო საათობრივი</h4>
                <div className="summary-value">
                  {workHours.length > 0 
                    ? (parseFloat(stats.totalMonthlyEarnings) / parseFloat(stats.totalMonthlyHours)).toFixed(2)
                    : 0
                  } ₾
                </div>
                <div className="summary-detail">საშუალო განაკვეთი</div>
              </div>
            </div>
          </div>

          {payrollData && (
            <div className="payroll-results">
              <h3>ანაზღაურების შედეგები - {payrollData.period.period_name}</h3>
              <div className="payroll-operators">
                {payrollData.operators.map(op => (
                  <div key={op.operator_id} className="payroll-operator-card">
                    <div className="operator-payroll-info">
                      <h4>{op.operator_name}</h4>
                      <div className="payroll-details">
                        <span>საათები: {op.total_hours}</span>
                        <span>განაკვეთი: {op.avg_hourly_rate} ₾</span>
                        <span className="total-amount">ჯამი: {op.total_amount} ₾</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="payroll-total">
                <h3>მთლიანი ანაზღაურება: {payrollData.totalPayroll} ₾</h3>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OperationalIntegratedView;
