
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Token verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Equipment route: No token provided');
    return res.status(401).json({ message: 'Access token არ არის მოწოდებული' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      console.log('Equipment route: Token verification failed', err.message);
      return res.status(403).json({ message: 'არასწორი token' });
    }
    req.user = user;
    next();
  });
};

// Authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.log(`Equipment route: Role ${req.user.role} not authorized for roles:`, roles);
      return res.status(403).json({ message: 'არ გაქვთ ამ მოქმედების ნებართვა' });
    }
    next();
  };
};

// მულტერის კონფიგურაცია ფაილების ატვირთვისთვის
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // შევქმნათ uploads დირექტორია თუ არ არსებობს
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // მხოლოდ სურათების ატვირთვის ნება
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('მხოლოდ სურათების ატვირთვა შესაძლებელია'));
    }
  }
});

// GET /api/equipment - ყველა აღჭურვილობის მიღება
router.get('/', authenticateToken, async (req, res) => {
  console.log('Equipment GET request from user:', req.user.username);
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by
      FROM equipment e
      LEFT JOIN users u1 ON e.created_by_id = u1.id
      ORDER BY e.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('აღჭურვილობის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის მიღება ვერ მოხერხდა' });
  }
});

// GET /api/equipment/:id - კონკრეტული აღჭურვილობის მიღება
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by
      FROM equipment e
      LEFT JOIN users u1 ON e.created_by_id = u1.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('აღჭურვილობის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის მიღება ვერ მოხერხდა' });
  }
});

// POST /api/equipment - ახალი აღჭურვილობის დამატება
router.post('/', authenticateToken, authorizeRoles('admin', 'operation'), upload.single('image'), async (req, res) => {
  try {
    const { code_name, quantity, price, description } = req.body;
    const userId = req.user.id;
    
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO equipment (code_name, quantity, price, description, image_url, created_by_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code_name, parseInt(quantity), parseFloat(price), description, imageUrl, userId]
    );

    res.status(201).json({
      message: 'აღჭურვილობა წარმატებით დაემატა!',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('აღჭურვილობის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის დამატება ვერ მოხერხდა' });
  }
});

// PUT /api/equipment/:id - აღჭურვილობის განახლება
router.put('/:id', authenticateToken, authorizeRoles('admin', 'operation'), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code_name, quantity, price, description, image_url_existing } = req.body;
    const userId = req.user.id;
    
    // ჯერ შევამოწმოთ არსებობს თუ არა ეს აღჭურვილობა
    const existingResult = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    let imageUrl = image_url_existing; // Keep existing image by default
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      
      // Delete old image file if it exists
      const oldImageUrl = existingResult.rows[0].image_url;
      if (oldImageUrl && oldImageUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', oldImageUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    const result = await db.query(
      `UPDATE equipment 
       SET code_name = $1, quantity = $2, price = $3, description = $4, 
           image_url = $5, updated_by_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [code_name, parseInt(quantity), parseFloat(price), description, imageUrl, userId, id]
    );

    res.json({
      message: 'აღჭურვილობა წარმატებით განახლდა!',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('აღჭურვილობის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის განახლება ვერ მოხერხდა' });
  }
});

// DELETE /api/equipment/:id - აღჭურვილობის წაშლა
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // შევამოწმოთ არსებობს თუ არა
    const existingResult = await db.query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    // წავშალოთ ბაზიდან
    await db.query('DELETE FROM equipment WHERE id = $1', [id]);

    res.json({ message: 'აღჭურვილობა წარმატებით წაიშალა!' });
  } catch (error) {
    console.error('აღჭურვილობის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის წაშლა ვერ მოხერხდა' });
  }
});

module.exports = router;



// POST /api/equipment/:id/maintenance - მოვლის გეგმის დამატება
router.post('/:id/maintenance', async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_type, scheduled_date, description, estimated_cost } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `INSERT INTO equipment_maintenance 
       (equipment_id, maintenance_type, scheduled_date, description, estimated_cost, created_by_user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, maintenance_type, scheduled_date, description, estimated_cost, userId]
    );

    res.status(201).json({
      message: 'მოვლის გეგმა წარმატებით დაემატა!',
      maintenance: result.rows[0]
    });
  } catch (error) {
    console.error('მოვლის გეგმის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'მოვლის გეგმის დამატება ვერ მოხერხდა' });
  }
});

// GET /api/equipment/:id/maintenance - აღჭურვილობის მოვლის ისტორია
router.get('/:id/maintenance', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        em.*,
        u.username as created_by
      FROM equipment_maintenance em
      LEFT JOIN users u ON em.created_by_user_id = u.id
      WHERE em.equipment_id = $1
      ORDER BY em.scheduled_date DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('მოვლის ისტორიის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'მოვლის ისტორია ვერ მოიძებნა' });
  }
});

// PUT /api/equipment/:id/maintenance/:maintenanceId - მოვლის სტატუსის განახლება
router.put('/:id/maintenance/:maintenanceId', async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const { status, actual_cost, completion_date, notes } = req.body;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE equipment_maintenance 
       SET status = $1, actual_cost = $2, completion_date = $3, notes = $4, updated_by_user_id = $5
       WHERE id = $6 RETURNING *`,
      [status, actual_cost, completion_date, notes, userId, maintenanceId]
    );

    res.json({
      message: 'მოვლის სტატუსი განახლდა!',
      maintenance: result.rows[0]
    });
  } catch (error) {
    console.error('მოვლის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'მოვლის განახლება ვერ მოხერხდა' });
  }
});

// GET /api/equipment/realtime-availability/:eventId - რეალურ დროში ხელმისაწვდომობა
router.get('/realtime-availability/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const result = await db.query(`
      SELECT 
        e.*,
        COALESCE(bookings.booked_quantity, 0) as booked_quantity,
        COALESCE(maintenance.under_maintenance, 0) as under_maintenance,
        (e.quantity - COALESCE(bookings.booked_quantity, 0) - COALESCE(maintenance.under_maintenance, 0)) as available_quantity
      FROM equipment e
      LEFT JOIN (
        SELECT 
          equipment_id, 
          SUM(quantity) as booked_quantity
        FROM participant_selected_equipment pse
        JOIN event_participants ep ON pse.participant_id = ep.id
        WHERE ep.event_id = $1
        GROUP BY equipment_id
      ) bookings ON e.id = bookings.equipment_id
      LEFT JOIN (
        SELECT 
          equipment_id,
          COUNT(*) as under_maintenance
        FROM equipment_maintenance
        WHERE status IN ('planned', 'in_progress')
        GROUP BY equipment_id
      ) maintenance ON e.id = maintenance.equipment_id
      ORDER BY e.code_name
    `, [eventId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('რეალურ დროში ხელმისაწვდომობის შეცდომა:', error);
    res.status(500).json({ message: 'ხელმისაწვდომობის მიღება ვერ მოხერხდა' });
  }
});

// POST /api/equipment/:id/damage-report - დაზიანების რეპორტი
router.post('/:id/damage-report', upload.array('damage_photos', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { damage_description, severity, reported_by, incident_date } = req.body;
    const userId = req.user.id;
    
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      photoUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    const result = await db.query(
      `INSERT INTO equipment_damage_reports 
       (equipment_id, damage_description, severity, reported_by, incident_date, photo_urls, created_by_user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, damage_description, severity, reported_by, incident_date, JSON.stringify(photoUrls), userId]
    );

    res.status(201).json({
      message: 'დაზიანების რეპორტი წარმატებით შეიქმნა!',
      report: result.rows[0]
    });
  } catch (error) {
    console.error('დაზიანების რეპორტის შეცდომა:', error);
    res.status(500).json({ message: 'დაზიანების რეპორტი ვერ შეიქმნა' });
  }
});

