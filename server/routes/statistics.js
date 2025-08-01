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

// მომხმარებლების სტატისტიკა
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        COUNT(DISTINCT c.id) as companies_created,
        COUNT(DISTINCT e.id) as equipment_created,
        COUNT(DISTINCT s.id) as spaces_created,
        COUNT(DISTINCT ex.id) as exhibitions_created
      FROM users u
      LEFT JOIN companies c ON u.id = c.created_by_user_id
      LEFT JOIN equipment e ON u.id = e.created_by_user_id
      LEFT JOIN spaces s ON u.id = s.created_by_user_id
      LEFT JOIN exhibitions ex ON u.id = ex.created_by_user_id
      GROUP BY u.id, u.username, u.role
      ORDER BY companies_created DESC, equipment_created DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('სტატისტიკის შეცდომა:', error);
    res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// ზოგადი სტატისტიკა
router.get('/general', authenticateToken, async (req, res) => {
  try {
    const [companiesCount, equipmentCount, spacesCount, exhibitionsCount, usersCount] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM companies'),
      db.query('SELECT COUNT(*) as count FROM equipment'),
      db.query('SELECT COUNT(*) as count FROM spaces'),
      db.query('SELECT COUNT(*) as count FROM exhibitions'),
      db.query('SELECT COUNT(*) as count FROM users')
    ]);

    res.json({
      companies: parseInt(companiesCount.rows[0].count),
      equipment: parseInt(equipmentCount.rows[0].count),
      spaces: parseInt(spacesCount.rows[0].count),
      exhibitions: parseInt(exhibitionsCount.rows[0].count),
      users: parseInt(usersCount.rows[0].count)
    });
  } catch (error) {
    console.error('ზოგადი სტატისტიკის შეცდომა:', error);
    res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// GET: სტატისტიკის მიღება
router.get('/', authenticateToken, async (req, res) => {
  try {
    // კომპანიების სტატისტიკა
    const companiesResult = await db.query('SELECT COUNT(*) as total FROM companies');
    const companiesTotal = parseInt(companiesResult.rows[0].total);

    // კომპანიების იუზერების მიხედვით
    const companiesByUserResult = await db.query(`
      SELECT u.username, COUNT(c.id) as count 
      FROM users u 
      LEFT JOIN companies c ON u.id = c.created_by_user_id 
      GROUP BY u.id, u.username 
      HAVING COUNT(c.id) > 0
      ORDER BY count DESC
    `);

    // აღჭურვილობის სტატისტიკა
    const equipmentResult = await db.query('SELECT COUNT(*) as total FROM equipment');
    const equipmentTotal = parseInt(equipmentResult.rows[0].total);

    // აღჭურვილობის იუზერების მიხედვით
    const equipmentByUserResult = await db.query(`
      SELECT u.username, COUNT(e.id) as count 
      FROM users u 
      LEFT JOIN equipment e ON u.id = e.created_by_user_id 
      GROUP BY u.id, u.username 
      HAVING COUNT(e.id) > 0
      ORDER BY count DESC
    `);

    // გამოფენების სტატისტიკა
    const exhibitionsResult = await db.query('SELECT COUNT(*) as total FROM exhibitions');
    const exhibitionsTotal = parseInt(exhibitionsResult.rows[0].total);

    // გამოფენების იუზერების მიხედვით
    const exhibitionsByUserResult = await db.query(`
      SELECT u.username, COUNT(ex.id) as count 
      FROM users u 
      LEFT JOIN exhibitions ex ON u.id = ex.created_by_user_id 
      GROUP BY u.id, u.username 
      HAVING COUNT(ex.id) > 0
      ORDER BY count DESC
    `);

    // სივრცეების სტატისტიკა
    const spacesResult = await db.query('SELECT COUNT(*) as total FROM spaces');
    const spacesTotal = parseInt(spacesResult.rows[0].total);

    // სივრცეების იუზერების მიხედვით
    const spacesByUserResult = await db.query(`
      SELECT u.username, COUNT(s.id) as count 
      FROM users u 
      LEFT JOIN spaces s ON u.id = s.created_by_user_id 
      GROUP BY u.id, u.username 
      HAVING COUNT(s.id) > 0
      ORDER BY count DESC
    `);

    // წლიური სერვისების სტატისტიკა
    const servicesResult = await db.query('SELECT COUNT(*) as total FROM annual_services WHERE is_archived = FALSE');
    const servicesTotal = parseInt(servicesResult.rows[0].total);

    // ივენთების იუზერების მიხედვით
    const eventsByUserResult = await db.query(`
      SELECT u.username, COUNT(a.id) as count 
      FROM users u 
      LEFT JOIN annual_services a ON u.id = a.created_by_user_id 
      WHERE a.is_archived = FALSE OR a.is_archived IS NULL
      GROUP BY u.id, u.username 
      HAVING COUNT(a.id) > 0
      ORDER BY count DESC
    `);

    // მომხმარებლების სტატისტიკა
    const usersResult = await db.query('SELECT COUNT(*) as total FROM users');
    const usersTotal = parseInt(usersResult.rows[0].total);

    const stats = {
      companies: companiesTotal,
      equipment: equipmentTotal,
      exhibitions: exhibitionsTotal,
      spaces: spacesTotal,
      services: servicesTotal,
      users: usersTotal,
      userStats: {
        companiesByUser: companiesByUserResult.rows,
        equipmentByUser: equipmentByUserResult.rows,
        exhibitionsByUser: exhibitionsByUserResult.rows,
        spacesByUser: spacesByUserResult.rows,
        eventsByUser: eventsByUserResult.rows
      }
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('შეცდომა სტატისტიკის მიღებისას:', error);
    res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა.', error: error.message });
  }
});

module.exports = router;