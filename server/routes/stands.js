
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const db = require('../db');

// Token verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token არ არის მოწოდებული' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'არასწორი token' });
    }
    req.user = user;
    next();
  });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/stands/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get stands for event
router.get('/', async (req, res) => {
  try {
    const { event_id } = req.query;

    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const result = await query(`
      SELECT 
        ep.id,
        ep.booth_number as stand_number,
        c.company_name,
        ep.booth_size as size,
        'planned' as status,
        'medium' as priority,
        NULL as assigned_operator,
        ep.registration_date as start_date,
        (ep.registration_date + INTERVAL '14 days') as deadline,
        ep.event_id,
        'სტანდარტული' as booth_type,
        ARRAY['ელ. ენერგია'] as equipment_needed,
        ep.registration_date as created_at,
        0 as progress,
        CONCAT('ზონა A, ', ep.booth_number) as location
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      WHERE ep.event_id = $1
      ORDER BY ep.booth_number
    `, [event_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stands:', error);
    res.status(500).json({ error: 'Failed to fetch stands' });
  }
});

// Get stand inventory
router.get('/:standId/inventory', async (req, res) => {
  try {
    const { standId } = req.params;
    const { event_id } = req.query;

    const result = await query(`
      SELECT * FROM stand_inventory 
      WHERE stand_id = $1 AND event_id = $2
      ORDER BY created_at DESC
    `, [standId, event_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Add inventory item
router.post('/:standId/inventory', async (req, res) => {
  try {
    const { standId } = req.params;
    const { 
      item_name, 
      item_category, 
      quantity, 
      unit, 
      status, 
      supplier, 
      cost, 
      notes,
      event_id 
    } = req.body;

    const result = await query(`
      INSERT INTO stand_inventory 
      (stand_id, event_id, item_name, item_category, quantity, unit, status, supplier, cost, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [standId, event_id, item_name, item_category, quantity, unit, status, supplier, cost, notes, req.user?.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding inventory:', error);
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
});

// Update inventory status
router.put('/inventory/:itemId/status', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    await query(`
      UPDATE stand_inventory 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, itemId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory status:', error);
    res.status(500).json({ error: 'Failed to update inventory status' });
  }
});

// Get stand photos
router.get('/:standId/photos', async (req, res) => {
  try {
    const { standId } = req.params;
    const { event_id } = req.query;

    const result = await query(`
      SELECT * FROM stand_photos 
      WHERE stand_id = $1 AND event_id = $2
      ORDER BY upload_date DESC
    `, [standId, event_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Upload stand photo
router.post('/:standId/photos', upload.single('photo'), async (req, res) => {
  try {
    const { standId } = req.params;
    const { photo_type, event_id, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = `/uploads/stands/${req.file.filename}`;

    const result = await query(`
      INSERT INTO stand_photos 
      (stand_id, event_id, photo_type, file_path, description, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [standId, event_id, photo_type, filePath, description, req.user?.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Update stand status
router.put('/:standId/status', async (req, res) => {
  try {
    const { standId } = req.params;
    const { status } = req.body;

    // This would update a stands table when implemented
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating stand status:', error);
    res.status(500).json({ error: 'Failed to update stand status' });
  }
});

// Update stand operator
router.put('/:standId/operator', async (req, res) => {
  try {
    const { standId } = req.params;
    const { assigned_operator } = req.body;

    // This would update a stands table when implemented
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating operator:', error);
    res.status(500).json({ error: 'Failed to update operator' });
  }
});

// Add stand note
router.post('/:standId/notes', async (req, res) => {
  try {
    const { standId } = req.params;
    const { note } = req.body;

    // This would add to a stand_notes table when implemented
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Get stands by company
router.get('/company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await db.query(`
      SELECT s.*, e.service_name as event_name
      FROM stands s
      LEFT JOIN annual_services e ON s.event_id = e.id
      WHERE s.company_id = $1
      ORDER BY s.created_at DESC
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching company stands:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
});

// Get stands by event
router.get('/event/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const result = await db.query(`
      SELECT s.*, c.company_name
      FROM stands s
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.event_id = $1
      ORDER BY s.stand_number
    `, [eventId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching event stands:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
});

// Integration endpoint for company participation history
router.get('/integration/company-history/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await db.query(`
      SELECT 
        e.service_name as event_name,
        e.start_date,
        e.end_date,
        s.status as participation_status,
        s.stand_number,
        s.stand_type,
        s.notes as stand_info
      FROM stands s
      JOIN annual_services e ON s.event_id = e.id
      WHERE s.company_id = $1
      ORDER BY e.start_date DESC
    `, [companyId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching company history:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
});

module.exports = router;
