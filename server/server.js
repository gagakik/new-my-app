const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  PORT: PORT
});

// Create necessary directories
const createDirectories = () => {
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/import'),
    path.join(__dirname, 'uploads/participants')
  ];

  directories.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        console.log(`Directory created: ${dir}`);
      } else {
        console.log(`Directory exists: ${dir}`);
      }
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  });
};

// Call directory creation
createDirectories();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'არ გაქვთ ამ მოქმედების ნებართვა' });
    }
    next();
  };
};

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve client build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Handle client-side routing - catch all non-API routes
  app.get('/*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
    } else {
      res.status(404).json({ message: 'API endpoint not found' });
    }
  });
}

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, 'uploads');

    // Check if it's a participant file upload based on the route
    if (req.route && req.route.path && req.route.path.includes('participants')) {
      uploadPath = path.join(__dirname, 'uploads', 'participants');
    } else if (req.route && req.route.path && req.route.path.includes('import')) {
      uploadPath = path.join(__dirname, 'uploads', 'import');
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${timestamp}-${randomNum}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

// Separate multer configuration for participant files
const participantStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads', 'participants');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${timestamp}-${randomNum}${extension}`;
    cb(null, filename);
  }
});

const participantUpload = multer({ storage: participantStorage });

// File download endpoint with proper headers
app.get('/api/download/:filename', authenticateToken, (req, res) => {
  const { filename } = req.params;
  const fullPath = path.join(__dirname, 'uploads', filename);

  // Handle different path formats
  let actualPath = fullPath;

  // If file doesn't exist at direct path, try to find the file in uploads directory recursively
  if (!fs.existsSync(fullPath)) {
    const findFile = (dir, targetFile) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory()) {
          const subDirPath = path.join(dir, file.name);
          const found = findFile(subDirPath, targetFile);
          if (found) return found;
        } else if (file.name === targetFile) {
          return path.join(dir, file.name);
        }
      }
      return null;
    };

    actualPath = findFile(path.join(__dirname, 'uploads'), filename);
    if (!actualPath) {
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }
  }

  const fileName = path.basename(actualPath);
  const ext = path.extname(fileName).toLowerCase();

  // Set proper content type
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.xlsx' || ext === '.xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.doc') contentType = 'application/msword';
  else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.sendFile(actualPath);
});

// Auth routes - Fixed endpoints to match frontend
app.post('/api/register', async (req, res) => {
  try {
    console.log('Registration request received:', { body: req.body });
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'მომხმარებლის სახელი და პაროლი აუცილებელია' });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log('User already exists:', username);
      return res.status(400).json({ message: 'მომხმარებელი უკვე არსებობს' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      [username, hashedPassword, role]
    );

    // Get the created user
    const user = result;

    const createdUser = user.rows[0];
    console.log('User created successfully:', { id: createdUser.id, username: createdUser.username, role: createdUser.role });

    const token = jwt.sign(
      { id: createdUser.id, username: createdUser.username, role: createdUser.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'მომხმარებელი წარმატებით შეიქმნა',
      token,
      role: createdUser.role,
      userId: createdUser.id,
      username: createdUser.username
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received:', { body: req.body, headers: req.headers });
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'მომხმარებლის სახელი და პაროლი აუცილებელია' });
    }

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'არასწორი მომხმარებლის სახელი ან პაროლი' });
    }

    const user = result.rows[0];
    console.log('User found:', { id: user.id, username: user.username, role: user.role });

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ message: 'არასწორი მომხმარებლის სახელი ან პაროლი' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', username);
    res.json({
      message: 'წარმატებით შესვლა',
      token,
      role: user.role,
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
});

// Companies routes - using separate router
const companiesRouter = require('./routes/companies');
app.use('/api/companies', companiesRouter);

// Equipment routes
app.get('/api/equipment', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM equipment e
      LEFT JOIN users u1 ON e.created_by_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_id = u2.id
      ORDER BY e.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('აღჭურვილობის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/equipment', authenticateToken, authorizeRoles('admin', 'operation'), upload.single('image'), async (req, res) => {
  try {
    const { code_name, description, quantity, price } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await db.query(
      'INSERT INTO equipment (code_name, description, quantity, price, image_url, created_by_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [code_name, description, parseInt(quantity), parseFloat(price), image_url, req.user.id]
    );

    res.status(201).json({
      message: 'აღჭურვილობა წარმატებით დაემატა',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('აღჭურვილობის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/equipment/:id', authenticateToken, authorizeRoles('admin', 'operation'), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code_name, description, quantity, price, image_url_existing } = req.body;

    console.log('Equipment update request:', { id, code_name, description, quantity, price });

    // Get current equipment to check existing image
    const currentEquipment = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (currentEquipment.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    let image_url = currentEquipment.rows[0].image_url;

    if (req.file) {
      // Delete old image if exists
      if (image_url && image_url.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = `/uploads/${req.file.filename}`;
    } else if (image_url_existing) {
      // Keep existing image URL if provided
      image_url = image_url_existing;
    }

    const result = await db.query(
      'UPDATE equipment SET code_name = $1, description = $2, quantity = $3, price = $4, image_url = $5, updated_by_id = $6 WHERE id = $7 RETURNING *',
      [code_name, description, parseInt(quantity), parseFloat(price), image_url, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    console.log('Equipment updated successfully:', result.rows[0]);

    res.json({
      message: 'აღჭურვილობა წარმატებით განახლდა',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('აღჭურვილობის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/equipment/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get equipment to delete associated image
    const equipment = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equipment.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
    }

    // Delete image file if exists
    const image_url = equipment.rows[0].image_url;
    if (image_url && image_url.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await db.query('DELETE FROM equipment WHERE id = $1', [id]);
    res.json({ message: 'აღჭურვილობა წარმატებით წაიშალა' });
  } catch (error) {
    console.error('აღჭურვილობის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის წაშლა ვერ მოხერხდა' });
  }
});

// Equipment availability for events
app.get('/api/equipment/availability/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const query = `
      SELECT 
        e.id,
        e.code_name,
        e.quantity,
        e.price,
        e.description,
        e.image_url,
        e.created_at,
        COALESCE(e.created_by_id, e.created_by_user_id) as created_by_user_id,
        COALESCE(e.quantity - COALESCE(SUM(eb.quantity), 0), e.quantity) as available_quantity,
        COALESCE(SUM(eb.quantity), 0) as booked_quantity
      FROM equipment e
      LEFT JOIN event_participants ep ON ep.event_id = $1
      LEFT JOIN equipment_bookings eb ON eb.participant_id = ep.id AND eb.equipment_id = e.id
      GROUP BY e.id, e.code_name, e.quantity, e.price, e.description, e.image_url, e.created_at, e.created_by_id, e.created_by_user_id
      ORDER BY e.code_name
    `;

    const result = await db.query(query, [eventId]);
    res.json(result.rows);
  } catch (error) {
    console.error('აღჭურვილობის ხელმისაწვდომობის შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის ხელმისაწვდომობის მიღება ვერ მოხერხდა' });
  }
});

// Spaces routes
app.get('/api/spaces', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM spaces s
      LEFT JOIN users u1 ON s.created_by_user_id = u1.id
      LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('სივრცეების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სივრცეების მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/spaces', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { category, building_name, description, area_sqm } = req.body;

    const result = await db.query(
      'INSERT INTO spaces (category, building_name, description, area_sqm, created_by_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, building_name, description, parseFloat(area_sqm) || 0, req.user.id]
    );

    res.status(201).json({
      message: 'სივრცე წარმატებით დაემატა',
      space: result.rows[0]
    });
  } catch (error) {
    console.error('სივრცის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'სივრცის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/spaces/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, building_name, description, area_sqm } = req.body;

    const result = await db.query(
      'UPDATE spaces SET category = $1, building_name = $2, description = $3, area_sqm = $4, updated_at = CURRENT_TIMESTAMP, updated_by_user_id = $5 WHERE id = $6 RETURNING *',
      [category, building_name, description, parseFloat(area_sqm) || 0, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სივრცე ვერ მოიძებნა' });
    }

    res.json({
      message: 'სივრცე წარმატებით განახლდა',
      space: result.rows[0]
    });
  } catch (error) {
    console.error('სივრცის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'სივრცის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/spaces/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM spaces WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სივრცე ვერ მოიძებნა' });
    }

    res.json({ message: 'სივრცე წარმატებით წაიშალა' });
  } catch (error) {
    console.error('სივრცის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'სიvრცის წაშლა ვერ მოხერხდა' });
  }
});

// Exhibitions routes
app.get('/api/exhibitions', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        e.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM exhibitions e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('გამოფენების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'გამოფენების მიღება ვერ მოხერხდა' });
  }
});

app.get('/api/exhibitions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM exhibitions WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('გამოფენის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'გამოფენის მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/exhibitions', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { exhibition_name, manager } = req.body;

    const result = await db.query(
      'INSERT INTO exhibitions (exhibition_name, manager, created_by_user_id) VALUES ($1, $2, $3) RETURNING *',
      [exhibition_name, manager, req.user.id]
    );

    res.status(201).json({
      message: 'გამოფენა წარმატებით დაემატა',
      exhibition: result.rows[0]
    });
  } catch (error) {
    console.error('გამოფენის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'გამოფენის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/exhibitions/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { exhibition_name, manager } = req.body;

    const result = await db.query(
      'UPDATE exhibitions SET exhibition_name = $1, manager = $2, updated_by_user_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [exhibition_name, manager, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა' });
    }

    res.json({
      message: 'გამოფენა წარმატებით განახლდა',
      exhibition: result.rows[0]
    });
  } catch (error) {
    console.error('გამოფენის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'გამოფენის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/exhibitions/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM exhibitions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა' });
    }

    res.json({ message: 'გამოფენა წარმატებით წაიშალა' });
  } catch (error) {
    console.error('გამოფენის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'გამოფენის წაშლა ვერ მოხერხდა' });
  }
});

// Events routes - now using annual_services
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.id,
        a.service_name,
        a.description,
        a.year_selection,
        a.start_date,
        a.end_date,
        a.service_type,
        a.is_active,
        a.is_archived,
        a.created_at,
        a.updated_at,
        a.created_by_user_id,
        a.exhibition_id,
        COUNT(DISTINCT ss.space_id) as spaces_count,
        e.exhibition_name
      FROM annual_services a
      LEFT JOIN service_spaces ss ON a.id = ss.service_id
      LEFT JOIN exhibitions e ON a.exhibition_id = e.id
      GROUP BY a.id, a.service_name, a.description, a.year_selection, a.start_date, a.end_date, a.service_type, a.is_active, a.is_archived, a.created_at, a.updated_at, a.created_by_user_id, a.exhibition_id, e.exhibition_name
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('ივენთების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთების მიღება ვერ მოხერხდა' });
  }
});

app.get('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        a.id,
        a.service_name,
        a.description,
        a.year_selection,
        a.start_date,
        a.end_date,
        a.service_type,
        a.is_active,
        a.is_archived,
        a.created_at,
        a.updated_at,
        a.created_by_user_id,
        a.exhibition_id,
        e.exhibition_name
      FROM annual_services a
      LEFT JOIN exhibitions e ON a.exhibition_id = e.id 
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('ივენთის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/events', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { 
      exhibition_id, 
      service_name, 
      description, 
      start_date, 
      end_date, 
      start_time,
      end_time,
      service_type = 'ივენთი',
      year_selection
    } = req.body;

    const result = await db.query(
      `INSERT INTO annual_services (
        exhibition_id, service_name, description, start_date, end_date, 
        start_time, end_time, service_type, year_selection, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        exhibition_id, 
        service_name, 
        description, 
        start_date, 
        end_date, 
        start_time,
        end_time,
        service_type,
        year_selection || new Date().getFullYear(),
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('ივენთის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/events/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      exhibition_id, 
      service_name, 
      description, 
      start_date, 
      end_date, 
      start_time,
      end_time,
      service_type,
      year_selection
    } = req.body;

    const result = await db.query(
      `UPDATE annual_services SET 
        exhibition_id = $1, service_name = $2, description = $3, 
        start_date = $4, end_date = $5, start_time = $6, end_time = $7,
        service_type = $8, year_selection = $9, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $10 RETURNING *`,
      [exhibition_id, service_name, description, start_date, end_date, start_time, end_time, service_type, year_selection, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('ივენთის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM annual_services WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    res.json({ message: 'ივენთი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ივენთის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის წაშლა ვერ მოხერხდა' });
  }
});

// GET: Event Participants List
app.get('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
  const { eventId } = req.params;

  try {
    const query = `
      SELECT 
        ep.*,
        c.company_name,
        c.country,
        c.identification_code,
        c.company_profile,
        u.username as created_by_username
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      LEFT JOIN users u ON ep.created_by_user_id = u.id
      WHERE ep.event_id = $1
      ORDER BY ep.registration_date DESC
    `;

    const result = await db.query(query, [eventId]);
    console.log(`ივენთი ${eventId}: მოიძებნა ${result.rows.length} მონაწილე`);

    // Parse equipment bookings for each participant
    const participants = result.rows.map(participant => {
      try {
        if (participant.equipment_bookings && typeof participant.equipment_bookings === 'string') {
          participant.equipment_bookings = JSON.parse(participant.equipment_bookings);
        }
      } catch (e) {
        participant.equipment_bookings = [];
      }
      return participant;
    });

    res.json(participants);
  } catch (error) {
    console.error('მონაწილეების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'მონაწილეების მიღება ვერ მოხერხდა' });
  }
});

// Event Participants Management
app.post('/api/events/:eventId/participants', 
  authenticateToken, 
  authorizeRoles('admin', 'manager', 'sales', 'marketing'), 
  participantUpload.fields([
    { name: 'invoice_file', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
    { name: 'handover_file', maxCount: 1 }
  ]), 
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { 
        company_id,
        booth_size,
        booth_number,
        payment_amount,
        payment_status,
        registration_status,
        notes,
        equipment_bookings,
        package_id,
        registration_type
      } = req.body;

      console.log('Adding participant for event:', eventId);
      console.log('Request body:', req.body);
      console.log('Files:', req.files);

      // Handle file uploads
      let invoice_file_path = null;
      let contract_file_path = null;
      let handover_file_path = null;

      if (req.files) {
        if (req.files.invoice_file) {
          invoice_file_path = `/uploads/participants/${req.files.invoice_file[0].filename}`;
        }
        if (req.files.contract_file) {
          contract_file_path = `/uploads/participants/${req.files.contract_file[0].filename}`;
        }
        if (req.files.handover_file) {
          handover_file_path = `/uploads/participants/${req.files.handover_file[0].filename}`;
        }
      }

      // Insert participant
      const participantResult = await db.query(
        `INSERT INTO event_participants 
         (event_id, company_id, booth_size, booth_number, payment_amount, payment_status, registration_status, notes, created_by_user_id, invoice_file_path, contract_file_path, handover_file_path, package_id, registration_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [eventId, company_id, booth_size, booth_number, payment_amount, payment_status, registration_status, notes, req.user.id, invoice_file_path, contract_file_path, handover_file_path, package_id || null, registration_type || 'individual']
      );

      const participant = participantResult.rows[0];

      // Handle equipment bookings
      if (equipment_bookings) {
        try {
          const bookings = JSON.parse(equipment_bookings);

          // If package registration, get package equipment first
          let packageEquipment = [];
          if (registration_type === 'package' && package_id) {
            const packageResult = await db.query(`
              SELECT pe.equipment_id, pe.quantity 
              FROM package_equipment pe 
              WHERE pe.package_id = $1
            `, [package_id]);
            packageEquipment = packageResult.rows;
          }

          for (const booking of bookings) {
            // Check if this equipment is from package
            const isFromPackage = packageEquipment.some(pe => 
              pe.equipment_id === booking.equipment_id && pe.quantity >= booking.quantity
            );

            // Insert into equipment bookings for inventory tracking
            await db.query(
              'INSERT INTO equipment_bookings (participant_id, equipment_id, quantity) VALUES ($1, $2, $3)',
              [participant.id, booking.equipment_id, booking.quantity]
            );

            // Insert into participant selected equipment for detailed tracking
            await db.query(
              'INSERT INTO participant_selected_equipment (participant_id, equipment_id, quantity, is_from_package) VALUES ($1, $2, $3, $4)',
              [participant.id, booking.equipment_id, booking.quantity, isFromPackage]
            );
          }
        } catch (bookingError) {
          console.error('Equipment booking error:', bookingError);
        }
      }

      res.status(201).json({
        message: 'მონაწილე წარმატებით დაემატა',
        participant: participant
      });
    } catch (error) {
      console.error('მონაწილის დამატების შეცდომა:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'მონაწილის დამატება ვერ მოხერხდა',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

app.put('/api/events/:eventId/participants/:participantId', 
  authenticateToken, 
  authorizeRoles('admin', 'manager', 'sales', 'marketing'), 
  participantUpload.fields([
    { name: 'invoice_file', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
    { name: 'handover_file', maxCount: 1 }
  ]), 
  async (req, res) => {
    try {
      const { eventId, participantId } = req.params;
      console.log('Update participant request:', { eventId, participantId });
      console.log('Request body:', req.body);

      const { 
        company_id, 
        registration_status, 
        payment_status, 
        booth_number, 
        booth_size, 
        notes,
        contact_person,
        contact_position,
        contact_email,
        contact_phone,
        payment_amount,
        payment_due_date,
        payment_method,
        invoice_number,
        equipment_bookings
      } = req.body;

      // Handle file uploads
      let invoice_file_path = null;
      let contract_file_path = null;
      let handover_file_path = null;

      if (req.files) {
        if (req.files.invoice_file) {
          invoice_file_path = `/uploads/participants/${req.files.invoice_file[0].filename}`;
        }
        if (req.files.contract_file) {
          contract_file_path = `/uploads/participants/${req.files.contract_file[0].filename}`;
        }
        if (req.files.handover_file) {
          handover_file_path = `/uploads/participants/${req.files.handover_file[0].filename}`;
        }
      }

      // Get current participant data to preserve existing file paths
      const currentParticipant = await db.query(
        'SELECT * FROM event_participants WHERE id = $1 AND event_id = $2',
        [participantId, eventId]
      );

      if (currentParticipant.rows.length === 0) {
        return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
      }

      const current = currentParticipant.rows[0];

      // Use new file paths if uploaded, otherwise keep existing ones
      const finalInvoicePath = invoice_file_path || current.invoice_file || current.invoice_file_path;
      const finalContractPath = contract_file_path || current.contract_file || current.contract_file_path;
      const finalHandoverPath = handover_file_path || current.handover_file || current.handover_file_path;

      // Add columns to database if they don't exist
      try {
        await db.query(`
          ALTER TABLE event_participants 
          ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
          ADD COLUMN IF NOT EXISTS contact_position VARCHAR(255),
          ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
          ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
          ADD COLUMN IF NOT EXISTS payment_due_date DATE,
          ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
          ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
          ADD COLUMN IF NOT EXISTS invoice_file VARCHAR(500),
          ADD COLUMN IF NOT EXISTS contract_file VARCHAR(500),
          ADD COLUMN IF NOT EXISTS handover_file VARCHAR(500)
        `);
      } catch (alterError) {
        console.log('Columns might already exist:', alterError.message);
      }

      // Update participant with all required fields
      const result = await db.query(`
        UPDATE event_participants 
        SET company_id = $1, registration_status = $2, payment_status = $3, 
            booth_number = $4, booth_size = $5, notes = $6,
            contact_person = $7, contact_position = $8, contact_email = $9, contact_phone = $10,
            payment_amount = $11, payment_due_date = $12, payment_method = $13,
            invoice_number = $14, invoice_file = $15, contract_file = $16,
            handover_file = $17, booth_category = $18, booth_type = $19, updated_at = CURRENT_TIMESTAMP
        WHERE id = $20 AND event_id = $21 
        RETURNING *
      `, [
        company_id || current.company_id, 
        registration_status || current.registration_status, 
        payment_status || current.payment_status, 
        booth_number || current.booth_number, 
        booth_size || current.booth_size, 
        notes || current.notes,
        contact_person || current.contact_person,
        contact_position || current.contact_position,
        contact_email || current.contact_email,
        contact_phone || current.contact_phone,
        payment_amount ? parseFloat(payment_amount) : current.payment_amount,
        payment_due_date || current.payment_due_date,
        payment_method || current.payment_method,
        invoice_number || current.invoice_number,
        finalInvoicePath,
        finalContractPath,
        finalHandoverPath,
        req.body.booth_category || current.booth_category,
        req.body.booth_type || current.booth_type,
        participantId, eventId
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
      }

      // Handle equipment bookings
      if (equipment_bookings) {
        try {
          // Delete existing bookings
          await db.query('DELETE FROM equipment_bookings WHERE participant_id = $1', [participantId]);

          // Add new bookings
          const bookings = JSON.parse(equipment_bookings);
          for (const booking of bookings) {
            if (booking.equipment_id && booking.quantity > 0) {
              await db.query(
                'INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, unit_price, total_price, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
                [
                  participantId, 
                  booking.equipment_id, 
                  parseInt(booking.quantity), 
                  parseFloat(booking.unit_price),
                  parseFloat(booking.quantity) * parseFloat(booking.unit_price),
                  req.user.id
                ]
              );
            }
          }
        } catch (equipmentError) {
          console.error('Equipment bookings update error:', equipmentError);
          // Don't fail the whole request if equipment booking update fails
        }
      }

      console.log('Participant updated successfully:', result.rows[0].id);
      res.json({
        message: 'მონაწილე წარმატებით განახლდა',
        participant: result.rows[0]
      });
    } catch (error) {
      console.error('მონაწილის განახლების შეცდომა:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'მონაწილის განახლება ვერ მოხერხდა',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

app.delete('/api/events/:eventId/participants/:participantId', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { eventId, participantId } = req.params;

    // Delete equipment bookings first
    await db.query('DELETE FROM equipment_bookings WHERE participant_id = $1', [participantId]);

    // Delete participant
    const result = await db.query(
      'DELETE FROM event_participants WHERE id = $1 AND event_id = $2 RETURNING *',
      [participantId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
    }

    res.json({ message: 'მონაწილე წარმატებით წაიშალა' });
  } catch (error) {
    console.error('მონაწილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'მონაწილის წაშლა ვერ მოხერხდა' });
  }
});

// Get participant equipment bookings
app.get('/api/participants/:participantId/equipment-bookings', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.params;

    const result = await db.query(`
      SELECT 
        eb.*,
        e.code_name as equipment_name,
        e.code_name,
        e.price as current_equipment_price,
        COALESCE(eb.unit_price, e.price) as unit_price,
        (eb.quantity * COALESCE(eb.unit_price, e.price)) as total_price
      FROM equipment_bookings eb
      JOIN equipment e ON eb.equipment_id = e.id
      WHERE eb.participant_id = $1
      ORDER BY eb.id ASC
    `, [participantId]);

    console.log(`Equipment bookings for participant ${participantId}:`, result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('აღჭურვილობის ჯავშნების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის ჯავშნების მიღება ვერ მოხერხდა' });
  }
});

// Event completion endpoint
app.post('/api/events/:eventId/complete', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { eventId } = req.params;

    // First, get all participants and their data
    const participants = await db.query(`
      SELECT 
        ep.*,
        c.company_name,
        c.country,
        c.identification_code
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      WHERE ep.event_id = $1
    `, [eventId]);

    // Create completion records for each participant
    for (const participant of participants.rows) {
      // Get equipment bookings for this participant
      const equipmentBookings = await db.query(`
        SELECT 
          eb.*,
          e.name as equipment_name,
          e.code_name as equipment_code_name
        FROM equipment_bookings eb
        JOIN equipment e ON eb.equipment_id = e.id
        WHERE eb.participant_id = $1
      `, [participant.id]);

      // Insert into event_completion table
      await db.query(`
        INSERT INTO event_completion (
          event_id, 
          participant_id, 
          company_id,
          company_name,
          registration_status,
          payment_status,
          payment_amount,
          payment_method,
          invoice_number,
          booth_number,
          booth_size,
          invoice_file_path,
          contract_file_path,
          handover_file_path,
          equipment_bookings,
          completion_date,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (event_id, participant_id) DO UPDATE SET
          registration_status = EXCLUDED.registration_status,
          payment_status = EXCLUDED.payment_status,
          payment_amount = EXCLUDED.payment_amount,
          payment_method = EXCLUDED.payment_method,
          invoice_number = EXCLUDED.invoice_number,
          booth_number = EXCLUDED.booth_number,
          booth_size = EXCLUDED.booth_size,
          invoice_file_path = EXCLUDED.invoice_file_path,
          contract_file_path = EXCLUDED.contract_file_path,
          handover_file_path = EXCLUDED.handover_file_path,
          equipment_bookings = EXCLUDED.equipment_bookings,
          completion_date = EXCLUDED.completion_date,
          notes = EXCLUDED.notes
      `, [
        eventId,
        participant.id,
        participant.company_id,
        participant.company_name,
        participant.registration_status,
        participant.payment_status,
        participant.payment_amount,
        participant.payment_method,
        participant.invoice_number,
        participant.booth_number,
        participant.booth_size,
        participant.invoice_file_path,
        participant.contract_file_path,
        participant.handover_file_path,
        JSON.stringify(equipmentBookings.rows),
        new Date(),
        participant.notes
      ]);
    }

    // Update event status to completed
    await db.query(
      'UPDATE annual_services SET is_archived = true, archived_at = CURRENT_TIMESTAMP WHERE id = $1',
      [eventId]
    );

    res.json({ 
      message: 'ივენთი წარმატებით დასრულდა და მონაცემები შენახულია',
      participantsCount: participants.rows.length
    });
  } catch (error) {
    console.error('ივენთის დასრულების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის დასრულება ვერ მოხერხდა' });
  }
});

// Get completed event data
app.get('/api/events/:eventId/completion', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(`
      SELECT * FROM event_completion 
      WHERE event_id = $1 
      ORDER BY completion_date DESC
    `, [eventId]);

    res.json(result.rows);
  } catch (error) {
    console.error('დასრულებული ივენთის მონაცემების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'დასრულებული ივენთის მონაცემების მიღება ვერ მოხერხდა' });
  }
});

// Statistics routes
app.get('/api/statistics/general', authenticateToken, async (req, res) => {
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
    res.status(500).json({ message: 'ზოგადი სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// User profile route (for any authenticated user)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('მომხმარებლის პროფილის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'მომხმარებლის პროფილის მიღება ვერ მოხერხდა' });
  }
});

// User management routes
app.get('/api/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        username, 
        role,
        COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
      FROM users 
      ORDER BY COALESCE(created_at, CURRENT_TIMESTAMP) DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('მომხმარებლების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'მომხმარებლების მიღება ვერ მოხერხდა' });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role } = req.body;

    const result = await db.query(
      'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING id, username, role, created_at',
      [username, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('მომხმარებლის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'მომხმარებლის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'საკუთარი თავის წაშლა შეუძლებელია' });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    }

    res.json({ message: 'მომხმარებელი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('მომხმარებლის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'მომხმარებლის წაშლა ვერ მოხერხდა' });
  }
});

// Annual Services routes
app.get('/api/annual-services', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        as_main.*,
        COUNT(DISTINCT ss.space_id) as spaces_count,
        e.exhibition_name
      FROM annual_services as_main
      LEFT JOIN service_spaces ss ON as_main.id = ss.service_id
      LEFT JOIN exhibitions e ON as_main.exhibition_id = e.id
      GROUP BY as_main.id, e.exhibition_name
      ORDER BY as_main.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('სერვისების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვისების მიღება ვერ მოხერხდა' });
  }
});

app.get('/api/annual-services/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        as_main.*,
        e.exhibition_name
      FROM annual_services as_main
      LEFT JOIN exhibitions e ON as_main.exhibition_id = e.id
      WHERE as_main.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('სერვისის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვისის მიღება ვერ მოხერხდა' });
  }
});

app.get('/api/annual-services/:id/details', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get service details
    const serviceResult = await db.query(`
      SELECT 
        as_main.*,
        e.exhibition_name
      FROM annual_services as_main
      LEFT JOIN exhibitions e ON as_main.exhibition_id = e.id
      WHERE as_main.id = $1
    `, [id]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    const service = serviceResult.rows[0];

    // Get associated spaces
    const spacesResult = await db.query(`
      SELECT s.* 
      FROM spaces s
      JOIN service_spaces ss ON s.id = ss.space_id
      WHERE ss.service_id = $1
    `, [id]);

    // Get participants/bookings
    const bookingsResult = await db.query(`
      SELECT 
        ep.*,
        c.company_name
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      WHERE ep.event_id = $1
    `, [id]);

    service.spaces = spacesResult.rows;
    service.bookings = bookingsResult.rows;

    res.json(service);
  } catch (error) {
    console.error('სერვისის დეტალების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სერვისის დეტალების მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/annual-services', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  try {
    const { 
      service_name, 
      description, 
      year_selection, 
      start_date, 
      end_date, 
      start_time,
      end_time,
      service_type = 'გამოფენა',
      is_active = true,
      exhibition_id,
      space_ids = [],
      selected_spaces = [],
      selected_companies = []
    } = req.body;

    console.log('Creating event with data:', {
      service_name, exhibition_id, space_ids, selected_spaces, selected_companies
    });

    const result = await db.query(
      `INSERT INTO annual_services (
        service_name, description, year_selection, start_date, end_date, 
        start_time, end_time, service_type, is_active, exhibition_id, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        service_name, description, year_selection, start_date, end_date,
        start_time, end_time, service_type, is_active, exhibition_id, req.user.id
      ]
    );

    const service = result.rows[0];

    // Use selected_spaces if available, fallback to space_ids
    const spacesToAdd = selected_spaces.length > 0 ? selected_spaces : space_ids;

    // Add space associations
    for (const spaceId of spacesToAdd) {
      try {
        await db.query(
          'INSERT INTO service_spaces (service_id, space_id) VALUES ($1, $2)',
          [service.id, spaceId]
        );
        console.log(`Added space ${spaceId} to service ${service.id}`);
      } catch (spaceError) {
        console.error(`Error adding space ${spaceId}:`, spaceError);
      }
    }

    let registeredCompanies = 0;

    // Auto-register companies if exhibition_id is provided and companies are selected
    if (exhibition_id && selected_companies && selected_companies.length > 0) {
      console.log(`Auto-registering ${selected_companies.length} companies for event ${service.id}`);

      for (const companyId of selected_companies) {
        try {
          // Check if company is already registered for this event
          const existingParticipant = await db.query(
            'SELECT id FROM event_participants WHERE event_id = $1 AND company_id = $2',
            [service.id, companyId]
          );

          if (existingParticipant.rows.length === 0) {
            await db.query(
              `INSERT INTO event_participants (
                event_id, company_id, registration_status, payment_status, 
                registration_date, created_by_user_id
              ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
              [service.id, companyId, 'მონაწილეობის მოთხოვნა', 'მომლოდინე', req.user.id]
            );
            registeredCompanies++;
            console.log(`Registered company ${companyId} for event ${service.id}`);
          } else {
            console.log(`Company ${companyId} already registered for event ${service.id}`);
          }
        } catch (companyError) {
          console.error(`Error registering company ${companyId}:`, companyError);
        }
      }
    }

    res.status(201).json({
      message: 'სერვისი წარმატებით დაემატა',
      service,
      registeredCompanies
    });
  } catch (error) {
    console.error('სერვისის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'სერვისის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/annual-services/:id', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      service_name, 
      description, 
      year_selection, 
      start_date, 
      end_date, 
      start_time,
      end_time,
      service_type,
      is_active,
      exhibition_id,
      space_ids = [],
      selected_spaces = []
    } = req.body;

    console.log('Updating event with data:', {
      id, service_name, exhibition_id, space_ids, selected_spaces
    });

    const result = await db.query(
      `UPDATE annual_services SET 
        service_name = $1, description = $2, year_selection = $3, 
        start_date = $4, end_date = $5, start_time = $6, end_time = $7,
        service_type = $8, is_active = $9, exhibition_id = $10, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $11 RETURNING *`,
      [
        service_name, description, year_selection, start_date, end_date,
        start_time, end_time, service_type, is_active, exhibition_id, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    const service = result.rows[0];

    // Use selected_spaces if available, fallback to space_ids
    const spacesToUpdate = selected_spaces.length > 0 ? selected_spaces : space_ids;

    // Update space associations - first remove existing ones
    await db.query('DELETE FROM service_spaces WHERE service_id = $1', [id]);

    // Add new space associations
    for (const spaceId of spacesToUpdate) {
      try {
        await db.query(
          'INSERT INTO service_spaces (service_id, space_id) VALUES ($1, $2)',
          [id, spaceId]
        );
        console.log(`Updated space ${spaceId} for service ${id}`);
      } catch (spaceError) {
        console.error(`Error updating space ${spaceId}:`, spaceError);
      }
    }

    res.json({
      message: 'სერვისი წარმატებით განახლდა',
      service
    });
  } catch (error) {
    console.error('სერვისის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'სერვისის განახლება ვერ მოხერხდა' });
  }
});

app.put('/api/annual-services/:id/archive', authenticateToken, authorizeRoles('admin', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE annual_services SET is_archived = TRUE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    res.json({ 
      message: 'სერვისი წარმატებით არქივში გადაიტანა',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Archive service error:', error);
    res.status(500).json({ message: 'სერვისის არქივში გადატანა ვერ მოხერხდა' });
  }
});

// Restore annual service from archive
app.put('/api/annual-services/:id/restore', authenticateToken, authorizeRoles('admin', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE annual_services SET is_archived = FALSE WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    res.json({ 
      message: 'სერვისი წარმატებით აღდგა არქივიდან',
      service: result.rows[0]
    });
  } catch (error) {
    console.error('Restore service error:', error);
    res.status(500).json({ message: 'სერვისის არქივიდან აღდგენა ვერ მოხერხდა' });
  }
});

// Delete annual service - only admin can delete
app.delete('/api/annual-services/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Attempting to delete annual service with ID: ${id}`);

    // Check if the service exists first
    const serviceCheck = await db.query('SELECT * FROM annual_services WHERE id = $1', [id]);
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    // Delete in correct order to handle foreign key constraints
    try {
      // 1. Delete participant selected equipment first
      await db.query(`
        DELETE FROM participant_selected_equipment 
        WHERE participant_id IN (SELECT id FROM event_participants WHERE event_id = $1)
      `, [id]);
      console.log('Deleted participant selected equipment');

      // 2. Delete equipment bookings
      await db.query(`
        DELETE FROM equipment_bookings 
        WHERE participant_id IN (SELECT id FROM event_participants WHERE event_id = $1)
      `, [id]);
      console.log('Deleted equipment bookings');

      // 3. Delete event completion records
      await db.query('DELETE FROM event_completion WHERE event_id = $1', [id]);
      console.log('Deleted event completion records');

      // 4. Delete event participants
      await db.query('DELETE FROM event_participants WHERE event_id = $1', [id]);
      console.log('Deleted event participants');

      // 5. Delete service spaces
      await db.query('DELETE FROM service_spaces WHERE service_id = $1', [id]);
      console.log('Deleted service spaces');

      // 6. Finally delete the annual service
      const result = await db.query('DELETE FROM annual_services WHERE id = $1 RETURNING *', [id]);
      console.log('Deleted annual service:', result.rows[0]);

      res.json({ message: 'სერვისი წარმატებით წაიშალა' });
    } catch (deleteError) {
      console.error('Detailed deletion error:', deleteError);
      console.error('Error code:', deleteError.code);
      console.error('Error detail:', deleteError.detail);

      // More specific error handling
      if (deleteError.code === '23503') {
        return res.status(400).json({ 
          message: 'სერვისის წაშლა შეუძლებელია, რადგან მასთან დაკავშირებული მონაცემები არსებობს' 
        });
      }

      throw deleteError;
    }
  } catch (error) {
    console.error('Annual service deletion error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'სერვისის წაშლა ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get event files
app.get('/api/events/:id/files', authenticateToken, async (req, res) => {
  const eventId = req.params.id;

  try {
    const result = await db.query('SELECT * FROM annual_services WHERE id = $1', [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const event = result.rows[0];

    res.json({
      planFile: event.plan_file_path,
      invoiceFiles: event.invoice_files || [],
      expenseFiles: event.expense_files || []
    });
  } catch (error) {
    console.error('ივენთის ფაილების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ივენთის ფაილების მიღება ვერ მოხერხდა' });
  }
});

// Event file management endpoints
app.post('/api/events/:id/upload-plan', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('plan_file'), async (req, res) => {
  const eventId = req.params.id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');

    await db.query(`
      UPDATE annual_services 
      SET plan_file_path = $1, plan_uploaded_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [filePath, req.user.username, eventId]);

    res.json({ message: 'გეგმის ფაილი წარმატებით აიტვირთა' });
  } catch (error) {
    console.error('გეგმის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'გეგმის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

// Upload single invoice file
app.post('/api/events/:id/upload-invoice', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('invoice_file'), async (req, res) => {
  const eventId = req.params.id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const fileName = req.body.file_name || req.file.originalname;

    // Get current invoice files
    const result = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [eventId]);
    const currentFiles = result.rows[0]?.invoice_files || [];

    // Add new file
    const newFile = {
      name: fileName,
      path: filePath,
      size: req.file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: req.user.username
    };

    const updatedFiles = [...currentFiles, newFile];

    await db.query(`
      UPDATE annual_services 
      SET invoice_files = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedFiles), eventId]);

    res.json({ message: 'ინვოისის ფაილი წარმატებით აიტვირთა' });
  } catch (error) {
    console.error('ინვოისის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ინვოისის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

// Upload single expense file
app.post('/api/events/:id/upload-expense', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('expense_file'), async (req, res) => {
  const eventId = req.params.id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const fileName = req.body.file_name || req.file.originalname;

    // Get current expense files
    const result = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [eventId]);
    const currentFiles = result.rows[0]?.expense_files || [];

    // Add new file
    const newFile = {
      name: fileName,
      path: filePath,
      size: req.file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: req.user.username
    };

    const updatedFiles = [...currentFiles, newFile];

    await db.query(`
      UPDATE annual_services 
      SET expense_files = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedFiles), eventId]);

    res.json({ message: 'ხარჯის ფაილი წარმატებით აიტვირთა' });
  } catch (error) {
    console.error('ხარჯის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ხარჯის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

// Delete plan file
app.delete('/api/events/:id/delete-plan', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  const eventId = req.params.id;

  try {
    await db.query(`
      UPDATE annual_services 
      SET plan_file_path = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [eventId]);

    res.json({ message: 'გეგმის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('გეგმის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'გეგმის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

// Delete invoice file
app.delete('/api/events/:id/delete-invoice/:fileName', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  const eventId = req.params.id;
  const fileName = req.params.fileName;

  try {
    // Get current invoice files
    const result = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [eventId]);
    const currentFiles = result.rows[0]?.invoice_files || [];

    // Remove the file
    const updatedFiles = currentFiles.filter(file => file.name !== fileName);

    await db.query(`
      UPDATE annual_services 
      SET invoice_files = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedFiles), eventId]);

    res.json({ message: 'ინვოისის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ინვოისის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ინვოისის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

// Delete expense file
app.delete('/api/events/:id/delete-expense/:fileName', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  const eventId = req.params.id;
  const fileName = req.params.fileName;

  try {
    // Get current expense files
    const result = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [eventId]);
    const currentFiles = result.rows[0]?.expense_files || [];

    // Remove the file
    const updatedFiles = currentFiles.filter(file => file.name !== fileName);

    await db.query(`
      UPDATE annual_services 
      SET expense_files = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedFiles), eventId]);

    res.json({ message: 'ხარჯის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ხარჯის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ხარჯის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

app.post('/api/events/:id/upload-plan', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('plan_file'), async (req, res) => {
  try {
    const { id: eventId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const relativePath = filePath.replace(path.join(__dirname, 'uploads').replace(/\\/g, '/'), '');

    // Get username for plan_uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    await db.query(
      'UPDATE annual_services SET plan_file_path = $1, plan_uploaded_by = $2, plan_updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [relativePath, username, eventId]
    );

    res.json({ 
      message: 'გეგმის ფაილი წარმატებით ატვირთულია',
      filePath: relativePath
    });
  } catch (error) {
    console.error('Plan file upload error:', error);
    res.status(500).json({ message: 'ფაილის ატვირთვისას მოხდა შეცდომა' });
  }
});

app.post('/api/events/:id/upload-invoice', authenticateToken, upload.single('invoice_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = req.body.file_name || req.file.originalname;

    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const relativePath = filePath.replace(path.join(__dirname, 'uploads').replace(/\\/g, '/'), '');

    // Get username for uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Get current invoice files
    const currentEvent = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [id]);
    let invoiceFiles = currentEvent.rows[0]?.invoice_files || [];

    // Find and delete existing file with same name if it exists
    const existingFileIndex = invoiceFiles.findIndex(f => f.name === fileName);
    if (existingFileIndex !== -1) {
      const oldFile = invoiceFiles[existingFileIndex];
      if (oldFile.path && oldFile.path.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, oldFile.path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      invoiceFiles.splice(existingFileIndex, 1);
    }

    const newFile = {
      name: fileName,
      path: relativePath,
      uploaded_at: new Date().toISOString(),
      size: req.file.size,
      uploaded_by: username
    };

    invoiceFiles.push(newFile);

    await db.query(
      'UPDATE annual_services SET invoice_files = $1, files_updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(invoiceFiles), id]
    );

    res.json({
      message: 'ინვოისის ფაილი წარმატებით ატვირთულია',
      file: newFile
    });
  } catch (error) {
    console.error('ინვოისის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

app.post('/api/events/:id/upload-expense', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('expense_file'), async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = req.body.file_name || req.file.originalname;

    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const filePath = req.file.path.replace(/\\/g, '/');
    const relativePath = filePath.replace(path.join(__dirname, 'uploads').replace(/\\/g, '/'), '');

    // Get username for uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Get current expense files
    const currentEvent = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [id]);
    let expenseFiles = currentEvent.rows[0]?.expense_files || [];

    // Find and delete existing file with same name if it exists
    const existingFileIndex = expenseFiles.findIndex(f => f.name === fileName);
    if (existingFileIndex !== -1) {
      const oldFile = expenseFiles[existingFileIndex];
      if (oldFile.path && oldFile.path.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, oldFile.path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      expenseFiles.splice(existingFileIndex, 1);
    }

    const newFile = {
      name: fileName,
      path: relativePath,
      uploaded_at: new Date().toISOString(),
      size: req.file.size,
      uploaded_by: username
    };

    expenseFiles.push(newFile);

    await db.query(
      'UPDATE annual_services SET expense_files = $1, files_updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(expenseFiles), id]
    );

    res.json({
      message: 'ხარჯების ფაილი წარმატებით ატვირთულია',
      file: newFile
    });
  } catch (error) {
    console.error('ხარჯების ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-invoice/:fileName', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id, fileName } = req.params;

    const currentEvent = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [id]);
    if (currentEvent.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    let invoiceFiles = currentEvent.rows[0]?.invoice_files || [];
    const fileIndex = invoiceFiles.findIndex(f => f.name === fileName);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }

    const fileToDelete = invoiceFiles[fileIndex];

    // Delete physical file
    if (fileToDelete.path && fileToDelete.path.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, fileToDelete.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove from array
    invoiceFiles.splice(fileIndex, 1);

    await db.query(
      'UPDATE annual_services SET invoice_files = $1, files_updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(invoiceFiles), id]
    );

    res.json({ message: 'ინვოისის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ინვოისის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის წაშლა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-expense/:fileName', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id, fileName } = req.params;

    const currentEvent = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [id]);
    if (currentEvent.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    let expenseFiles = currentEvent.rows[0]?.expense_files || [];
    const fileIndex = expenseFiles.findIndex(f => f.name === fileName);

    if (fileIndex === -1) {
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }

    const fileToDelete = expenseFiles[fileIndex];

    // Delete physical file
    if (fileToDelete.path && fileToDelete.path.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, fileToDelete.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove from array
    expenseFiles.splice(fileIndex, 1);

    await db.query(
      'UPDATE annual_services SET expense_files = $1, files_updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(expenseFiles), id]
    );

    res.json({ message: 'ხარჯების ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ხარჯების ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის წაშლა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-plan', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete plan request for event:', id);

    // First check if database has plan_uploaded_by column
    let currentEvent;
    try {
      currentEvent = await db.query('SELECT plan_file_path, plan_uploaded_by FROM annual_services WHERE id = $1', [id]);
    } catch (columnError) {
      console.log('plan_uploaded_by column may not exist, trying without it');
      currentEvent = await db.query('SELECT plan_file_path FROM annual_services WHERE id = $1', [id]);
    }

    if (currentEvent.rows.length === 0) {
      console.log('Event not found:', id);
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const planFilePath = currentEvent.rows[0].plan_file_path;
    console.log('Plan file path:', planFilePath);

    if (!planFilePath) {
      console.log('No plan file found for event:', id);
      return res.status(404).json({ message: 'გეგმის ფაილი ვერ მოიძებნა' });
    }

    // Delete physical file
    try {
      let filePathToDelete;

      if (planFilePath.startsWith('/uploads/')) {
        filePathToDelete = path.join(__dirname, planFilePath);
      } else if (planFilePath.startsWith('uploads/')) {
        filePathToDelete = path.join(__dirname, planFilePath);
      } else {
        filePathToDelete = path.join(__dirname, 'uploads', planFilePath);
      }

      console.log('Attempting to delete file at:', filePathToDelete);

      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
        console.log('Physical file deleted successfully');
      } else {
        console.log('Physical file not found at path:', filePathToDelete);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Continue with database update even if file deletion fails
    }

    // Update database to remove plan file reference
    try {
      await db.query(
        'UPDATE annual_services SET plan_file_path = NULL, plan_updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (updateError) {
      console.log('plan_updated_at column may not exist, trying simpler update');
      await db.query(
        'UPDATE annual_services SET plan_file_path = NULL WHERE id = $1',
        [id]
      );
    }

    console.log('Plan file record deleted from database');
    res.json({ message: 'გეგმის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('გეგმის ფაილის წაშლის შეცდომა:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'ფაილის წაშლა ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Database cleanup endpoint
app.post('/api/cleanup/image-urls', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    console.log('იწყება ძველი სურათების URL-ების გასწორება...');

    // აღჭურვილობის ცხრილში URL-ების გასწორება
    const equipmentResult = await db.query(`
      SELECT id, image_url FROM equipment 
      WHERE image_url LIKE 'http://0.0.0.0:5000/uploads/%'
    `);

    let updatedEquipment = 0;
    for (const equipment of equipmentResult.rows) {
      const oldUrl = equipment.image_url;
      const newUrl = oldUrl.replace('http://0.0.0.0:5000/uploads/', '/uploads/');

      await db.query(
        'UPDATE equipment SET image_url = $1 WHERE id = $2',
        [newUrl, equipment.id]
      );

      updatedEquipment++;
    }

    // event_participants ცხრილში ფაილების URL-ების გასწორება
    const participantsResult = await db.query(`
      SELECT id, invoice_file_path, contract_file_path, handover_file_path 
      FROM event_participants 
      WHERE invoice_file_path LIKE 'http://0.0.0.0:5000/uploads/%'
         OR contract_file_path LIKE 'http://0.0.0.0:5000/uploads/%'
         OR handover_file_path LIKE 'http://0.0.0.0:5000/uploads/%'
    `);

    let updatedParticipants = 0;
    for (const participant of participantsResult.rows) {
      let updateFields = [];
      let updateValues = [];
      let paramCount = 1;

      if (participant.invoice_file_path && participant.invoice_file_path.startsWith('http://0.0.0.0:5000/uploads/')) {
        updateFields.push(`invoice_file_path = $${paramCount++}`);
        updateValues.push(participant.invoice_file_path.replace('http://0.0.0.0:5000/uploads/', '/uploads/'));
      }

      if (participant.contract_file_path && participant.contract_file_path.startsWith('http://0.0.0.0:5000/uploads/')) {
        updateFields.push(`contract_file_path = $${paramCount++}`);
        updateValues.push(participant.contract_file_path.replace('http://0.0.0.0:5000/uploads/', '/uploads/'));
      }

      if (participant.handover_file_path && participant.handover_file_path.startsWith('http://0.0.0.0:5000/uploads/')) {
        updateFields.push(`handover_file_path = $${paramCount++}`);
        updateValues.push(participant.handover_file_path.replace('http://0.0.0.0:5000/uploads/', '/uploads/'));
      }

      if (updateFields.length > 0) {
        updateValues.push(participant.id);
        await db.query(
          `UPDATE event_participants SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          updateValues
        );
        updatedParticipants++;
      }
    }

    res.json({
      message: 'ბაზის გასწორება წარმატებით დასრულდა',
      updatedEquipment,
      updatedParticipants
    });
  } catch (error) {
    console.error('ბაზის გასწორების შეცდომა:', error);
    res.status(500).json({ message: 'ბაზის გასწორება ვერ მოხერხდა' });
  }
});

// Start server
const initializeAndTestDB = async () => {
  try {
    // Initialize database tables
    await db.initializeDatabase();

    // Test connection
    const result = await db.query('SELECT COUNT(*) FROM companies');
    console.log('ბაზასთან კავშირი წარმატებულია, კომპანიების რაოდენობა:', result.rows[0].count);
  } catch (error) {
    console.error('DB Error:', error);
  }
};

app.listen(PORT, '0.0.0.0', () => {
  console.log(`სერვერი გაშვებულია პორტზე ${PORT}`);
  initializeAndTestDB();
});


// User Companies Report - რამდენი კომპანია აქვს თითოეულ იუზერს დარეგისტრირებული
app.get('/api/reports/user-companies', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.username,
        COUNT(c.id) as companies_count,
        MAX(u2.username) as last_updated_by,
        MAX(c.updated_at) as last_update_date
      FROM users u
      LEFT JOIN companies c ON u.id = c.created_by_user_id
      LEFT JOIN users u2 ON c.updated_by_user_id = u2.id
      GROUP BY u.id, u.username
      HAVING COUNT(c.id) > 0
      ORDER BY companies_count DESC, u.username
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('იუზერების კომპანიების სტატისტიკის შეცდომა:', error);
    res.status(500).json({ message: 'იუზერების სტატისტიკის მიღება ვერ მოხერხდა' });
  }
});

// Event Financials Report - ივენთების მიხედვით ფინანსური ანალიზი
app.get('/api/reports/event-financials', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        as1.service_name as event_name,
        COUNT(ep.id) as participants_count,
        COALESCE(SUM(CASE WHEN ep.payment_status = 'გადახდილი' THEN ep.payment_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN ep.payment_status != 'გადახდილი' THEN ep.payment_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(ep.payment_amount), 0) as total_expected
      FROM annual_services as1
      LEFT JOIN event_participants ep ON as1.id = ep.event_id
      WHERE as1.is_archived = FALSE
      GROUP BY as1.id, as1.service_name
      HAVING COUNT(ep.id) > 0
      ORDER BY total_paid DESC, as1.service_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('ივენთების ფინანსური ანალიზის შეცდომა:', error);
    res.status(500).json({ message: 'ივენთების ფინანსური ანალიზის მიღება ვერ მოხერხდა' });
  }
});


// User Analysis Report - (For future implementation)
app.get('/api/reports/user-analysis', authenticateToken, async (req, res) => {
  try {
    // Placeholder for user analysis report logic
    res.json({ message: 'User analysis report endpoint is not yet implemented.' });
  } catch (error) {
    console.error('User analysis report error:', error);
    res.status(500).json({ message: 'User analysis report could not be retrieved.' });
  }
});

// Bookings routes
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        b.*,
        e.exhibition_name,
        c.company_name,
        u.username as created_by
      FROM bookings b
      LEFT JOIN exhibitions e ON b.exhibition_id = e.id
      LEFT JOIN companies c ON b.company_id = c.id
      LEFT JOIN users u ON b.created_by_user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('ჯავშნების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ჯავშნების მიღება ვერ მოხერხდა' });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { 
      exhibition_id, 
      company_id, 
      booking_date, 
      start_time, 
      end_time, 
      notes 
    } = req.body;

    const result = await db.query(
      `INSERT INTO bookings (
        exhibition_id, company_id, booking_date, 
        start_time, end_time, notes, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [exhibition_id, company_id, booking_date, start_time, end_time, notes, req.user.id]
    );

    res.status(201).json({
      message: 'ჯავშანი წარმატებით დაემატა',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('ჯავშნის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'ჯავშნის დამატება ვერ მოხერხდა' });
  }
});

app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      exhibition_id, 
      company_id, 
      booking_date, 
      start_time, 
      end_time, 
      notes 
    } = req.body;

    const result = await db.query(
      `UPDATE bookings SET 
        exhibition_id = $1, company_id = $2, 
        booking_date = $3, start_time = $4, end_time = $5, 
        notes = $6, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $7 RETURNING *`,
      [exhibition_id, company_id, booking_date, start_time, end_time, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა' });
    }

    res.json({
      message: 'ჯავშანი წარმატებით განახლდა',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('ჯავშნის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'ჯავშნის განახლება ვერ მოხერხდა' });
  }
});

app.delete('/api/bookings/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა' });
    }

    res.json({ message: 'ჯავშანი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ჯავშნის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ჯავშნის წაშლა ვერ მოხერხდა' });
  }
});

// Routes
const companiesRoutes = require('./routes/companies');
const equipmentRoutes = require('./routes/equipment');
const importRoutes = require('./routes/import');
const statisticsRoutes = require('./routes/statistics');
const packagesRoutes = require('./routes/packages');
const reportsRoutes = require('./routes/reports');

app.use('/api/companies', companiesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/packages', authenticateToken, packagesRoutes);
app.use('/api/reports', reportsRoutes);

// Multer error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'ფაილი ძალიან დიდია',
                details: 'მაქსიმალური ზომა 5MB'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'ძალიან ბევრი ფაილი',
                details: 'მხოლოდ ერთი ფაილის ატვირთვა შესაძლებელია'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'მოულოდნელი ფაილის ველი',
                details: 'გამოიყენეთ "excelFile" ველის სახელი'
            });
        }
        return res.status(400).json({
            error: 'ფაილის ატვირთვის შეცდომა',
            details: error.message
        });
    }
    next(error);
});