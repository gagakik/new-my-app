const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware imports
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token არ არის მოწოდებული' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'არასწორი token' });
    }
    req.user = user;
    next();
  });
};

// POST check-in participant
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { participant_id, event_id, checkin_time } = req.body;

    // Check if participant exists and belongs to the event
    const participantCheck = await db.query(`
      SELECT ep.*, c.company_name 
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      WHERE ep.id = $1 AND ep.event_id = $2
    `, [participant_id, event_id]);

    if (participantCheck.rows.length === 0) {
      return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა ამ ივენთში' });
    }

    // Check if already checked in
    const existingCheckin = await db.query(`
      SELECT * FROM participant_checkins 
      WHERE participant_id = $1 AND event_id = $2
    `, [participant_id, event_id]);

    if (existingCheckin.rows.length > 0) {
      return res.status(400).json({ 
        message: 'მონაწილე უკვე რეგისტრირებულია ამ ივენთზე'
      });
    }

    // Insert check-in record
    const result = await db.query(`
      INSERT INTO participant_checkins (participant_id, event_id, checkin_time, checked_in_by, notes)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [participant_id, event_id, checkin_time || new Date(), req.user.id, req.body.notes || null]);

    const participant = participantCheck.rows[0];

    res.json({
      message: 'მონაწილე წარმატებით რეგისტრირდა',
      checkin: result.rows[0],
      participant: {
        id: participant.id,
        company_name: participant.company_name,
        booth_number: participant.booth_number
      }
    });
  } catch (error) {
    console.error('Check-in შეცდომა:', error);
    res.status(500).json({ message: 'Check-in ვერ მოხერხდა' });
  }
});

// GET check-ins for event
router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(`
      SELECT 
        pc.*,
        ep.booth_number,
        ep.registration_status,
        c.company_name,
        u.username as checked_in_by_username
      FROM participant_checkins pc
      JOIN event_participants ep ON pc.participant_id = ep.id
      JOIN companies c ON ep.company_id = c.id
      LEFT JOIN users u ON pc.checked_in_by = u.id
      WHERE pc.event_id = $1
      ORDER BY pc.checkin_time DESC
    `, [eventId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Check-ins მიღების შეცდომა:', error);
    res.status(500).json({ message: 'Check-ins მიღება ვერ მოხერხდა' });
  }
});

module.exports = router;