const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const FileStorageService = require('./services/fileStorage');

// Replit Object Storage (თუ ხელმისაწვდომია)
let objectStorageClient = null;
try {
  const { Client } = require('@replit/object-storage');
  objectStorageClient = new Client();
  console.log('Object Storage client initialized');
} catch (err) {
  console.log('Object Storage not available, using local storage');
}

require('dotenv').config();

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

const app = express();
const PORT = process.env.PORT || 5000;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the uploads directory exists
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    // Ensure the participant uploads directory exists
    const participantUploadDir = path.join(__dirname, 'uploads', 'participants');
    if (!fs.existsSync(participantUploadDir)) {
      fs.mkdirSync(participantUploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Original filename might be useful, but using a unique name is safer
    // cb(null, file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

const participantUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const participantUploadDir = path.join(__dirname, 'uploads', 'participants');
      if (!fs.existsSync(participantUploadDir)) {
        fs.mkdirSync(participantUploadDir);
      }
      cb(null, participantUploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});


// Initialize file storage service - Defaulting to 'database' as per the original setup
const fileStorage = new FileStorageService('database');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (including uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get event files endpoint
app.get('/api/events/:id/files', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting files for event ID:', id);

    // First ensure required columns exist
    try {
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_file_path VARCHAR(500)
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_uploaded_by VARCHAR(255)
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_uploaded_at TIMESTAMP
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS invoice_files TEXT
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS expense_files TEXT
      `);
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS files_updated_at TIMESTAMP
      `);
      console.log('Ensured file columns exist');
    } catch (alterError) {
      console.log('File columns might already exist:', alterError.message);
    }

    const result = await db.query(`
      SELECT 
        plan_file_path, 
        plan_uploaded_by,
        plan_uploaded_at,
        plan_updated_at,
        invoice_files,
        expense_files,
        files_updated_at
      FROM annual_services 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      console.log('Event not found for ID:', id);
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const event = result.rows[0];
    console.log('Event found, file data:', {
      plan_file_path: event.plan_file_path,
      invoice_files_type: typeof event.invoice_files,
      expense_files_type: typeof event.expense_files
    });

    // Parse JSON files safely
    let invoiceFiles = [];
    let expenseFiles = [];

    try {
      if (event.invoice_files) {
        if (typeof event.invoice_files === 'string') {
          invoiceFiles = JSON.parse(event.invoice_files);
        } else if (Array.isArray(event.invoice_files)) {
          invoiceFiles = event.invoice_files;
        }
      }
    } catch (e) {
      console.error('Error parsing invoice files:', e);
      invoiceFiles = [];
    }

    try {
      if (event.expense_files) {
        if (typeof event.expense_files === 'string') {
          expenseFiles = JSON.parse(event.expense_files);
        } else if (Array.isArray(event.expense_files)) {
          expenseFiles = event.expense_files;
        }
      }
    } catch (e) {
      console.error('Error parsing expense files:', e);
      expenseFiles = [];
    }

    const response = {
      plan_file_path: event.plan_file_path,
      plan_uploaded_by: event.plan_uploaded_by,
      plan_uploaded_at: event.plan_uploaded_at,
      invoice_files: invoiceFiles,
      expense_files: expenseFiles
    };

    console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Get event files error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'სერვერის შეცდომა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// File download endpoint
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    console.log('Download request for file:', filename);
    console.log('Full file path:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found at path:', filePath);
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }

    // Get file stats for proper headers
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileExtension === '.doc') {
      contentType = 'application/msword';
    } else if (fileExtension === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    } else if (fileExtension === '.gif') {
      contentType = 'image/gif';
    } else if (fileExtension === '.bmp') {
      contentType = 'image/bmp';
    } else if (fileExtension === '.webp') {
      contentType = 'image/webp';
    }

    console.log('Serving file with content type:', contentType);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamError) => {
      console.error('File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ message: 'ფაილის ჩამოტვირთვის შეცდომა' });
      }
    });
    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'ფაილის ჩამოტვირთვის შეცდომა' });
  }
});

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

// Event file upload endpoints
app.post('/api/events/:id/upload-plan', authenticateToken, upload.single('plan_file'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'გეგმის ფაილი არ არის მითითებული' });
    }

    // Create relative path for database storage
    const relativePath = `/uploads/${file.filename}`;
    console.log('Plan file saved at:', relativePath);

    // Get username for plan_uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Check if event exists and get current data
    const eventCheck = await db.query('SELECT * FROM annual_services WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    console.log('Event found:', eventCheck.rows[0]);

    // Ensure plan_file_path column exists
    try {
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_file_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS plan_uploaded_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP
      `);
      console.log('Ensured plan columns exist');
    } catch (alterError) {
      console.log('Columns might already exist:', alterError.message);
    }

    // Update event with plan file path
    try {
      await db.query(
        'UPDATE annual_services SET plan_file_path = $1, plan_uploaded_by = $2, plan_updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [relativePath, username, eventId]
      );
    } catch (columnError) {
      console.log('Some columns may not exist, trying simpler update');
      await db.query(
        'UPDATE annual_services SET plan_file_path = $1 WHERE id = $2',
        [relativePath, eventId]
      );
    }

    res.json({ message: 'გეგმის ფაილი წარმატებით ატვირთულია' });
  } catch (error) {
    console.error('გეგმის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'გეგმის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

app.post('/api/events/:id/upload-invoice', authenticateToken, upload.single('invoice_file'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const file = req.file;
    const fileName = req.body.file_name || file.originalname;

    if (!file) {
      return res.status(400).json({ message: 'ინვოისის ფაილი არ არის მითითებული' });
    }

    // Create relative path for database storage
    const relativePath = `/uploads/${file.filename}`;
    console.log('Invoice file saved at:', relativePath);

    // Get username for uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Check if event exists
    const eventCheck = await db.query('SELECT id FROM annual_services WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    // Add to event's invoice files
    const result = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [eventId]);
    let invoiceFiles = result.rows[0]?.invoice_files || [];

    if (typeof invoiceFiles === 'string') {
      try {
        invoiceFiles = JSON.parse(invoiceFiles);
      } catch (e) {
        invoiceFiles = [];
      }
    }

    const newFile = {
      name: fileName,
      path: relativePath,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: username
    };

    invoiceFiles.push(newFile);

    await db.query(
      'UPDATE annual_services SET invoice_files = $1 WHERE id = $2',
      [JSON.stringify(invoiceFiles), eventId]
    );

    res.json({ message: 'ინვოისის ფაილი წარმატებით ატვირთულია' });
  } catch (error) {
    console.error('ინვოისის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ინვოისის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

app.post('/api/events/:id/upload-expense', authenticateToken, upload.single('expense_file'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const file = req.file;
    const fileName = req.body.file_name || file.originalname;

    if (!file) {
      return res.status(400).json({ message: 'ხარჯის ფაილი არ არის მითითებული' });
    }

    // Create relative path for database storage
    const relativePath = `/uploads/${file.filename}`;
    console.log('Expense file saved at:', relativePath);

    // Get username for uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Check if event exists
    const eventCheck = await db.query('SELECT id FROM annual_services WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    // Add to event's expense files
    const result = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [eventId]);
    let expenseFiles = result.rows[0]?.expense_files || [];

    if (typeof expenseFiles === 'string') {
      try {
        expenseFiles = JSON.parse(expenseFiles);
      } catch (e) {
        expenseFiles = [];
      }
    }

    const newFile = {
      name: fileName,
      path: relativePath,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      uploaded_by: username
    };

    expenseFiles.push(newFile);

    await db.query(
      'UPDATE annual_services SET expense_files = $1 WHERE id = $2',
      [JSON.stringify(expenseFiles), eventId]
    );

    res.json({ message: 'ხარჯის ფაილი წარმატებით ატვირთულია' });
  } catch (error) {
    console.error('ხარჯის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ხარჯის ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

// File delete endpoints
app.delete('/api/events/:id/delete-plan', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;

    // Check if plan_file_path exists before attempting to delete
    const currentEvent = await db.query('SELECT plan_file_path FROM annual_services WHERE id = $1', [eventId]);
    if (currentEvent.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const planFilePath = currentEvent.rows[0].plan_file_path;

    // If file path exists, attempt to delete the physical file
    if (planFilePath) {
      const filePathToDelete = path.join(__dirname, planFilePath);
      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
        console.log(`Deleted physical plan file: ${filePathToDelete}`);
      } else {
        console.log(`Physical plan file not found at: ${filePathToDelete}`);
      }
    }

    // Update database to remove the file path and uploaded by info
    await db.query(
      'UPDATE annual_services SET plan_file_path = NULL, plan_uploaded_by = NULL, plan_updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [eventId]
    );

    res.json({ message: 'გეგმის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('გეგმის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'გეგმის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-invoice/:fileName', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const fileName = decodeURIComponent(req.params.fileName);

    const result = await db.query('SELECT invoice_files FROM annual_services WHERE id = $1', [eventId]);
    let invoiceFiles = result.rows[0]?.invoice_files || [];

    if (typeof invoiceFiles === 'string') {
      try {
        invoiceFiles = JSON.parse(invoiceFiles);
      } catch (e) {
        invoiceFiles = [];
      }
    }

    const initialLength = invoiceFiles.length;
    const filteredFiles = invoiceFiles.filter(f => f.name !== fileName);

    if (filteredFiles.length === initialLength) {
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }

    // Find the deleted file to get its path for physical deletion
    const deletedFile = invoiceFiles.find(f => f.name === fileName);
    if (deletedFile && deletedFile.path) {
      const filePathToDelete = path.join(__dirname, deletedFile.path);
      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
      }
    }

    await db.query(
      'UPDATE annual_services SET invoice_files = $1 WHERE id = $2',
      [JSON.stringify(filteredFiles), eventId]
    );

    res.json({ message: 'ინვოისის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ინვოისის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ინვოისის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-expense/:fileName', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const fileName = decodeURIComponent(req.params.fileName);

    const result = await db.query('SELECT expense_files FROM annual_services WHERE id = $1', [eventId]);
    let expenseFiles = result.rows[0]?.expense_files || [];

    if (typeof expenseFiles === 'string') {
      try {
        expenseFiles = JSON.parse(expenseFiles);
      } catch (e) {
        expenseFiles = [];
      }
    }

    // Filter out the file to delete
    const filteredFiles = expenseFiles.filter(f => f.name !== fileName);

    if (filteredFiles.length === expenseFiles.length) {
      return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    }

    // Find the deleted file to get its path for physical deletion
    const deletedFile = expenseFiles.find(f => f.name === fileName);
    if (deletedFile && deletedFile.path) {
      const filePathToDelete = path.join(__dirname, deletedFile.path);
      if (fs.existsSync(filePathToDelete)) {
        fs.unlinkSync(filePathToDelete);
      }
    }

    await db.query(
      'UPDATE annual_services SET expense_files = $1 WHERE id = $2',
      [JSON.stringify(filteredFiles), eventId]
    );

    res.json({ message: 'ხარჯის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ხარჯის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ხარჯის ფაილის წაშლა ვერ მოხერხდა' });
  }
});

// File download endpoint with proper headers
app.get('/api/download/:folder/:filename', authenticateToken, (req, res) => {
  const { folder, filename } = req.params;
  const filePath = path.join(folder, filename);
  const fullPath = path.join(__dirname, 'uploads', filePath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
  }

  const fileName = path.basename(fullPath);
  const ext = path.extname(fileName).toLowerCase();

  // Set proper content type
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.xlsx' || ext === '.xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.doc') contentType = 'application/msword';
  else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.gif') contentType = 'image/gif';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.txt') contentType = 'text/plain';
  else if (ext === '.csv') contentType = 'text/csv';


  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.sendFile(fullPath);
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

// Universal file upload endpoint
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    const { relatedTable, relatedId } = req.body;

    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(req.file.originalname);
    const filename = `${req.file.fieldname}-${timestamp}-${randomNum}${extension}`;

    const savedFile = await fileStorage.saveFile(
      req.file.buffer,
      filename,
      req.file.originalname,
      req.file.mimetype,
      relatedTable,
      relatedId,
      req.user.id
    );

    res.json({
      message: 'ფაილი წარმატებით ატვირთულია',
      file: savedFile
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      message: 'ფაილის ატვირთვისას მოხდა შეცდომა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// File download endpoint
app.get('/api/files/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await fileStorage.getFile(fileId);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.size);

    res.send(file.data);
  } catch (error) {
    console.error('File download error:', error);
    if (error.message === 'File not found') {
      res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    } else {
      res.status(500).json({ message: 'ფაილის ჩამოტვირთვისას მოხდა შეცდომა' });
    }
  }
});

// File delete endpoint
app.delete('/api/files/:fileId', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { fileId } = req.params;

    await fileStorage.deleteFile(fileId);

    res.json({ message: 'ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('File delete error:', error);
    if (error.message === 'File not found') {
      res.status(404).json({ message: 'ფაილი ვერ მოიძებნა' });
    } else {
      res.status(500).json({ message: 'ფაილის წაშლისას მოხდა შეცდომა' });
    }
  }
});

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
    const { exhibition_name, manager, price_per_sqm = 0 } = req.body;

    const result = await db.query(
      'INSERT INTO exhibitions (exhibition_name, manager, price_per_sqm, created_by_user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [exhibition_name, manager, parseFloat(price_per_sqm) || 0, req.user.id]
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
    const { exhibition_name, manager, price_per_sqm } = req.body;

    const result = await db.query(
      'UPDATE exhibitions SET exhibition_name = $1, manager = $2, price_per_sqm = $3, updated_by_user_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [exhibition_name, manager, parseFloat(price_per_sqm) || 0, req.user.id, id]
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
        COUNT(DISTINCT ss.space_id) as spaces_count,
        e.exhibition_name,
        e.price_per_sqm
      FROM annual_services a
      LEFT JOIN service_spaces ss ON a.id = ss.service_id
      LEFT JOIN exhibitions e ON a.exhibition_id = e.id
      GROUP BY a.id, a.service_name, a.description, a.year_selection, a.start_date, a.end_date, a.service_type, a.is_active, a.is_archived, a.created_at, a.updated_at, a.created_by_user_id, a.exhibition_id, e.exhibition_name, e.price_per_sqm
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

    // First ensure required columns exist
    try {
      await db.query(`
        ALTER TABLE annual_services 
        ADD COLUMN IF NOT EXISTS plan_file_path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS plan_uploaded_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS invoice_files TEXT,
        ADD COLUMN IF NOT EXISTS expense_files TEXT,
        ADD COLUMN IF NOT EXISTS files_updated_at TIMESTAMP
      `);
    } catch (alterError) {
      console.log('Columns might already exist');
    }

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
        a.plan_file_path,
        a.plan_uploaded_by,
        a.plan_updated_at,
        a.invoice_files,
        a.expense_files,
        a.files_updated_at,
        e.exhibition_name,
        e.price_per_sqm
      FROM annual_services a
      LEFT JOIN exhibitions e ON a.exhibition_id = e.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const event = result.rows[0];

    // Parse JSON fields
    try {
      if (event.invoice_files && typeof event.invoice_files === 'string') {
        event.invoice_files = JSON.parse(event.invoice_files);
      } else if (!event.invoice_files) {
        event.invoice_files = [];
      }
    } catch (e) {
      event.invoice_files = [];
    }

    try {
      if (event.expense_files && typeof event.expense_files === 'string') {
        event.expense_files = JSON.parse(event.expense_files);
      } else if (!event.expense_files) {
        event.expense_files = [];
      }
    } catch (e) {
      event.expense_files = [];
    }

    console.log('Event data with files:', {
      id: event.id,
      plan_file_path: event.plan_file_path,
      invoice_files: event.invoice_files,
      expense_files: event.expense_files
    });

    res.json(event);
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
        `INSERT INTO event_participants (
         event_id, company_id, booth_size, booth_number, payment_amount, payment_status, registration_status, notes, created_by_user_id, invoice_file_path, contract_file_path, handover_file_path, package_id, registration_type)
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
    console.log('Getting annual services...');

    // First ensure price_per_sqm column exists in exhibitions table
    try {
      await db.query(`ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS price_per_sqm DECIMAL(10,2) DEFAULT 0`);
      console.log('price_per_sqm column ensured in exhibitions table');
    } catch (alterError) {
      console.log('price_per_sqm column already exists or error:', alterError.message);
    }

    // First check if annual_services table exists and has data
    const tableCheck = await db.query(`
      SELECT COUNT(*) as count FROM annual_services
    `);
    console.log('Annual services count:', tableCheck.rows[0].count);

    const result = await db.query(`
      SELECT
        a.id,
        a.service_name,
        a.description,
        a.year_selection,
        a.start_date,
        a.end_date,
        a.start_time,
        a.end_time,
        a.service_type,
        a.is_active,
        a.is_archived,
        a.exhibition_id,
        a.created_at,
        a.updated_at,
        a.created_by_user_id,
        COALESCE(COUNT(DISTINCT ss.space_id), 0) as spaces_count,
        COALESCE(e.exhibition_name, 'უცნობი გამოფენა') as exhibition_name
      FROM annual_services a
      LEFT JOIN service_spaces ss ON a.id = ss.service_id
      LEFT JOIN exhibitions e ON a.exhibition_id = e.id
      GROUP BY
        a.id,
        a.service_name,
        a.description,
        a.year_selection,
        a.start_date,
        a.end_date,
        a.start_time,
        a.end_time,
        a.service_type,
        a.is_active,
        a.is_archived,
        a.exhibition_id,
        a.created_at,
        a.updated_at,
        a.created_by_user_id,
        e.exhibition_name
      ORDER BY COALESCE(a.created_at, CURRENT_TIMESTAMP) DESC
    `);

    console.log('Annual services query successful, rows:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('სერვისების მიღების შეცდომა:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'სერვისების მიღება ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/annual-services/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT
        as_main.*,
        e.exhibition_name,
        e.price_per_sqm
      FROM annual_services as_main
      LEFT JOIN exhibitions e ON as_main.exhibition_id = e.id
      WHERE as_main.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    const service = result.rows[0];

    // Ensure file data is properly formatted
    console.log('Service files data:', {
      plan_file_path: service.plan_file_path,
      invoice_files: service.invoice_files,
      expense_files: service.expense_files
    });

    res.json(service);
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
        e.exhibition_name,
        e.price_per_sqm
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

    console.log('Updating annual service with ID:', id);
    console.log('Request body:', req.body);

    // Get current service data first
    const currentService = await db.query('SELECT * FROM annual_services WHERE id = $1', [id]);
    if (currentService.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა' });
    }

    const current = currentService.rows[0];

    // Use current values as defaults if new values are not provided
    const updateData = {
      service_name: service_name || current.service_name,
      description: description !== undefined ? description : current.description,
      year_selection: year_selection || current.year_selection || new Date().getFullYear(),
      start_date: start_date || current.start_date,
      end_date: end_date || current.end_date,
      start_time: start_time !== undefined ? start_time : current.start_time,
      end_time: end_time !== undefined ? end_time : current.end_time,
      service_type: service_type || current.service_type || 'ივენთი',
      is_active: is_active !== undefined ? is_active : current.is_active,
      exhibition_id: exhibition_id !== undefined ? exhibition_id : current.exhibition_id
    };

    console.log('Update data prepared:', updateData);

    const result = await db.query(
      `UPDATE annual_services SET
        service_name = $1, description = $2, year_selection = $3,
        start_date = $4, end_date = $5, start_time = $6, end_time = $7,
        service_type = $8, is_active = $9, exhibition_id = $10, updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 RETURNING *`,
      [
        updateData.service_name,
        updateData.description,
        updateData.year_selection,
        updateData.start_date,
        updateData.end_date,
        updateData.start_time,
        updateData.end_time,
        updateData.service_type,
        updateData.is_active,
        updateData.exhibition_id,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისის განახლება ვერ მოხერხდა' });
    }

    const service = result.rows[0];

    // Use selected_spaces if available, fallback to space_ids
    const spacesToUpdate = selected_spaces.length > 0 ? selected_spaces : space_ids;

    // Update space associations only if spaces are provided
    if (spacesToUpdate.length > 0) {
      // First remove existing ones
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
    }

    console.log('Annual service updated successfully:', service.id);

    res.json({
      message: 'სერვისი წარმატებით განახლდა',
      service
    });
  } catch (error) {
    console.error('სერვისის განახლების შეცდომა:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'სერვისის განახლება ვერ მოხერხდა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Event file management endpoints
app.post('/api/events/:id/upload-plan', authenticateToken, authorizeRoles('admin', 'manager', 'sales', 'marketing'), upload.single('plan_file'), async (req, res) => {
  const { id: eventId } = req.params;

  try {
    console.log('Plan upload request for event:', eventId);
    console.log('File received:', req.file ? req.file.filename : 'No file');

    if (!req.file) {
      return res.status(400).json({ message: 'ფაილი არ არის ატვირთული' });
    }

    // Create relative path for database storage
    const relativePath = `/uploads/${req.file.filename}`;
    console.log('File saved at:', relativePath);

    // Get username for plan_uploaded_by field
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0]?.username || 'Unknown';

    // Check if event exists
    const eventCheck = await db.query('SELECT id FROM annual_services WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    // Try to update with plan_uploaded_by and plan_updated_at columns
    try {
      await db.query(
        'UPDATE annual_services SET plan_file_path = $1, plan_uploaded_by = $2, plan_updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [relativePath, username, eventId]
      );
    } catch (columnError) {
      console.log('Some columns may not exist, trying simpler update');
      await db.query(
        'UPDATE annual_services SET plan_file_path = $1 WHERE id = $2',
        [relativePath, eventId]
      );
    }

    console.log('Plan file successfully updated in database');
    res.json({
      message: 'გეგმის ფაილი წარმატებით ატვირთულია',
      filePath: relativePath
    });
  } catch (error) {
    console.error('Plan file upload error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'ფაილის ატვირთვისას მოხდა შეცდომა',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

app.post('/api/events/:id/upload-expense', authenticateToken, upload.single('expense_file'), async (req, res) => {
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
      message: 'ხარჯის ფაილი წარმატებით ატვირთულია',
      file: newFile
    });
  } catch (error) {
    console.error('ხარჯის ფაილის ატვირთვის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის ატვირთვა ვერ მოხერხდა' });
  }
});

app.delete('/api/events/:id/delete-plan', authenticateToken, async (req, res) => {
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

app.delete('/api/events/:id/delete-invoice/:fileName', authenticateToken, async (req, res) => {
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

app.delete('/api/events/:id/delete-expense/:fileName', authenticateToken, async (req, res) => {
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
    console.error('ხარჯის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ფაილის წაშლა ვერ მოხერხდა' });
  }
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`სერვერი მუშაობს ${HOST}:${PORT}`);
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

// Routes
const equipmentRoutes = require('./routes/equipment');
const importRoutes = require('./routes/import');
const packagesRoutes = require('./routes/packages');
const reportsRoutes = require('./routes/reports');
const statisticsRoutes = require('./routes/statistics');
const companiesRoutes = require('./routes/companies');

app.use('/api/companies', companiesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/packages', authenticateToken, packagesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/statistics', statisticsRoutes);