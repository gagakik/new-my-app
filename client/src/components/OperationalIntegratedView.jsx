
import React, { useState, useEffect, useCallback } from 'react';
import './OperationalIntegratedView.css';

const OperationalIntegratedView = ({ showNotification, userRole }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [operators, setOperators] = useState([]);
  const [stands, setStands] = useState([]);
  const [workHours, setWorkHours] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

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

    } catch (error) {
      console.error('Error fetching data:', error);
      // Mock data for development
      setOperators([
        {
          id: 1,
          name: 'გიორგი თავართქილაძე',
          specialization: 'კონსტრუქცია',
          hourly_rate: 25.00,
          rating: 4.8,
          availability: 'available',
          current_project: 'სტენდი A-001',
          hours_this_week: 32,
          total_earned: 1240.50
        },
        {
          id: 2,
          name: 'ნინო ღუდუშაური',
          specialization: 'ელექტროობა',
          hourly_rate: 30.00,
          rating: 4.6,
          availability: 'busy',
          current_project: 'სტენდი B-002',
          hours_this_week: 28,
          total_earned: 980.75
        }
      ]);

      setStands([
        {
          id: 1,
          stand_number: 'A-001',
          company_name: 'ავტო კომპანია #1',
          status: 'in_progress',
          assigned_operator: 'გიორგი თავართქილაძე',
          progress: 65,
          deadline: '2024-02-14',
          estimated_hours: 40,
          actual_hours: 26,
          budget: 1000,
          spent: 650
        },
        {
          id: 2,
          stand_number: 'B-002',
          company_name: 'ტექნო კომპანია #2',
          status: 'assembly_complete',
          assigned_operator: 'ნინო ღუდუშაური',
          progress: 90,
          deadline: '2024-02-13',
          estimated_hours: 35,
          actual_hours: 32,
          budget: 1200,
          spent: 960
        }
      ]);

      setWorkHours([
        {
          id: 1,
          operator_name: 'გიორგი თავართქილაძე',
          date: '2024-02-10',
          hours: 8,
          project: 'სტენდი A-001',
          rate: 25.00,
          total: 200.00,
          status: 'approved'
        },
        {
          id: 2,
          operator_name: 'ნინო ღუდუშაური',
          date: '2024-02-10',
          hours: 7,
          project: 'სტენდი B-002',
          rate: 30.00,
          total: 210.00,
          status: 'pending'
        }
      ]);

      setProjects([
        {
          id: 1,
          name: 'სტენდი A-001',
          status: 'active',
          operators: ['გიორგი თავართქილაძე'],
          total_hours: 26,
          budget: 1000,
          spent: 650,
          completion: 65,
          deadline: '2024-02-14'
        },
        {
          id: 2,
          name: 'სტენდი B-002',
          status: 'finishing',
          operators: ['ნინო ღუდუშაური'],
          total_hours: 32,
          budget: 1200,
          spent: 960,
          completion: 90,
          deadline: '2024-02-13'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateTotalBudget = () => {
    return projects.reduce((sum, project) => sum + project.budget, 0);
  };

  const calculateTotalSpent = () => {
    return projects.reduce((sum, project) => sum + project.spent, 0);
  };

  const calculateAverageProgress = () => {
    if (projects.length === 0) return 0;
    return projects.reduce((sum, project) => sum + project.completion, 0) / projects.length;
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': '#ffc107',
      'finishing': '#28a745',
      'completed': '#17a2b8',
      'delayed': '#dc3545',
      'pending': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getAvailabilityColor = (availability) => {
    const colors = {
      'available': '#28a745',
      'busy': '#ffc107',
      'unavailable': '#dc3545'
    };
    return colors[availability] || '#6c757d';
  };

  if (loading) {
    return <div className="loading">იტვირთება...</div>;
  }

  return (
    <div className="operational-integrated-view">
      <div className="header-section">
        <div className="header-content">
          <h1>🔗 საოპერაციო ინტეგრირებული ხედვა</h1>
          <p>ოპერატორების, სტენდების და პროექტების ერთიანი მართვა</p>
        </div>
      </div>

      {/* ტაბები */}
      <div className="tabs-section">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 მიმოხილვა
          </button>
          <button 
            className={`tab ${activeTab === 'operators' ? 'active' : ''}`}
            onClick={() => setActiveTab('operators')}
          >
            👷 ოპერატორები
          </button>
          <button 
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            🏗️ პროექტები
          </button>
          <button 
            className={`tab ${activeTab === 'hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('hours')}
          >
            ⏰ მუშაობის საათები
          </button>
          <button 
            className={`tab ${activeTab === 'finances' ? 'active' : ''}`}
            onClick={() => setActiveTab('finances')}
          >
            💰 ფინანსები
          </button>
        </div>
      </div>

      {/* მიმოხილვის ტაბი */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👷</div>
              <div className="stat-info">
                <div className="stat-number">{operators.length}</div>
                <div className="stat-label">ოპერატორები</div>
                <div className="stat-detail">{operators.filter(op => op.availability === 'available').length} ხელმისაწვდომი</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🏗️</div>
              <div className="stat-info">
                <div className="stat-number">{projects.length}</div>
                <div className="stat-label">აქტიური პროექტები</div>
                <div className="stat-detail">{Math.round(calculateAverageProgress())}% საშუალო პროგრესი</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-number">{calculateTotalBudget().toFixed(0)} ₾</div>
                <div className="stat-label">სულ ბიუჯეტი</div>
                <div className="stat-detail">{calculateTotalSpent().toFixed(0)} ₾ გახარჯული</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-info">
                <div className="stat-number">{operators.reduce((sum, op) => sum + (op.hours_this_week || 0), 0)}</div>
                <div className="stat-label">საათები ამ კვირაში</div>
                <div className="stat-detail">ყველა ოპერატორი</div>
              </div>
            </div>
          </div>

          {/* აქტიური პროექტები */}
          <div className="section">
            <h2>🏗️ აქტიური პროექტები</h2>
            <div className="projects-overview">
              {projects.map(project => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    >
                      {project.status}
                    </div>
                  </div>
                  
                  <div className="project-progress">
                    <div className="progress-info">
                      <span>პროგრესი: {project.completion}%</span>
                      <span>ვადა: {new Date(project.deadline).toLocaleDateString('ka-GE')}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${project.completion}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="project-details">
                    <div className="detail-item">
                      <span>ოპერატორები:</span>
                      <span>{project.operators.join(', ')}</span>
                    </div>
                    <div className="detail-item">
                      <span>ბიუჯეტი:</span>
                      <span>{project.budget} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>გახარჯული:</span>
                      <span>{project.spent} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>სულ საათები:</span>
                      <span>{project.total_hours}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ოპერატორების მდგომარეობა */}
          <div className="section">
            <h2>👷 ოპერატორების მდგომარეობა</h2>
            <div className="operators-status">
              {operators.map(operator => (
                <div key={operator.id} className="operator-status-card">
                  <div className="operator-header">
                    <h4>{operator.name}</h4>
                    <div 
                      className="availability-badge"
                      style={{ backgroundColor: getAvailabilityColor(operator.availability) }}
                    >
                      {operator.availability}
                    </div>
                  </div>
                  
                  <div className="operator-info">
                    <div className="info-item">
                      <span>⭐ რეიტინგი:</span>
                      <span>{operator.rating}</span>
                    </div>
                    <div className="info-item">
                      <span>🏗️ მიმდინარე პროექტი:</span>
                      <span>{operator.current_project || 'არ არის'}</span>
                    </div>
                    <div className="info-item">
                      <span>⏰ კვირის საათები:</span>
                      <span>{operator.hours_this_week || 0}</span>
                    </div>
                    <div className="info-item">
                      <span>💰 შემოსავალი:</span>
                      <span>{operator.total_earned?.toFixed(2) || 0} ₾</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ოპერატორების ტაბი */}
      {activeTab === 'operators' && (
        <div className="operators-section">
          <h2>👷 ოპერატორების დეტალური ხედვა</h2>
          <div className="operators-detailed">
            {operators.map(operator => (
              <div key={operator.id} className="operator-detailed-card">
                <div className="operator-info-header">
                  <h3>{operator.name}</h3>
                  <div className="operator-ratings">
                    <span className="rating">⭐ {operator.rating}</span>
                    <span 
                      className="availability"
                      style={{ backgroundColor: getAvailabilityColor(operator.availability) }}
                    >
                      {operator.availability}
                    </span>
                  </div>
                </div>

                <div className="operator-details-grid">
                  <div className="detail-section">
                    <h4>პროფესიული ინფორმაცია</h4>
                    <div className="detail-item">
                      <span>სპეციალიზაცია:</span>
                      <span>{operator.specialization}</span>
                    </div>
                    <div className="detail-item">
                      <span>საათობრივი ღირებულება:</span>
                      <span>{operator.hourly_rate} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>მიმდინარე პროექტი:</span>
                      <span>{operator.current_project || 'არ არის'}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>მუშაობის სტატისტიკა</h4>
                    <div className="detail-item">
                      <span>კვირის საათები:</span>
                      <span>{operator.hours_this_week || 0}</span>
                    </div>
                    <div className="detail-item">
                      <span>კვირის შემოსავალი:</span>
                      <span>{((operator.hours_this_week || 0) * operator.hourly_rate).toFixed(2)} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>სულ შემოსავალი:</span>
                      <span>{operator.total_earned?.toFixed(2) || 0} ₾</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* პროექტების ტაბი */}
      {activeTab === 'projects' && (
        <div className="projects-section">
          <h2>🏗️ პროექტების დეტალური ხედვა</h2>
          <div className="projects-detailed">
            {projects.map(project => (
              <div key={project.id} className="project-detailed-card">
                <div className="project-info-header">
                  <h3>{project.name}</h3>
                  <div 
                    className="project-status"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status}
                  </div>
                </div>

                <div className="project-progress-detailed">
                  <div className="progress-stats">
                    <div className="progress-stat">
                      <span className="progress-label">პროგრესი</span>
                      <span className="progress-value">{project.completion}%</span>
                    </div>
                    <div className="progress-stat">
                      <span className="progress-label">ბიუჯეტი</span>
                      <span className="progress-value">{((project.spent / project.budget) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="progress-bars">
                    <div className="progress-bar-container">
                      <span>მუშაობის პროგრესი</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${project.completion}%`, backgroundColor: '#28a745' }}
                        ></div>
                      </div>
                    </div>
                    <div className="progress-bar-container">
                      <span>ბიუჯეტის გამოყენება</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(project.spent / project.budget) * 100}%`, 
                            backgroundColor: project.spent > project.budget * 0.8 ? '#dc3545' : '#ffc107'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="project-details-grid">
                  <div className="detail-section">
                    <h4>პროექტის ინფორმაცია</h4>
                    <div className="detail-item">
                      <span>ვადა:</span>
                      <span>{new Date(project.deadline).toLocaleDateString('ka-GE')}</span>
                    </div>
                    <div className="detail-item">
                      <span>ოპერატორები:</span>
                      <span>{project.operators.join(', ')}</span>
                    </div>
                    <div className="detail-item">
                      <span>სულ საათები:</span>
                      <span>{project.total_hours}</span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>ფინანსური ინფორმაცია</h4>
                    <div className="detail-item">
                      <span>ბიუჯეტი:</span>
                      <span>{project.budget} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>გახარჯული:</span>
                      <span>{project.spent} ₾</span>
                    </div>
                    <div className="detail-item">
                      <span>დარჩენილი:</span>
                      <span>{(project.budget - project.spent)} ₾</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* მუშაობის საათების ტაბი */}
      {activeTab === 'hours' && (
        <div className="hours-section">
          <h2>⏰ მუშაობის საათების ტრეკინგი</h2>
          <div className="hours-table">
            <div className="table-header">
              <div className="header-cell">ოპერატორი</div>
              <div className="header-cell">თარიღი</div>
              <div className="header-cell">საათები</div>
              <div className="header-cell">პროექტი</div>
              <div className="header-cell">ღირებულება</div>
              <div className="header-cell">სულ</div>
              <div className="header-cell">სტატუსი</div>
            </div>
            
            {workHours.map(hour => (
              <div key={hour.id} className="table-row">
                <div className="table-cell">{hour.operator_name}</div>
                <div className="table-cell">{new Date(hour.date).toLocaleDateString('ka-GE')}</div>
                <div className="table-cell">{hour.hours}</div>
                <div className="table-cell">{hour.project}</div>
                <div className="table-cell">{hour.rate} ₾</div>
                <div className="table-cell">{hour.total} ₾</div>
                <div className="table-cell">
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: hour.status === 'approved' ? '#28a745' : '#ffc107'
                    }}
                  >
                    {hour.status === 'approved' ? 'დამტკიცებული' : 'მოლოდინში'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ფინანსების ტაბი */}
      {activeTab === 'finances' && (
        <div className="finances-section">
          <h2>💰 ფინანსური მიმოხილვა</h2>
          
          <div className="financial-stats">
            <div className="financial-card">
              <h3>პროექტების ბიუჯეტი</h3>
              <div className="financial-details">
                <div className="financial-item">
                  <span>სულ ბიუჯეტი:</span>
                  <span>{calculateTotalBudget()} ₾</span>
                </div>
                <div className="financial-item">
                  <span>გახარჯული:</span>
                  <span>{calculateTotalSpent()} ₾</span>
                </div>
                <div className="financial-item">
                  <span>დარჩენილი:</span>
                  <span>{calculateTotalBudget() - calculateTotalSpent()} ₾</span>
                </div>
                <div className="financial-item">
                  <span>გამოყენების %:</span>
                  <span>{((calculateTotalSpent() / calculateTotalBudget()) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="financial-card">
              <h3>ოპერატორების ანაზღაურება</h3>
              <div className="financial-details">
                {operators.map(operator => (
                  <div key={operator.id} className="financial-item">
                    <span>{operator.name}:</span>
                    <span>{operator.total_earned?.toFixed(2) || 0} ₾</span>
                  </div>
                ))}
                <div className="financial-item total">
                  <span>სულ ანაზღაურება:</span>
                  <span>{operators.reduce((sum, op) => sum + (op.total_earned || 0), 0).toFixed(2)} ₾</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cost-breakdown">
            <h3>ხარჯების დაჯგუფება</h3>
            <div className="breakdown-chart">
              {projects.map(project => (
                <div key={project.id} className="breakdown-item">
                  <div className="breakdown-header">
                    <span>{project.name}</span>
                    <span>{project.spent} ₾</span>
                  </div>
                  <div className="breakdown-bar">
                    <div 
                      className="breakdown-fill"
                      style={{ 
                        width: `${(project.spent / calculateTotalSpent()) * 100}%`,
                        backgroundColor: getStatusColor(project.status)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalIntegratedView;
