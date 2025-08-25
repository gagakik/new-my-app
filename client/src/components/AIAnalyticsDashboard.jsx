
import React, { useState, useEffect } from 'react';
import './AIAnalyticsDashboard.css';

const AIAnalyticsDashboard = ({ showNotification }) => {
  const [metrics, setMetrics] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAnalytics();
      fetchRecommendations();
      fetchHeatmap();
    }
  }, [selectedEvent]);

  useEffect(() => {
    let interval;
    if (autoRefresh && selectedEvent) {
      interval = setInterval(() => {
        fetchAnalytics();
        fetchHeatmap();
      }, 30000); // განახლება 30 წამში ერთხელ
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedEvent]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        if (data.length > 0) {
          setSelectedEvent(data[0].id);
        }
      }
    } catch (error) {
      showNotification('ივენთების ჩატვირთვის შეცდომა', 'error');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/visitor-metrics?eventId=${selectedEvent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      showNotification('ანალიტიკის ჩატვირთვის შეცდომა', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/ai-recommendations?eventId=${selectedEvent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.aiRecommendations || []);
      }
    } catch (error) {
      console.error('AI რეკომენდაციების შეცდომა:', error);
    }
  };

  const fetchHeatmap = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/analytics/heatmap?eventId=${selectedEvent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHeatmapData(data.heatmapPoints || []);
      }
    } catch (error) {
      console.error('Heatmap შეცდომა:', error);
    }
  };

  const getHourlyChartData = () => {
    if (!metrics.realTimeMetrics?.hourlyVisitors) return [];
    
    return metrics.realTimeMetrics.hourlyVisitors.map(hour => ({
      hour: `${hour.hour}:00`,
      visitors: hour.visitor_count,
      avgStay: parseFloat(hour.avg_stay_hours || 0).toFixed(1)
    }));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'კრიტიკული': return '#ff4444';
      case 'მაღალი': return '#ff8800';
      case 'საშუალო': return '#00bb44';
      default: return '#4488ff';
    }
  };

  const getHeatColor = (intensity, maxIntensity) => {
    const ratio = intensity / maxIntensity;
    if (ratio > 0.8) return '#ff0000';
    if (ratio > 0.6) return '#ff4400';
    if (ratio > 0.4) return '#ff8800';
    if (ratio > 0.2) return '#ffcc00';
    return '#00ff00';
  };

  if (isLoading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-spinner">🔄 AI ანალიტიკა იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>🧠 AI Visitor Analytics Dashboard</h2>
        <div className="dashboard-controls">
          <select 
            value={selectedEvent} 
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="event-selector"
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.service_name}
              </option>
            ))}
          </select>
          
          <button 
            className={`auto-refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸️ Auto Refresh' : '▶️ Auto Refresh'}
          </button>
        </div>
      </div>

      {/* Real-time მეტრიკები */}
      <div className="metrics-grid">
        <div className="metric-card prediction">
          <h3>🔮 AI პროგნოზირება</h3>
          <div className="prediction-content">
            <div className="prediction-number">
              {metrics.realTimeMetrics?.aiPrediction?.nextHourExpectedVisitors || 0}
            </div>
            <div className="prediction-label">მომდევნო საათში ვიზიტორები</div>
            <div className="confidence">
              სარწმუნოება: {((metrics.realTimeMetrics?.aiPrediction?.confidence || 0) * 100).toFixed(0)}%
            </div>
            <div className="recommendation">
              💡 {metrics.realTimeMetrics?.aiPrediction?.recommendation}
            </div>
          </div>
        </div>

        <div className="metric-card zones">
          <h3>🏢 დაკავებული ზონები</h3>
          <div className="zones-list">
            {metrics.realTimeMetrics?.busyZones?.slice(0, 3).map((zone, index) => (
              <div key={index} className="zone-item">
                <span className="zone-name">{zone.zone_name}</span>
                <span className={`congestion-level ${zone.congestion_level}`}>
                  {zone.congestion_level}
                </span>
                <span className="visit-count">{zone.total_visits} ვიზიტი</span>
              </div>
            ))}
          </div>
        </div>

        <div className="metric-card insights">
          <h3>📊 AI ინსაიტები</h3>
          <div className="insights-list">
            {metrics.insights?.map((insight, index) => (
              <div key={index} className="insight-item">
                💡 {insight}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* საათობრივი ვიზიტორების ჩარტი */}
      <div className="chart-section">
        <h3>📈 საათობრივი ვიზიტორების ანალიზი</h3>
        <div className="hourly-chart">
          {getHourlyChartData().map((data, index) => (
            <div key={index} className="hour-bar">
              <div 
                className="bar"
                style={{
                  height: `${(data.visitors / Math.max(...getHourlyChartData().map(d => d.visitors))) * 100}%`
                }}
              ></div>
              <div className="hour-label">{data.hour}</div>
              <div className="visitor-count">{data.visitors}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI რეკომენდაციები */}
      <div className="recommendations-section">
        <h3>🤖 AI რეკომენდაციები</h3>
        <div className="recommendations-grid">
          {recommendations.map((rec, index) => (
            <div 
              key={index} 
              className="recommendation-card"
              style={{ borderLeft: `4px solid ${getPriorityColor(rec.priority)}` }}
            >
              <div className="rec-header">
                <span className={`priority ${rec.priority}`}>{rec.priority}</span>
                <span className={`type ${rec.type}`}>{rec.type}</span>
              </div>
              <h4>{rec.title}</h4>
              <p>{rec.suggestion}</p>
              <div className="impact">📈 {rec.impact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Heat Map */}
      <div className="heatmap-section">
        <h3>🌡️ Real-time Heat Map</h3>
        <div className="heatmap-container">
          <div className="heatmap-grid">
            {heatmapData.map((point, index) => (
              <div
                key={index}
                className="heat-point"
                style={{
                  left: `${point.x_coordinate}%`,
                  top: `${point.y_coordinate}%`,
                  backgroundColor: getHeatColor(
                    point.intensity, 
                    Math.max(...heatmapData.map(p => p.intensity))
                  )
                }}
                title={`${point.zone_name}: ${point.intensity} ვიზიტორი`}
              >
                {point.intensity}
              </div>
            ))}
          </div>
          <div className="heatmap-legend">
            <span>ცივი</span>
            <div className="gradient-bar"></div>
            <span>ცხელი</span>
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <p>
          🕐 ბოლო განახლება: {new Date().toLocaleTimeString('ka-GE')}
          {autoRefresh && ' (ავტომატური განახლება ჩართულია)'}
        </p>
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;
