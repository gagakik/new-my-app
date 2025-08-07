
const express = require('express');
const router = express.Router();
const db = require('../db');

// JWT მიდლვერი ტოკენის შესამოწმებლად
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

// ივენთების რეპორტები
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { type, eventId, startDate, endDate } = req.query;

    switch (type) {
      case 'participants':
        const participantsData = await generateParticipantsReport(eventId, startDate, endDate);
        res.json(participantsData);
        break;
        
      case 'financial':
        const financialData = await generateFinancialReport(eventId, startDate, endDate);
        res.json(financialData);
        break;
        
      case 'summary':
        const summaryData = await generateSummaryReport(startDate, endDate);
        res.json(summaryData);
        break;
        
      default:
        res.status(400).json({ error: 'არასწორი რეპორტის ტიპი' });
    }
  } catch (error) {
    console.error('რეპორტის შექმნის შეცდომა:', error);
    res.status(500).json({ error: 'რეპორტის შექმნა ვერ მოხერხდა' });
  }
});

// მონაწილეების ანალიზის რეპორტი
async function generateParticipantsReport(eventId, startDate, endDate) {
  let whereClause = 'WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (eventId) {
    whereClause += ` AND ep.event_id = $${paramIndex}`;
    params.push(eventId);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND ep.registration_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND ep.registration_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const query = `
    SELECT 
      ep.*,
      c.name as company_name,
      c.country,
      a.service_name as event_name
    FROM event_participants ep
    LEFT JOIN companies c ON ep.company_id = c.id
    LEFT JOIN annual_services a ON ep.event_id = a.id
    ${whereClause}
    ORDER BY ep.registration_date DESC
  `;

  const result = await db.query(query, params);
  const participants = result.rows;

  // სტატისტიკების გამოთვლა
  const totalParticipants = participants.length;
  const confirmedParticipants = participants.filter(p => p.registration_status === 'confirmed').length;
  const paidParticipants = participants.filter(p => p.payment_status === 'paid').length;
  const totalRevenue = participants.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0);

  return {
    totalParticipants,
    confirmedParticipants,
    paidParticipants,
    totalRevenue: totalRevenue.toFixed(2),
    participants
  };
}

// ფინანსური ანალიზის რეპორტი
async function generateFinancialReport(eventId, startDate, endDate) {
  let whereClause = 'WHERE 1=1';
  let params = [];
  let paramIndex = 1;

  if (eventId) {
    whereClause += ` AND ep.event_id = $${paramIndex}`;
    params.push(eventId);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND ep.registration_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND ep.registration_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const query = `
    SELECT 
      SUM(CASE WHEN ep.payment_amount IS NOT NULL THEN ep.payment_amount ELSE 0 END) as expected_revenue,
      SUM(CASE WHEN ep.payment_status = 'paid' THEN ep.payment_amount ELSE 0 END) as actual_revenue,
      SUM(CASE WHEN ep.payment_status = 'overdue' THEN ep.payment_amount ELSE 0 END) as overdue_amount
    FROM event_participants ep
    ${whereClause}
  `;

  const result = await db.query(query, params);
  const financial = result.rows[0];

  return {
    expectedRevenue: parseFloat(financial.expected_revenue || 0).toFixed(2),
    actualRevenue: parseFloat(financial.actual_revenue || 0).toFixed(2),
    overdueAmount: parseFloat(financial.overdue_amount || 0).toFixed(2)
  };
}

// ზოგადი მიმოხილვის რეპორტი
async function generateSummaryReport(startDate, endDate) {
  let whereClause = '';
  let params = [];
  let paramIndex = 1;

  if (startDate || endDate) {
    whereClause = 'WHERE 1=1';
    
    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
  }

  // ივენთების რაოდენობა
  const eventsQuery = `SELECT COUNT(*) as total FROM annual_services ${whereClause}`;
  const eventsResult = await db.query(eventsQuery, params);
  const totalEvents = parseInt(eventsResult.rows[0].total);

  // აქტიური ივენთების რაოდენობა
  const activeEventsQuery = `SELECT COUNT(*) as total FROM annual_services WHERE is_archived = FALSE`;
  const activeEventsResult = await db.query(activeEventsQuery, []);
  const activeEvents = parseInt(activeEventsResult.rows[0].total);

  // მონაწილეების რაოდენობა
  let participantsWhereClause = '';
  let participantsParams = [];
  let participantsParamIndex = 1;

  if (startDate || endDate) {
    participantsWhereClause = 'WHERE 1=1';
    
    if (startDate) {
      participantsWhereClause += ` AND registration_date >= $${participantsParamIndex}`;
      participantsParams.push(startDate);
      participantsParamIndex++;
    }

    if (endDate) {
      participantsWhereClause += ` AND registration_date <= $${participantsParamIndex}`;
      participantsParams.push(endDate);
      participantsParamIndex++;
    }
  }

  const participantsQuery = `SELECT COUNT(*) as total FROM event_participants ${participantsWhereClause}`;
  const participantsResult = await db.query(participantsQuery, participantsParams);
  const totalParticipants = parseInt(participantsResult.rows[0].total);

  // ჯამური შემოსავალი
  const revenueQuery = `
    SELECT SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END) as total_revenue 
    FROM event_participants ${participantsWhereClause}
  `;
  const revenueResult = await db.query(revenueQuery, participantsParams);
  const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue || 0).toFixed(2);

  return {
    totalEvents,
    activeEvents,
    totalParticipants,
    totalRevenue
  };
}

// იუზერების კომპანიების რეპორტი
router.get('/user-companies', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.username,
        COUNT(c.id) as companies_count,
        MAX(c.updated_by) as last_updated_by,
        MAX(c.updated_at) as last_update_date
      FROM users u
      LEFT JOIN companies c ON u.id = c.created_by_user_id
      GROUP BY u.id, u.username
      HAVING COUNT(c.id) > 0
      ORDER BY companies_count DESC, u.username
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('იუზერების კომპანიების რეპორტის შეცდომა:', error);
    res.status(500).json({ error: 'რეპორტის მიღება ვერ მოხერხდა' });
  }
});

// ივენთების ფინანსური ანალიზი
router.get('/event-financials', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.service_name as event_name,
        COUNT(ep.id) as participants_count,
        SUM(CASE WHEN ep.payment_status = 'paid' THEN ep.payment_amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN ep.payment_status = 'pending' THEN ep.payment_amount ELSE 0 END) as total_pending,
        SUM(ep.payment_amount) as total_expected
      FROM annual_services a
      LEFT JOIN event_participants ep ON a.id = ep.event_id
      WHERE a.is_archived = FALSE
      GROUP BY a.id, a.service_name
      HAVING COUNT(ep.id) > 0
      ORDER BY total_expected DESC
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('ივენთების ფინანსური ანალიზის შეცდომა:', error);
    res.status(500).json({ error: 'რეპორტის მიღება ვერ მოხერხდა' });
  }
});

module.exports = router;
