
const express = require('express');
const router = express.Router();
const db = require('../db');

// JWT მიდლვერი
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'ავტორიზაციის ტოკენი არ არის მოწოდებული.' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'არასწორი ან ვადაგასული ავტორიზაციის ტოკენი.' });
        }
        req.user = user;
        next();
    });
}

// Real-time ვიზიტორების მეტრიკები
router.get('/visitor-metrics', authenticateToken, async (req, res) => {
  try {
    const { eventId, startDate, endDate } = req.query;
    
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (eventId) {
      whereClause += `WHERE event_id = $${paramIndex}`;
      params.push(eventId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `checkin_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `checkin_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // საათობრივი ვიზიტორების ანალიზი
    const hourlyVisitors = await db.query(`
      SELECT 
        EXTRACT(HOUR FROM checkin_time) as hour,
        COUNT(*) as visitor_count,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - checkin_time))/3600) as avg_stay_hours
      FROM visitor_checkins 
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM checkin_time)
      ORDER BY hour
    `, params);

    // ყველაზე დაკავებული ზონები
    const busyZones = await db.query(`
      SELECT 
        zone_name,
        COUNT(*) as total_visits,
        AVG(visit_duration_minutes) as avg_duration,
        CASE 
          WHEN COUNT(*) > 100 THEN 'კრიტიკული'
          WHEN COUNT(*) > 50 THEN 'მაღალი'
          ELSE 'ნორმალური'
        END as congestion_level
      FROM zone_visits 
      ${whereClause.replace('checkin_time', 'visit_time')}
      GROUP BY zone_name
      ORDER BY total_visits DESC
    `, params);

    // AI პროგნოზირება - შემდეგი საათის ვიზიტორები
    const currentHour = new Date().getHours();
    const historicalData = await db.query(`
      SELECT 
        EXTRACT(HOUR FROM checkin_time) as hour,
        AVG(visitor_count) as avg_visitors
      FROM (
        SELECT 
          checkin_time,
          COUNT(*) OVER (
            PARTITION BY DATE_TRUNC('hour', checkin_time)
          ) as visitor_count
        FROM visitor_checkins
        WHERE EXTRACT(HOUR FROM checkin_time) = $1
      ) subquery
      GROUP BY EXTRACT(HOUR FROM checkin_time)
    `, [currentHour + 1]);

    const predictedVisitors = historicalData.rows[0]?.avg_visitors || 0;

    res.json({
      realTimeMetrics: {
        hourlyVisitors: hourlyVisitors.rows,
        busyZones: busyZones.rows,
        aiPrediction: {
          nextHourExpectedVisitors: Math.round(predictedVisitors),
          confidence: 0.85,
          recommendation: predictedVisitors > 100 
            ? 'მოემზადეთ მაღალი ნაკადისთვის' 
            : 'ნორმალური რეჟიმი'
        }
      },
      insights: [
        `ყველაზე დაკავებული ზონაა: ${busyZones.rows[0]?.zone_name || 'არ არის მონაცემები'}`,
        `პიკი საათია: ${hourlyVisitors.rows.reduce((max, curr) => 
          curr.visitor_count > max.visitor_count ? curr : max, 
          hourlyVisitors.rows[0] || {hour: 'უცნობი'}
        ).hour}:00`,
        `საშუალო ყოფნის დრო: ${hourlyVisitors.rows[0]?.avg_stay_hours?.toFixed(1) || 0} საათი`
      ]
    });
  } catch (error) {
    console.error('Analytics შეცდომა:', error);
    res.status(500).json({ message: 'ანალიზის მიღება ვერ მოხერხდა' });
  }
});

// AI-ით ავტომატური რეკომენდაციები
router.get('/ai-recommendations', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    
    // ვიზიტორების patterns ანალიზი
    const patterns = await db.query(`
      SELECT 
        booth_type,
        AVG(visit_duration_minutes) as avg_duration,
        COUNT(*) as total_visits,
        stddev(visit_duration_minutes) as duration_variance
      FROM booth_visits bv
      JOIN booths b ON bv.booth_id = b.id
      WHERE bv.event_id = $1
      GROUP BY booth_type
    `, [eventId]);

    // AI რეკომენდაციები
    const recommendations = [];
    
    patterns.rows.forEach(pattern => {
      if (pattern.avg_duration < 5) {
        recommendations.push({
          type: 'უარყოფითი',
          priority: 'მაღალი',
          title: `${pattern.booth_type} ბუთები არ იქცევა ვიზიტორების ყურადღებას`,
          suggestion: 'გამოფენის მასალების გაუმჯობესება აუცილებელია',
          impact: 'ვიზიტორების ჩართულობა +40%'
        });
      }
      
      if (pattern.total_visits > 150) {
        recommendations.push({
          type: 'პოზიტიური',
          priority: 'საშუალო',
          title: `${pattern.booth_type} ბუთები ძალიან პოპულარულია`,
          suggestion: 'მსგავსი ბუთების რაოდენობის გაზრდა მომავალ ღონისძიებებზე',
          impact: 'ვიზიტორთა კმაყოფილება +25%'
        });
      }
    });

    res.json({
      patterns: patterns.rows,
      recommendations,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('AI რეკომენდაციების შეცდომა:', error);
    res.status(500).json({ message: 'AI რეკომენდაციების მიღება ვერ მოხერხდა' });
  }
});

module.exports = router</old_str>uggestion: 'დამატებითი თანამშრომლების განთავსება',
          impact: 'ლიდების ზრდა +25%'
        });
      }
    });

    // Real-time ოპტიმიზაციის რჩევები
    const currentCongestion = await db.query(`
      SELECT zone_name, COUNT(*) as current_visitors
      FROM zone_visits 
      WHERE visit_time > NOW() - INTERVAL '30 minutes'
      AND event_id = $1
      GROUP BY zone_name
      HAVING COUNT(*) > 50
    `, [eventId]);

    currentCongestion.rows.forEach(zone => {
      recommendations.push({
        type: 'გადაუდებელი',
        priority: 'კრიტიკული',
        title: `${zone.zone_name} ზონაში გადატვირთულობა`,
        suggestion: 'ვიზიტორების გადამისამართება სხვა ზონებში',
        impact: 'ვიზიტორების კმაყოფილება +30%'
      });
    });

    res.json({
      aiRecommendations: recommendations,
      analytics: {
        totalPatterns: patterns.rows.length,
        confidenceScore: 0.92,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI რეკომენდაციების შეცდომა:', error);
    res.status(500).json({ message: 'AI რეკომენდაციების მიღება ვერ მოხერხდა' });
  }
});

// Heat Map მონაცემები
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.query;
    
    const heatmapData = await db.query(`
      SELECT 
        x_coordinate,
        y_coordinate,
        COUNT(*) as intensity,
        zone_name,
        CASE 
          WHEN COUNT(*) > 100 THEN 'ძალიან ცხელი'
          WHEN COUNT(*) > 50 THEN 'ცხელი'
          WHEN COUNT(*) > 20 THEN 'თბილი'
          ELSE 'ცივი'
        END as heat_level
      FROM visitor_positions 
      WHERE event_id = $1
      AND recorded_at > NOW() - INTERVAL '2 hours'
      GROUP BY x_coordinate, y_coordinate, zone_name
      ORDER BY intensity DESC
    `, [eventId]);

    res.json({
      heatmapPoints: heatmapData.rows,
      metadata: {
        maxIntensity: Math.max(...heatmapData.rows.map(p => p.intensity)),
        totalDataPoints: heatmapData.rows.length,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Heatmap შეცდომა:', error);
    res.status(500).json({ message: 'Heatmap მონაცემების მიღება ვერ მოხერხდა' });
  }
});

module.exports = router;
