
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM equipment e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      ORDER BY e.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('აღჭურვილობის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის მიღება ვერ მოხერხდა' });
  }
});

// GET /api/equipment/:id - კონკრეტული აღჭურვილობის მიღება
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM equipment e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { code_name, quantity, price, description } = req.body;
    const userId = req.user.id;
    
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const result = await db.query(
      `INSERT INTO equipment (code_name, quantity, price, description, image_url, created_by_user_id) 
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
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code_name, quantity, price, description, image_url_existing } = req.body;
    const userId = req.user.id;
    
    // ჯერ შევამოწმოთ არსებობს თუ არა ეს აღჭურვილობა
    const existingResult = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    let imageUrl = existingResult.rows[0].image_url; // არსებული სურათი
    
    // თუ ახალი ფაილი აიტვირთა
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      
      // წაშალოთ ძველი ფაილი
      if (existingResult.rows[0].image_url) {
        const oldFilePath = path.join(__dirname, '../', existingResult.rows[0].image_url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }
    // თუ არსებული სურათი უნდა დაიტოვოს
    else if (image_url_existing) {
      imageUrl = image_url_existing;
    }

    const result = await db.query(
      `UPDATE equipment 
       SET code_name = $1, quantity = $2, price = $3, description = $4, 
           image_url = $5, updated_by_user_id = $6, updated_at = CURRENT_TIMESTAMP
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ჯერ მივიღოთ სურათის URL
    const existingResult = await db.query('SELECT image_url FROM equipment WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    // წავშალოთ ბაზიდან
    await db.query('DELETE FROM equipment WHERE id = $1', [id]);
    
    // წავშალოთ ფაილიც
    if (existingResult.rows[0].image_url) {
      const filePath = path.join(__dirname, '../', existingResult.rows[0].image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'აღჭურვილობა წარმატებით წაიშალა!' });
  } catch (error) {
    console.error('აღჭურვილობის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის წაშლა ვერ მოხერხდა' });
  }
});

module.exports = router;
