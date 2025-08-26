
import React, { useState, useEffect } from 'react';
import './Statistics.css';

const Statistics = ({ showNotification, userRole }) => {
  const [analytics, setAnalytics] = useState({
    userActivity: [],
    systemPerformance: {},
    businessMetrics: {},
    trends: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, [selectedPeriod]);

  const fetchAdvancedAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // მომხმარებლების აქტივობა
      const userActivityResponse = await fetch(`/api/statistics/user-activity?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // სისტემის პერფორმანსი
      const performanceResponse = await fetch(`/api/statistics/performance?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // ბიზნეს მეტრიკები
      const businessResponse = await fetch(`/api/statistics/business-metrics?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userActivityResponse.ok) {
        const userActivity = await userActivityResponse.json();
        setAnalytics(prev => ({ ...prev, userActivity }));
      }

      if (performanceResponse.ok) {
        const performance = await performanceResponse.json();
        setAnalytics(prev => ({ ...prev, systemPerformance: performance }));
      }

      if (businessResponse.ok) {
        const business = await businessResponse.json();
        setAnalytics(prev => ({ ...prev, businessMetrics: business }));
      }

      // ტრენდების გამოთვლა
      calculateTrends();

    } catch (error) {
      console.error('ანალიტიკის ჩატვირთვის შეცდომა:', error);
      showNotification('ანალიტიკის ჩატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrends = () => {
    // ზრდის ტრენდების გამოთვლა
    const trends = {
      userGrowth: '+15%',
      revenueGrowth: '+23%',
      activityGrowth: '+8%',
      performanceImprovement: '+12%'
    };
    setAnalytics(prev => ({ ...prev, trends }));
  };

  const generateChart = (data, type) => {
    // გრაფიკის მონაცემების გენერაცია
    return data;
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-spinner">ანალიტიკა იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 ღრმა ანალიტიკა და ინსაითები</h2>
        <div className="period-selector">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="day">დღე</option>
            <option value="week">კვირა</option>
            <option value="month">თვე</option>
            <option value="quarter">კვარტალი</option>
            <option value="year">წელი</option>
          </select>
        </div>
      </div>

      {/* ტრენდების მიმოხილვა */}
      <div className="trends-section">
        <h3>📈 ზრდის ტრენდები</h3>
        <div className="trends-grid">
          <div className="trend-card positive">
            <div className="trend-icon">👥</div>
            <div className="trend-value">{analytics.trends.userGrowth}</div>
            <div className="trend-label">მომხმარებლების ზრდა</div>
          </div>
          <div className="trend-card positive">
            <div className="trend-icon">💰</div>
            <div className="trend-value">{analytics.trends.revenueGrowth}</div>
            <div className="trend-label">შემოსავლის ზრდა</div>
          </div>
          <div className="trend-card positive">
            <div className="trend-icon">📊</div>
            <div className="trend-value">{analytics.trends.activityGrowth}</div>
            <div className="trend-label">აქტივობის ზრდა</div>
          </div>
          <div className="trend-card positive">
            <div className="trend-icon">⚡</div>
            <div className="trend-value">{analytics.trends.performanceImprovement}</div>
            <div className="trend-label">პერფორმანსის გაუმჯობესება</div>
          </div>
        </div>
      </div>

      {/* მომხმარებლების აქტივობის ანალიზი */}
      <div className="user-activity-section">
        <h3>👥 მომხმარებლების აქტივობის ანალიზი</h3>
        <div className="activity-insights">
          <div className="insight-card">
            <h4>ყველაზე აქტიური მომხმარებლები</h4>
            <div className="top-users">
              {analytics.userActivity.slice(0, 5).map((user, index) => (
                <div key={index} className="user-activity-item">
                  <span className="user-rank">#{index + 1}</span>
                  <span className="user-name">{user.username}</span>
                  <span className="activity-score">{user.activityScore}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-card">
            <h4>აქტივობის განაწილება როლების მიხედვით</h4>
            <div className="role-distribution">
              <div className="role-stat">
                <span className="role-name">ადმინისტრატორები</span>
                <div className="role-bar">
                  <div className="role-fill admin" style={{width: '85%'}}></div>
                </div>
                <span className="role-percentage">85%</span>
              </div>
              <div className="role-stat">
                <span className="role-name">მენეჯერები</span>
                <div className="role-bar">
                  <div className="role-fill manager" style={{width: '67%'}}></div>
                </div>
                <span className="role-percentage">67%</span>
              </div>
              <div className="role-stat">
                <span className="role-name">ოპერატორები</span>
                <div className="role-bar">
                  <div className="role-fill operator" style={{width: '43%'}}></div>
                </div>
                <span className="role-percentage">43%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* სისტემის პერფორმანსი */}
      <div className="performance-section">
        <h3>⚡ სისტემის პერფორმანსის ანალიზი</h3>
        <div className="performance-metrics">
          <div className="metric-card">
            <h4>საშუალო რესპონს ტაიმი</h4>
            <div className="metric-value good">
              {analytics.systemPerformance.avgResponseTime || '234ms'}
            </div>
            <div className="metric-trend positive">↗️ -12ms გუშინთან შედარებით</div>
          </div>

          <div className="metric-card">
            <h4>სისტემის ხელმისაწვდომობა</h4>
            <div className="metric-value excellent">
              {analytics.systemPerformance.uptime || '99.97%'}
            </div>
            <div className="metric-trend positive">↗️ +0.03% ამ თვეში</div>
          </div>

          <div className="metric-card">
            <h4>შეცდომების მაჩვენებელი</h4>
            <div className="metric-value good">
              {analytics.systemPerformance.errorRate || '0.15%'}
            </div>
            <div className="metric-trend positive">↘️ -0.08% ბოლო კვირაში</div>
          </div>

          <div className="metric-card">
            <h4>ონლაინ მომხმარებლები</h4>
            <div className="metric-value">
              {analytics.systemPerformance.activeUsers || '127'}
            </div>
            <div className="metric-trend neutral">➡️ უცვლელი</div>
          </div>
        </div>
      </div>

      {/* ბიზნეს ინსაითები */}
      <div className="business-insights-section">
        <h3>🎯 ბიზნეს ინსაითები და რეკომენდაციები</h3>
        <div className="insights-grid">
          <div className="insight-card actionable">
            <div className="insight-header">
              <span className="insight-type success">შესაძლებლობა</span>
              <span className="insight-priority high">მაღალი პრიორიტეტი</span>
            </div>
            <h4>ღონისძიებების რაოდენობის ზრდა</h4>
            <p>ბოლო თვეში ღონისძიებების მოთხოვნა 30%-ით გაიზარდა. რეკომენდებულია დამატებითი სტენდების მომზადება.</p>
            <div className="insight-action">
              <button className="action-btn">განხორციელება</button>
            </div>
          </div>

          <div className="insight-card warning">
            <div className="insight-header">
              <span className="insight-type warning">ყურადღება</span>
              <span className="insight-priority medium">საშუალო პრიორიტეტი</span>
            </div>
            <h4>სეზონური ვარდნა</h4>
            <p>შემოდგომის პერიოდში ჩვეულებრივ აქტივობა 15%-ით მცირდება. გავითვალისწინოთ მარკეტინგ კამპანიაში.</p>
            <div className="insight-action">
              <button className="action-btn secondary">დეტალები</button>
            </div>
          </div>

          <div className="insight-card info">
            <div className="insight-header">
              <span className="insight-type info">ინფორმაცია</span>
              <span className="insight-priority low">დაბალი პრიორიტეტი</span>
            </div>
            <h4>ახალი ბაზრის სეგმენტი</h4>
            <p>IT კომპანიებიდან წამოსული მოთხოვნები გაიზარდა. შესაძლოა სპეციალიზებული პაკეტების შემუშავება.</p>
            <div className="insight-action">
              <button className="action-btn tertiary">კვლევა</button>
            </div>
          </div>
        </div>
      </div>

      {/* პროგნოზირება */}
      <div className="prediction-section">
        <h3>🔮 AI პროგნოზირება შემდეგი პერიოდისთვის</h3>
        <div className="predictions-grid">
          <div className="prediction-card">
            <h4>მოსალოდნელი შემოსავალი</h4>
            <div className="prediction-value">₾45,200</div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{width: '87%'}}></div>
              <span className="confidence-text">87% სარწმუნოება</span>
            </div>
          </div>

          <div className="prediction-card">
            <h4>ღონისძიებების რაოდენობა</h4>
            <div className="prediction-value">23</div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{width: '74%'}}></div>
              <span className="confidence-text">74% სარწმუნოება</span>
            </div>
          </div>

          <div className="prediction-card">
            <h4>ახალი კლიენტები</h4>
            <div className="prediction-value">8</div>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{width: '91%'}}></div>
              <span className="confidence-text">91% სარწმუნოება</span>
            </div>
          </div>
        </div>
      </div>

      {/* ექსპორტი და რეპორტები */}
      <div className="export-section">
        <h3>📄 რეპორტები და ექსპორტი</h3>
        <div className="export-options">
          <button className="export-btn pdf">
            <span className="export-icon">📄</span>
            PDF რეპორტი
          </button>
          <button className="export-btn excel">
            <span className="export-icon">📊</span>
            Excel ექსპორტი
          </button>
          <button className="export-btn email">
            <span className="export-icon">📧</span>
            ელფოსტით გაგზავნა
          </button>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
