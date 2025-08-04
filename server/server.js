require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 5000);

// uploads ფოლდერის შექმნა
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('uploads ფოლდერი შეიქმნა:', uploadsDir);
    } catch (error) {
        console.error('uploads ფოლდერის შექმნის შეცდომა:', error);
    }
}

// ფოლდერის უფლებების დაყენება
try {
    fs.chmodSync(uploadsDir, 0o755);
    console.log('uploads ფოლდერს მიენიჭა სწორი უფლებები');
} catch (error) {
    console.error('uploads ფოლდერის უფლებების დაყენების შეცდომა:', error);
}

// CORS configuration for Replit environment
app.use(cors({
    origin: ['http://localhost:5173', 'https://*.replit.dev', 'https://*.replit.app'],
    credentials: true
}));
app.use(express.json());

// Production-ში static files-ების სერვირება
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // React router-ისთვის catch-all handler
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
        }
    });
}

// --- multer კონფიგურაცია სურათების ატვირთვისთვის ---
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, 'uploads');

        // თუ ეს participants-ის ფაილია, ცალკე საქაღალდეში შევინახოთ
        if (req.url && req.url.includes('participants')) {
            uploadPath = path.join(__dirname, 'uploads', 'participants');
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // ფაილის ტიპის მიხედვით პრეფიქსის დაყენება
        let prefix = 'file';
        if (file.fieldname === 'invoice_file') prefix = 'invoice';
        else if (file.fieldname === 'contract_file') prefix = 'contract';
        else if (file.fieldname === 'handover_file') prefix = 'handover';
        else if (file.mimetype.startsWith('image/')) prefix = 'img';

        cb(null, prefix + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ 
    storage: multerStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB ლიმიტი
    },
    fileFilter: (req, file, cb) => {
        const imageTypes = /jpeg|jpg|png|gif|webp/;
        const documentTypes = /pdf|xlsx|xls/;
        const extname = path.extname(file.originalname).toLowerCase();
        const isImage = imageTypes.test(extname) && imageTypes.test(file.mimetype);
        const isDocument = documentTypes.test(extname) && (
            file.mimetype.includes('pdf') || 
            file.mimetype.includes('spreadsheet') || 
            file.mimetype.includes('excel') ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel'
        );

        if (isImage || isDocument) {
            return cb(null, true);
        } else {
            cb(new Error('მხოლოდ სურათების (jpg, png, gif, webp) ან დოკუმენტების (pdf, xlsx, xls) ფაილები დაშვებულია!'));
        }
    }
});

// სურათის ატვირთვის ფუნქცია
function uploadImage(file) {
    // ყოველთვის შედარებითი მისამართის გამოყენება
    return `/uploads/${file.filename}`;
}

// სტატიკური საქაღალდე ატვირთული სურათებისთვის
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- middleware-ის შექმნა ტოკენის შესამოწმებლად ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'ავტორიზაციის ტოკენი არ არის მოწოდებული.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'არასწორი ან ვადაგასული ავტორიზაციის ტოკენი.' });
        }
        req.user = user; // მომხმარებლის მონაცემების დამატება მოთხოვნაში (id, username, role)
        next();
    });
}

// დამხმარე ფუნქცია როლის შემოწმებისთვის (კომპანიების მართვა)
const authorizeCompanyManagement = (req, res, next) => {
    const allowedRoles = ['admin', 'sales']; // მხოლოდ admin და sales
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ კომპანიების მართვის უფლება.' });
    }
    next();
};


// დამხმარე ფუნქცია როლის შემოწმებისთვის (კომპანიების მართვა)
const authorizeSpaceManagement = (req, res, next) => {
    const allowedRoles = ['admin', 'sales']; // მხოლოდ admin და sales
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ კომპანიების მართვის უფლება.' });
    }
    next();
};

// დამხმარე ფუნქცია როლის შემოწმებისთვის (აღჭურვილობის მართვა)
const authorizeEquipmentManagement = (req, res, next) => {
    const allowedRoles = ['admin', 'operation'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ აღჭურვილობის მართვის უფლება.' });
    }
    next();
};


// API ენდპოინტი მომხმარებლის რეგისტრაციისთვის
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const defaultRole = 'user';
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, defaultRole]
    );
    res.status(201).json({ message: 'რეგისტრაცია წარმატებით დასრულდა.', user: result.rows[0] });
  } catch (error) {
    console.error('შეცდომა რეგისტრაციისას:', error);
    res.status(500).json({ message: 'რეგისტრაცია ვერ მოხერხდა.', error: error.message });
  }
});

// API ენდპოინტი მომხმარებლის ავტორიზაციისთვის
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).json({ message: 'შესვლა წარმატებით დასრულდა.', role: user.role, token: token, userId: user.id, username: user.username });
      } else {
        res.status(401).json({ message: 'არასწორი პაროლი.' });
      }
    } else {
      res.status(401).json({ message: 'მომხმარებელი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა ავტორიზაციისას:', error);
    res.status(500).json({ message: 'შესვლა ვერ მოხერხდა.', error: error.message });
  }
});

// GET: მომხმარებლების სიის მიღება (მხოლოდ ადმინისთვის)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ ხართ ადმინი.' });
  }
  try {
    const result = await db.query('SELECT id, username, role FROM users ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა მომხმარებლების სიის მიღებისას:', error);
    res.status(500).json({ message: 'მომხმარებლების სიის მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// PUT: მომხმარებლის როლის განახლება (მხოლოდ ადმინისთვის)
app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ ხართ ადმინი.' });
  }
  const { id } = req.params;
  const { role } = req.body;
  try {
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ message: 'მომხმარებლის როლი წარმატებით განახლდა.', user: result.rows[0] });
    } else {
      res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა მომხმარებლის როლის განახლებისას:', error);
    res.status(500).json({ message: 'მომხმარებლის როლის განახლება ვერ მოხერხდა.', error: error.message });
  }
});

// DELETE: მომხმარებლის წაშლა (მხოლოდ ადმინისთვის)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ ხართ ადმინი.' });
  }
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'მომხმარებელი წარმატებით წაიშალა.' });
    } else {
      res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა მომხმარებლის წაშლისას:', error);
    res.status(500).json({ message: 'მომხმარებლის წაშლა ვერ მოხერხდა.', error: error.message });
  }
});

// GET: ყველა გამოფენის მიღება
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
      ORDER BY e.id ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა გამოფენების მიღებისას:', error);
    res.status(500).json({ message: 'გამოფენების მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// POST: ახალი გამოფენის დამატება
app.post('/api/exhibitions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'sales' && req.user.role !== 'marketing') {
    return res.status(403).json({ error: 'წვდომა აკრძალულია.' });
  }
  const { exhibition_name, comment, manager } = req.body;
  const created_by_user_id = req.user.id;

  try {
    const result = await db.query(
      'INSERT INTO exhibitions (exhibition_name, comment, manager, created_by_user_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [exhibition_name, comment, manager, created_by_user_id]
    );
    res.status(201).json({ message: 'გამოფენა წარმატებით დაემატა!', exhibition: result.rows[0] });
  } catch (error) {
    console.error('შეცდომა გამოფენის დამატებისას:', error);
    res.status(500).json({ message: 'გამოფენის დამატება ვერ მოხერხდა.', error: error.message });
  }
});

// PUT: გამოფენის განახლება
app.put('/api/exhibitions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'sales' && req.user.role !== 'marketing') {
    return res.status(403).json({ error: 'წვდომა აკრძალულია.' });
  }
  const { id } = req.params;
  const { exhibition_name, comment, manager } = req.body;
  const updated_by_user_id = req.user.id;

  try {
    const result = await db.query(
      'UPDATE exhibitions SET exhibition_name = $1, comment = $2, manager = $3, updated_by_user_id = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [exhibition_name, comment, manager, updated_by_user_id, id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'გამოფენა წარმატებით განახლდა!', exhibition: result.rows[0] });
    } else {
      res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა გამოფენის განახლებისას:', error);
    res.status(500).json({ message: 'გამოფენის განახლება ვერ მოხერხდა.', error: error.message });
  }
});

// DELETE: გამოფენის წაშლა ID-ის მიხედვით
app.delete('/api/exhibitions/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ გამოფენების მართვის უფლება.' });
  }
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM exhibitions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'გამოფენა წარმატებით წაიშალა.' });
    } else {
      res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა გამოფენის წაშლისას:', error);
    res.status(500).json({ message: 'გამოფენის წაშლა ვერ მოხერხდა.', error: error.message });
  }
});

// --- აღჭურვილობის API ენდპოინტები ---



// GET: ყველა აღჭურვილობის მიღება (ყველა ავტორიზებული მომხმარებლისთვის)
app.get('/api/equipment', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM equipment ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა აღჭურვილობის მიღებისას:', error);
        res.status(500).json({ message: 'აღჭურვილობის მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი აღჭურვილობის დამატება (მხოლოდ admin, operation)
app.post('/api/equipment', authenticateToken, authorizeEquipmentManagement, upload.single('image'), async (req, res) => {
    const { code_name, quantity, price, description } = req.body;

    let image_url = null;
    if (req.file) {
        image_url = uploadImage(req.file);
    }

    const created_by_user_id = req.user.id; 

    try {
        const result = await db.query(
            'INSERT INTO equipment (code_name, quantity, price, description, image_url, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [code_name, quantity, price, description, image_url, created_by_user_id]
        );
        res.status(201).json({ message: 'აღჭურვილობა წარმატებით დაემატა.', equipment: result.rows[0] });
    } catch (error) {
        console.error('შეცდომა აღჭურვილობის დამატებისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'აღჭვილობა ამ კოდური სახელით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'აღჭურვილობის დამატება ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: აღჭურვილობის რედაქტირება ID-ის მიხედვით (მხოლოდ admin, operation)
app.put('/api/equipment/:id', authenticateToken, authorizeEquipmentManagement, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { code_name, quantity, price, description } = req.body;
    let image_url = req.body.image_url_existing || null;

    if (req.file) {
        image_url = uploadImage(req.file);
    }

    try {
        const result = await db.query(
            'UPDATE equipment SET code_name = $1, quantity = $2, price = $3, description = $4, image_url = $5 WHERE id = $6 RETURNING *',
            [code_name, quantity, price, description, image_url, id]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'აღჭურვილობა წარმატებით განახლდა.', equipment: result.rows[0] });
        } else {
            res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა აღჭურვილობის განახლებისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'აღჭვილობა ამ კოდური სახელით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'აღჭურვილობის განახლება ვერ მოხერხდა.', error: error.message });
    }
});

// DELETE: აღჭურვილობის წაშლა ID-ის მიხედვით (მხოლოდ admin, operation)
app.delete('/api/equipment/:id', authenticateToken, authorizeEquipmentManagement, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'აღჭურვილობა წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა აღჭურვილობის წაშლისას:', error);
        res.status(500).json({ message: 'აღჭურვილობის წაშლა ვერ მოხერხდა.', error: error.message });
    }
});


// --- კომპანიების API ენდპოინტები ---

// GET: ყველა კომპანიის მიღება (ფილტრაციით და ძიებით)
app.get('/api/companies', authenticateToken, async (req, res) => {
    const { searchTerm, country, profile, status, identification_code } = req.query;
    let query = `SELECT 
        c.*,
        creator.username as created_by_username,
        updater.username as updated_by_username
        FROM companies c
        LEFT JOIN users creator ON c.created_by_user_id = creator.id
        LEFT JOIN users updater ON c.updated_by_user_id = updater.id
        WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
        query += ` AND c.company_name ILIKE $${paramIndex}`;
        values.push(`%${searchTerm}%`);
        paramIndex++;
    }
    if (country) {
        query += ` AND c.country = $${paramIndex}`;
        values.push(country);
        paramIndex++;
    }
    if (profile) {
        query += ` AND c.company_profile ILIKE $${paramIndex}`;
        values.push(`%${profile}%`);
        paramIndex++;
    }
    if (status) {
        query += ` AND c.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
    }
    if (identification_code) {
        query += ` AND c.identification_code ILIKE $${paramIndex}`;
        values.push(`%${identification_code}%`);
        paramIndex++;
    }

    query += ' ORDER BY c.id ASC';

    try {
        const result = await db.query(query, values);

        // თითოეული კომპანიისთვის გამოფენების მიღება
        for (let company of result.rows) {
            const exhibitionsResult = await db.query(`
                SELECT e.id, e.exhibition_name 
                FROM exhibitions e
                JOIN company_exhibitions ce ON e.id = ce.exhibition_id
                WHERE ce.company_id = $1
            `, [company.id]);

            company.exhibitions = exhibitionsResult.rows.map(e => e.id);
            company.exhibition_names = exhibitionsResult.rows.map(e => e.exhibition_name);
        }

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა კომპანიების მიღებისას:', error);
        res.status(500).json({ message: 'კომპანიების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი კომპანიის დამატება (მხოლოდ admin, sales)
app.post('/api/companies', authenticateToken, authorizeCompanyManagement, async (req, res) => {
    const { 
        company_name, country, company_profile, identification_code, legal_address,
        contact_persons, // შეცვლილია: ახალი ველი JSONB-ისთვის
        website, comment, status, selected_exhibitions
    } = req.body;
    const created_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
        // კომპანიის დამატება
        const result = await db.query(
            `INSERT INTO companies (
                company_name, country, company_profile, identification_code, legal_address,
                contact_persons, 
                website, comment, status, created_by_user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                company_name, country, company_profile, identification_code, legal_address,
                JSON.stringify(contact_persons), // JSONB ველისთვის
                website, comment, status, created_by_user_id
            ]
        );

        const company = result.rows[0];

        // გამოფენების კავშირების დამატება
        if (selected_exhibitions && selected_exhibitions.length > 0) {
            for (const exhibitionId of selected_exhibitions) {
                await db.query(
                    'INSERT INTO company_exhibitions (company_id, exhibition_id) VALUES ($1, $2)',
                    [company.id, exhibitionId]
                );
            }
        }

        res.status(201).json({ message: 'კომპანია წარმატებით დაემატა.', company });
    } catch (error) {
        console.error('შეცდომა კომპანიის დამატებისას:', error);
        if (error.code === '23505') { // UNIQUE CONSTRAINT VIOLATION for identification_code
            return res.status(409).json({ message: 'კომპანია ამ საიდენტიფიკაციო კოდით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'კომპანიის დამატება ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: კომპანიის რედაქტირება ID-ის მიხედვით (მხოლოდ admin, sales)
app.put('/api/companies/:id', authenticateToken, authorizeCompanyManagement, async (req, res) => {
    const { id } = req.params;
    const { 
        company_name, country, company_profile, identification_code, legal_address,
        contact_persons, // შეცვლილია: ახალი ველი JSONB-ისთვის
        website, comment, status, selected_exhibitions
    } = req.body;
    const updated_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
        // კომპანიის განახლება
        const result = await db.query(
            `UPDATE companies SET 
                company_name = $1, country = $2, company_profile = $3, identification_code = $4, legal_address = $5,
                contact_persons = $6, 
                website = $7, comment = $8, status = $9, 
                updated_at = CURRENT_TIMESTAMP, updated_by_user_id = $10
            WHERE id = $11 RETURNING *`,
            [
                company_name, country, company_profile, identification_code, legal_address,
                JSON.stringify(contact_persons), // JSONB ველისთვის
                website, comment, status, updated_by_user_id, id
            ]
        );

        if (result.rows.length > 0) {
            // არსებული გამოფენების კავშირების წაშლა
            await db.query('DELETE FROM company_exhibitions WHERE company_id = $1', [id]);

            // ახალი გამოფენების კავშირების დამატება
            if (selected_exhibitions && selected_exhibitions.length > 0) {
                for (const exhibitionId of selected_exhibitions) {
                    await db.query(
                        'INSERT INTO company_exhibitions (company_id, exhibition_id) VALUES ($1, $2)',
                        [id, exhibitionId]
                    );
                }
            }

            res.status(200).json({ message: 'კომპანია წარმატებით განახლდა.', company: result.rows[0] });
        } else {
            res.status(404).json({ message: 'კომპანია ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა კომპანიის განახლებისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'კომპანია ამ საიდენტიფიკაციო კოდით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'კომპანიის განახლება ვერ მოხერხდა.', error: error.message });
    }
});

// DELETE: კომპანიის წაშლა ID-ის მიხედვით (მხოლოდ admin, sales)
app.delete('/api/companies/:id', authenticateToken, authorizeCompanyManagement, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'კომპანია წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'კომპანია ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა კომპანიის წაშლისას:', error);
        res.status(500).json({ message: 'კომპანიის წაშლა ვერ მოხერხდა.', error: error.message });
    }
});

// --- სივრცეების API ენდპოინტები ---

// GET: ყველა სივრცის მიღება (ყველა ავტორიზებული მომხმარებლისთვის)
app.get('/api/spaces', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM spaces ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა სივრცეების მიღებისას:', error);
        res.status(500).json({ message: 'სივრცეების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი სივრცის დამატება (მხოლოდ admin, manager)
app.post('/api/spaces', authenticateToken, authorizeSpaceManagement, async (req, res) => {
    const { category, building_name, description, area_sqm } = req.body;
    const created_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
        const result = await db.query(
            'INSERT INTO spaces (category, building_name, description, area_sqm, created_by_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [category, building_name, description, area_sqm, created_by_user_id]
        );
        res.status(201).json({ message: 'სივრცე წარმატებით დაემატა.', space: result.rows[0] });
    } catch (error) {
        console.error('შეცდომა სივრცის დამატებისას:', error);
        if (error.code === '23505') { // UNIQUE CONSTRAINT VIOLATION (თუ დაემატება)
            return res.status(409).json({ message: 'სივრცე ამ კოდური სახელით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'სივრცის დამატება ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: სივრცის რედაქტირება ID-ის მიხედვით (მხოლოდ admin, manager)
app.put('/api/spaces/:id', authenticateToken, authorizeSpaceManagement, async (req, res) => {
    const { id } = req.params;
    const { category, building_name, description, area_sqm } = req.body;
    const updated_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
        const result = await db.query(
            'UPDATE spaces SET category = $1, building_name = $2, description = $3, area_sqm = $4, updated_at = CURRENT_TIMESTAMP, updated_by_user_id = $5 WHERE id = $6 RETURNING *',
            [category, building_name, description, area_sqm, updated_by_user_id, id]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'სივრცე წარმატებით განახლდა.', space: result.rows[0] });
        } else {
            res.status(404).json({ message: 'სივრცე ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა სივრცის განახლებისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'სივრცე ამ კოდური სახელით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'სივრცის განახლება ვერ მოხერხდა.', error: error.message });
    }
});

// DELETE: სივრცის წაშლა ID-ის მიხედვით (მხოლოდ admin, manager)
app.delete('/api/spaces/:id', authenticateToken, authorizeSpaceManagement, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM spaces WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'სივრცე წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'სივრცე ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა სივრცის წაშლისას:', error);
        res.status(500).json({ message: 'სივრცის წაშლა ვერ მოხერხდა.', error: error.message });
    }
});

// ივენთების ცალკე API endpoint
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    console.log('Events endpoint called');

    // ჯერ შევამოწმოთ annual_services ცხრილი არსებობს თუ არა
    const tableCheckResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'annual_services'
      );
    `);

    if (!tableCheckResult.rows[0].exists) {
      console.log('annual_services table does not exist, returning exhibitions as events');
      // თუ annual_services ცხრილი არ არსებობს, გამოფენები დავაბრუნოთ როგორც ივენთები
      const result = await db.query('SELECT * FROM exhibitions ORDER BY id ASC');
      return res.status(200).json(result.rows);
    }

    // თუ ცხრილი არსებობს, ივენთების ფილტრაცია
    const query = `
      SELECT s.*, 
             COALESCE(ss.spaces_count, 0) as spaces_count,
             COALESCE(b.bookings_count, 0) as bookings_count
      FROM annual_services s
      LEFT JOIN (
        SELECT service_id, COUNT(*) as spaces_count 
        FROM service_spaces 
        GROUP BY service_id
      ) ss ON s.id = ss.service_id
      LEFT JOIN (
        SELECT service_id, COUNT(*) as bookings_count 
        FROM bookings 
        GROUP BY service_id
      ) b ON s.id = b.service_id
      WHERE (
        s.service_type::text ILIKE '%ივენთ%' OR 
        s.service_type::text ILIKE '%event%' OR 
        s.service_type::text ILIKE '%ფესტივალ%' OR 
        s.service_type::text ILIKE '%festival%' OR 
        s.service_type::text ILIKE '%კონფერენც%' OR 
        s.service_type::text ILIKE '%conference%' OR 
        s.service_type::text ILIKE '%შოუ%' OR 
        s.service_type::text ILIKE '%show%' OR 
        s.service_type::text ILIKE '%გამოფენ%' OR 
        s.service_type::text ILIKE '%exhibition%'
      )
      ORDER BY s.created_at DESC
    `;

    const result = await db.query(query);
    console.log('Events endpoint called, returning:', result.rows.length, 'events');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'ივენთების მიღება ვერ მოხერხდა', error: error.message });
  }
});



// --- ივენთის მონაწილეების API ენდპოინტები ---

// GET: ივენთის მონაწილეების მიღება
app.get('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
    const { eventId } = req.params;
    try {
        console.log(`მონაწილეების მოძებნა ივენთისთვის: ${eventId}`);

        // ჯერ შევამოწმოთ თუ event_participants ცხრილი არსებობს
        const tableCheckResult = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'event_participants'
            );
        `);

        if (!tableCheckResult.rows[0].exists) {
            // თუ ცხრილი არ არსებობს, შევქმნათ იგი
            console.log('event_participants ცხრილი არ არსებობს, ვქმნი...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS event_participants (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    registration_status VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა',
                    payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
                    booth_number VARCHAR(20),
                    booth_size DECIMAL(10,2),
                    notes TEXT,
                    contact_person VARCHAR(255),
                    contact_email VARCHAR(255),
                    contact_phone VARCHAR(50),
                    payment_amount DECIMAL(10,2),
                    payment_due_date DATE,
                    payment_method VARCHAR(50),
                    invoice_number VARCHAR(100),
                    registration_date DATE DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by_user_id INTEGER REFERENCES users(id),
                    UNIQUE(event_id, company_id)
                );
            `);
            console.log('event_participants ცხრილი შეიქმნა');
        } else {
            // თუ ცხრილი არსებობს, შევამოწმოთ და დავამატოთ ნაკლული სვეტები
            console.log('event_participants ცხრილი არსებობს, ვამოწმებ სვეტებს...');

            const missingColumns = [
                { name: 'payment_amount', type: 'DECIMAL(10,2)' },
                { name: 'payment_due_date', type: 'DATE' },
                { name: 'payment_method', type: 'VARCHAR(50)' },
                { name: 'invoice_number', type: 'VARCHAR(100)' },
                { name: 'contact_person', type: 'VARCHAR(255)' },
                { name: 'contact_email', type: 'VARCHAR(255)' },
                { name: 'contact_phone', type: 'VARCHAR(50)' }
            ];

            for (const column of missingColumns) {
                try {
                    await db.query(`
                        DO $$ 
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name = 'event_participants' AND column_name = '${column.name}'
                            ) THEN
                                ALTER TABLE event_participants ADD COLUMN ${column.name} ${column.type};
                            END IF;
                        END $$;
                    `);
                    console.log(`სვეტი ${column.name} შემოწმებული/დამატებული`);
                } catch (columnError) {
                    console.error(`შეცდომა სვეტის ${column.name} დამატებისას:`, columnError);
                }
            }
        }

        // ახლა მონაწილეების მოძებნა
        const result = await db.query(`
            SELECT ep.*, c.company_name, c.country, c.identification_code
            FROM event_participants ep
            JOIN companies c ON ep.company_id = c.id
            WHERE ep.event_id = $1
            ORDER BY ep.registration_date DESC
        `, [eventId]);

        console.log(`მოიძებნა ${result.rows.length} მონაწილე ივენთისთვის ${eventId}`);

        // შევამოწმოთ არის თუ არა რომელიმე კომპანია ამ ივენთის გამოფენისთვის რეგისტრირებული
        const eventResult = await db.query('SELECT exhibition_id FROM annual_services WHERE id = $1', [eventId]);
        if (eventResult.rows.length > 0 && eventResult.rows[0].exhibition_id && result.rows.length === 0) {
            console.log(`ივენთი ${eventId} დაკავშირებულია გამოფენასთან ${eventResult.rows[0].exhibition_id}, მონაწილეები არ არიან - ავტომატურად ვრეგისტრირებ`);

            // მოვძებნოთ ამ გამოფენის კომპანიები
            const companiesResult = await db.query(`
                SELECT c.id, c.company_name 
                FROM companies c
                JOIN company_exhibitions ce ON c.id = ce.company_id
                WHERE ce.exhibition_id = $1
            `, [eventResult.rows[0].exhibition_id]);

            // ავტომატური რეგისტრაცია
            for (const company of companiesResult.rows) {
                try {
                    await db.query(`
                        INSERT INTO event_participants (event_id, company_id, registration_status, created_by_user_id)
                        VALUES ($1, $2, 'მონაწილეობის მოთხოვნა', $3)
                        ON CONFLICT (event_id, company_id) DO NOTHING
                    `, [eventId, company.id, req.user.id]);
                } catch (regError) {
                    console.error(`შეცდომა კომპანიის ${company.id} რეგისტრაციისას:`, regError);
                }
            }

            // განახლებული სია
            const updatedResult = await db.query(`
                SELECT ep.*, c.company_name, c.country, c.identification_code
                FROM event_participants ep
                JOIN companies c ON ep.company_id = c.id
                WHERE ep.event_id = $1
                ORDER BY ep.registration_date DESC
            `, [eventId]);

            console.log(`რეგისტრაციის შემდეგ: ${updatedResult.rows.length} მონაწილე`);
            res.status(200).json(updatedResult.rows);
        } else {
            res.status(200).json(result.rows);
        }
    } catch (error) {
        console.error('შეცდომა მონაწილეების მიღებისას:', error);
        res.status(500).json({ message: 'მონაწილეების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი მონაწილის რეგისტრაცია
app.post('/api/events/:eventId/participants', authenticateToken, upload.fields([
    { name: 'invoice_file', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
    { name: 'handover_file', maxCount: 1 }
]), async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ მონაწილეების მართვის უფლება.' });
    }

    const { eventId } = req.params;
    const { 
        company_id, booth_number, booth_size, notes, 
        contact_person, contact_position, contact_email, contact_phone,
        payment_amount, payment_due_date, payment_method, invoice_number
    } = req.body;
    const created_by_user_id = req.user.id;

    try {
        // შევამოწმოთ თუ event_participants ცხრილი არსებობს
        const tableCheckResult = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'event_participants'
            );
        `);

        if (tableCheckResult.rows[0].exists) {
            // შევამოწმოთ რომელი სვეტები არსებობს ცხრილში
            const columnsResult = await db.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'event_participants'
            `);

            const existingColumns = columnsResult.rows.map(row => row.column_name);
            console.log('არსებული სვეტები:', existingColumns);

            // ცხრილის განახლება ნაკლული სვეტების დამატებით
            const missingColumns = [
                { name: 'payment_amount', type: 'DECIMAL(10,2)' },
                { name: 'payment_due_date', type: 'DATE' },
                { name: 'payment_method', type: 'VARCHAR(50)' },
                { name: 'invoice_number', type: 'VARCHAR(100)' },
                { name: 'contact_person', type: 'VARCHAR(255)' },
                { name: 'contact_email', type: 'VARCHAR(255)' },
                { name: 'contact_phone', type: 'VARCHAR(50)' }
            ];

            for (const column of missingColumns) {
                if (!existingColumns.includes(column.name)) {
                    try {
                        await db.query(`
                            ALTER TABLE event_participants ADD COLUMN ${column.name} ${column.type}
                        `);
                        console.log(`დაემატა სვეტი: ${column.name}`);
                    } catch (alterError) {
                        console.error(`შეცდომა სვეტის ${column.name} დამატებისას:`, alterError);
                    }
                }
            }

            // ფაილების გზების მიღება
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

            const result = await db.query(
            `INSERT INTO event_participants 
             (event_id, company_id, booth_number, booth_size, notes, contact_person, contact_position, contact_email, contact_phone, payment_amount, payment_due_date, payment_method, invoice_number, invoice_file, contract_file, handover_file, registration_status, payment_status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
             RETURNING *`,
            [eventId, company_id, booth_number, booth_size, notes, contact_person, contact_position, contact_email, contact_phone, payment_amount, payment_due_date, payment_method, invoice_number, invoice_file_path, contract_file_path, handover_file_path, 'მონაწილეობის მოთხოვნა', 'მომლოდინე']
        );

        const participantId = result.rows[0].id;

        // Handle equipment bookings
        if (req.body.equipment_bookings) {
            try {
                const equipment_bookings = JSON.parse(req.body.equipment_bookings);
                if (Array.isArray(equipment_bookings) && equipment_bookings.length > 0) {
                    // Get event dates for availability check
                    const eventQuery = await db.query('SELECT start_date, end_date FROM events WHERE id = $1', [eventId]);
                    const { start_date, end_date } = eventQuery.rows[0];

                    for (const booking of equipment_bookings) {
                        const { equipment_id, quantity, unit_price } = booking;

                        if (!equipment_id || !quantity || quantity <= 0) continue;

                        // Check availability
                        const availabilityQuery = await db.query(`
                            SELECT 
                                e.quantity as total_quantity,
                                COALESCE(SUM(eb.quantity), 0) as booked_quantity
                            FROM equipment e
                            LEFT JOIN equipment_bookings eb ON e.id = eb.equipment_id
                            LEFT JOIN event_participants ep ON eb.participant_id = ep.id
                            LEFT JOIN events ev ON ep.event_id = ev.id
                            WHERE e.id = $1 
                            AND (ev.start_date IS NULL OR (ev.start_date <= $3 AND ev.end_date >= $2))
                            GROUP BY e.id, e.quantity
                        `, [equipment_id, start_date, end_date]);

                        if (availabilityQuery.rows.length > 0) {
                            const { total_quantity, booked_quantity } = availabilityQuery.rows[0];
                            const available_quantity = total_quantity - booked_quantity;

                            if (quantity <= available_quantity) {
                                const total_price = quantity * unit_price;
                                await db.query(`
                                    INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, unit_price, total_price, created_by)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, [participantId, equipment_id, quantity, unit_price, total_price, req.user.id]);
                            }
                        }
                    }
                }
            } catch (equipmentError) {
                console.error('აღჭურვილობის ჯავშნის შეცდომა:', equipmentError);
            }
        }
            res.status(201).json({ message: 'მონაწილე წარმატებით დარეგისტრირდა.', participant: result.rows[0] });
        } else {
            res.status(404).json({ message: 'მონაწილეების რეგისტრაციის ფუნქცია ამ ივენთისთვის ხელმისაწვდომი არ არის.' });
        }
    } catch (error) {
        console.error('შეცდომა მონაწილის რეგისტრაციისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'ეს კომპანია უკვე რეგისტრირებულია ამ ივენთზე.' });
        }
        res.status(500).json({ message: 'მონაწილის რეგისტრაცია ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: მონაწილის სტატუსის განახლება
app.put('/api/events/:eventId/participants/:participantId', authenticateToken, upload.fields([
    { name: 'invoice_file', maxCount: 1 },
    { name: 'contract_file', maxCount: 1 },
    { name: 'handover_file', maxCount: 1 }
]), async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ მონაწილეების მართვის უფლება.' });
    }

    const { participantId } = req.params;
    const { 
        registration_status, booth_number, booth_size, notes, 
        payment_status, contact_person, contact_position, contact_email, contact_phone,
        payment_amount, payment_due_date, payment_method, invoice_number
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

    console.log('განახლების მონაცემები:', {
        participantId,
        registration_status,
        payment_status,
        payment_amount,
        files: { invoice_file, contract_file, handover_file }
    });

    try {
        // ჯერ შევამოწმოთ მონაწილე არსებობს თუ არა
        const checkResult = await db.query(
            'SELECT * FROM event_participants WHERE id = $1',
            [participantId]
        );

        if (checkResult.rows.length === 0) {
            console.log(`მონაწილე ${participantId} ვერ მოიძებნა`);
            return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა.' });
        }

        console.log('მონაწილე მოიძებნა:', checkResult.rows[0]);

        const final_invoice_file_path = invoice_file_path ? invoice_file_path : checkResult.rows[0].invoice_file;
        const final_contract_file_path = contract_file_path ? contract_file_path : checkResult.rows[0].contract_file;
        const final_handover_file_path = handover_file_path ? handover_file_path : checkResult.rows[0].handover_file;

        const result = await db.query(
            `UPDATE event_participants 
             SET company_id = $2, booth_number = $3, booth_size = $4, notes = $5, 
                 contact_person = $6, contact_position = $7, contact_email = $8, contact_phone = $9,
                 registration_status = $10, payment_status = $11, payment_amount = $12, 
                 payment_due_date = $13, payment_method = $14, invoice_number = $15,
                 invoice_file = COALESCE($16, invoice_file),
                 contract_file = COALESCE($17, contract_file),
                 handover_file = COALESCE($18, handover_file),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND event_id = $19
             RETURNING *`,
            [participantId, checkResult.rows[0].company_id, booth_number, booth_size, notes, contact_person, contact_position, contact_email, contact_phone, registration_status, payment_status, payment_amount, payment_due_date, payment_method, invoice_number, final_invoice_file_path, final_contract_file_path, final_handover_file_path, checkResult.rows[0].event_id]
        );

        // Handle equipment bookings update
        if (req.body.equipment_bookings) {
            try {
                // First delete existing bookings
                await db.query('DELETE FROM equipment_bookings WHERE participant_id = $1', [participantId]);

                const equipment_bookings = JSON.parse(req.body.equipment_bookings);
                if (Array.isArray(equipment_bookings) && equipment_bookings.length > 0) {
                    // Get event dates for availability check
                    const eventQuery = await db.query('SELECT start_date, end_date FROM events WHERE id = $1', [eventId]);
                    const { start_date, end_date } = eventQuery.rows[0];

                    for (const booking of equipment_bookings) {
                        const { equipment_id, quantity, unit_price } = booking;

                        if (!equipment_id || !quantity || quantity <= 0) continue;

                        // Check availability (excluding current participant's bookings)
                        const availabilityQuery = await db.query(`
                            SELECT 
                                e.quantity as total_quantity,
                                COALESCE(SUM(eb.quantity), 0) as booked_quantity
                            FROM equipment e
                            LEFT JOIN equipment_bookings eb ON e.id = eb.equipment_id
                            LEFT JOIN event_participants ep ON eb.participant_id = ep.id
                            LEFT JOIN events ev ON ep.event_id = ev.id
                            WHERE e.id = $1 
                            AND eb.participant_id != $2
                            AND (ev.start_date IS NULL OR (ev.start_date <= $4 AND ev.end_date >= $3))
                            GROUP BY e.id, e.quantity
                        `, [equipment_id, participantId, start_date, end_date]);

                        const { total_quantity, booked_quantity } = availabilityQuery.rows.length > 0 
                            ? availabilityQuery.rows[0]
                            : { total_quantity: 0, booked_quantity: 0 };

                        // Get total quantity if no bookings found
                        if (availabilityQuery.rows.length === 0) {
                            const equipQuery = await db.query('SELECT quantity FROM equipment WHERE id = $1', [equipment_id]);
                            if (equipQuery.rows.length > 0) {
                                const available_quantity = equipQuery.rows[0].quantity;
                                if (quantity <= available_quantity) {
                                    const total_price = quantity * unit_price;
                                    await db.query(`
                                        INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, unit_price, total_price, created_by)
                                        VALUES ($1, $2, $3, $4, $5, $6)
                                    `, [participantId, equipment_id, quantity, unit_price, total_price, req.user.id]);
                                }
                            }
                        } else {
                            const available_quantity = total_quantity - booked_quantity;
                            if (quantity <= available_quantity) {
                                const total_price = quantity * unit_price;
                                await db.query(`
                                    INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, unit_price, total_price, created_by)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, [participantId, equipment_id, quantity, unit_price, total_price, req.user.id]);
                            }
                        }
                    }
                }
            } catch (equipmentError) {
                console.error('აღჭურვილობის ჯავშნის განახლების შეცდომა:', equipmentError);
            }
        }

        if (result.rows.length > 0) {
            console.log(`მონაწილე ${participantId} წარმატებით განახლდა`);
            res.status(200).json({ 
                message: 'მონაწილის ინფორმაცია წარმატებით განახლდა.', 
                participant: result.rows[0] 
            });
        } else {
            console.log(`მონაწილე ${participantId} განახლება ვერ მოხერხდა`);
            res.status(500).json({ message: 'მონაწილის განახლება ვერ მოხერხდა.' });
        }
    } catch (error) {
        console.error('შეცდომა მონაწილის განახლებისას:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ 
            message: 'მონაწილის განახლება ვერ მოხერხდა.', 
            error: error.message,
            details: error.detail
        });
    }
});

// DELETE: მონაწილის წაშლა
app.delete('/api/events/:eventId/participants/:participantId', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ მონაწილეების წაშლის უფლება.' });
    }

    const { participantId } = req.params;
    try {
        const result = await db.query('DELETE FROM event_participants WHERE id = $1 RETURNING *', [participantId]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'მონაწილე წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა მონაწილის წაშლისას:', error);
        res.status(500).json({ message: 'მონაწილის წაშლა ვერ მოხერხდა.', error: error.message });
    }
});

// --- წლიური სერვისების/ივენთების API ენდპოინტები ---

// GET: ყველა წლიური სერვისის მიღება
app.get('/api/annual-services', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        u1.username as created_by,
        u2.username as updated_by,
        COALESCE(ss.spaces_count, 0) as spaces_count
      FROM annual_services a
      LEFT JOIN users u1 ON a.created_by_user_id = u1.id
      LEFT JOIN users u2 ON a.updated_by_user_id = u2.id
      LEFT JOIN (
        SELECT service_id, COUNT(*) as spaces_count 
        FROM service_spaces 
        GROUP BY service_id
      ) ss ON a.id = ss.service_id
      ORDER BY a.created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა სერვისების მიღებისას:', error);
    res.status(500).json({ message: 'სერვისების მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// POST: ახალი წლიური სერვისის დამატება
app.post('/api/annual-services', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
  }

  const { 
    service_name, description, year_selection, start_date, end_date, 
    service_type, is_active, selected_spaces, selected_exhibitions,
    exhibition_id, selected_companies
  } = req.body;
  const created_by_user_id = req.user.id;

  try {
    const result = await db.query(
      `INSERT INTO annual_services 
      (service_name, description, year_selection, start_date, end_date, service_type, is_active, created_by_user_id, exhibition_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [service_name, description, year_selection, start_date, end_date, service_type, is_active, created_by_user_id, exhibition_id]
    );

    const service = result.rows[0];

    // სივრცეების კავშირების დამატება
    if (selected_spaces && selected_spaces.length > 0) {
      for (const spaceId of selected_spaces) {
        await db.query(
          'INSERT INTO service_spaces (service_id, space_id) VALUES ($1, $2)',
          [service.id, spaceId]
        );
      }
    }

    // event_participants ცხრილის შექმნა თუ არ არსებობს
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        registration_status VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა',
        payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
        booth_number VARCHAR(20),
        booth_size DECIMAL(10,2),
        notes TEXT,
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        registration_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        UNIQUE(event_id, company_id)
      );
    `);

    // თუ exhibition_id მითითებულია, კომპანიების ავტომატური რეგისტრაცია
    if (exhibition_id) {
      console.log(`ივენთისთვის ${service.id} ვეძებთ კომპანიებს გამოფენისთვის ${exhibition_id}`);

      const companiesForExhibition = await db.query(`
        SELECT c.id as company_id, c.company_name 
        FROM companies c
        JOIN company_exhibitions ce ON c.id = ce.company_id
        WHERE ce.exhibition_id = $1
      `, [exhibition_id]);

      console.log(`მოიძებნა ${companiesForExhibition.rows.length} კომპანია გამოფენისთვის ${exhibition_id}`);

      // ყველა კომპანიის ავტომატური რეგისტრაცია
      for (const company of companiesForExhibition.rows) {
        try {
          await db.query(`
            INSERT INTO event_participants (event_id, company_id, registration_status, created_by_user_id)
            VALUES ($1, $2, 'მონაწილეობის მოთხოვნა', $3)
            ON CONFLICT (event_id, company_id) DO NOTHING
          `, [service.id, company.company_id, created_by_user_id]);

          console.log(`კომპანია ${company.company_name} (ID: ${company.company_id}) რეგისტრირდა ივენთზე ${service.id}`);
        } catch (regError) {
          console.error(`შეცდომა კომპანიის ${company.company_id} რეგისტრაციისას:`, regError);
        }
      }

      // საბოლოო რაოდენობის შემოწმება
      const finalCountResult = await db.query(`
        SELECT COUNT(*) as count FROM event_participants WHERE event_id = $1
      `, [service.id]);

      console.log(`საბოლოოდ ივენთზე ${service.id} დარეგისტრირებულია ${finalCountResult.rows[0].count} კომპანია`);
    }

    // დამატებით არჩეული კომპანიების რეგისტრაცია (თუ არის)
    if (selected_companies && selected_companies.length > 0) {
      for (const companyId of selected_companies) {
        await db.query(`
          INSERT INTO event_participants (event_id, company_id, registration_status, registration_date, created_by_user_id)
          VALUES ($1, $2, 'მონაწილეობის მოთხოვნა', CURRENT_DATE, $3)
          ON CONFLICT (event_id, company_id) DO NOTHING
        `, [service.id, companyId, created_by_user_id]);
      }
    }

    // პასუხის ჩამოყალიბება
    let registeredCompaniesCount = 0;
    if (exhibition_id) {
      const companiesCountResult = await db.query(`
        SELECT COUNT(*) as count FROM company_exhibitions WHERE exhibition_id = $1
      `, [exhibition_id]);
      registeredCompaniesCount = companiesCountResult.rows[0].count;
    }

    res.status(201).json({ 
      message: `ივენთი წარმატებით შეიქმნა. ${registeredCompaniesCount} კომპანია ავტომატურად დარეგისტრირდა მონაწილეობის მოთხოვნის სტატუსით.`, 
      event: service 
    });
  } catch (error) {
    console.error('შეცდომა სერვისის დამატებისას:', error);
    res.status(500).json({ message: 'სერვისის დამატება ვერ მოხერხდა.', error: error.message });
  }
});

// PUT: წლიური სერვისის განახლება
app.put('/api/annual-services/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
  }

  const { id } = req.params;
  const { 
    service_name, description, year_selection, start_date, end_date, 
    service_type, is_active, selected_spaces, exhibition_id
  } = req.body;
  const updated_by_user_id = req.user.id;

  console.log('განახლების მონაცემები:', {
    id, service_name, selected_spaces, exhibition_id
  });

  try {
    // service_spaces ცხრილის შექმნა თუ არ არსებობს
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL,
        space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_id, space_id)
      );
    `);

    const result = await db.query(
      `UPDATE annual_services SET 
      service_name = $1, description = $2, year_selection = $3, start_date = $4, 
      end_date = $5, service_type = $6, is_active = $7, exhibition_id = $8, 
      updated_by_user_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 RETURNING *`,
      [service_name, description, year_selection, start_date, end_date, service_type, is_active, exhibition_id, updated_by_user_id, id]
    );

    if (result.rows.length > 0) {
      // არსებული სივრცეების კავშირების წაშლა
      await db.query('DELETE FROM service_spaces WHERE service_id = $1', [id]);

      // ახალი სივრცეების კავშირების დამატება
      if (selected_spaces && Array.isArray(selected_spaces) && selected_spaces.length > 0) {
        console.log(`ვამატებ ${selected_spaces.length} სივრცეს სერვისისთვის ${id}`);
        for (const spaceId of selected_spaces) {
          try {
            await db.query(
              'INSERT INTO service_spaces (service_id, space_id) VALUES ($1, $2) ON CONFLICT (service_id, space_id) DO NOTHING',
              [id, spaceId]
            );
            console.log(`დამატებულია სივრცე ${spaceId} სერვისისთვის ${id}`);
          } catch (spaceError) {
            console.error(`შეცდომა სივრცის ${spaceId} დამატებისას:`, spaceError);
          }
        }
      }

      // დავაბრუნოთ განახლებული სერვისი სივრცეების რაოდენობით
      const spacesCountResult = await db.query(
        'SELECT COUNT(*) as spaces_count FROM service_spaces WHERE service_id = $1',
        [id]
      );

      const updatedService = {
        ...result.rows[0],
        spaces_count: spacesCountResult.rows[0].spaces_count
      };

      res.status(200).json({ message: 'სერვისი წარმატებით განახლდა.', service: updatedService });
    } else {
      res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა სერვისის განახლებისას:', error);
    res.status(500).json({ message: 'სერვისის განახლება ვერ მოხერხდა.', error: error.message });
  }
});

// DELETE: წლიური სერვისის წაშლა
app.delete('/api/annual-services/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების წაშლის უფლება.' });
  }

  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM annual_services WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'სერვისი წარმატებით წაიშალა.' });
    } else {
      res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა სერვისის წაშლისას:', error);
    res.status(500).json({ message: 'სერვისის წაშლა ვერ მოხერხდა.', error: error.message });
  }
});

// PUT: სერვისის არქივში გადატანა
app.put('/api/annual-services/:id/archive', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
  }

  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE annual_services SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'სერვისი წარმატებით არქივში გადაიტანა.', service: result.rows[0] });
    } else {
      res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა სერვისის არქივში გადატანისას:', error);
    res.status(500).json({ message: 'სერვისის არქივში გადატანა ვერ მოხერხდა.', error: error.message });
  }
});

// GET: სერვისის დეტალები
app.get('/api/annual-services/:id/details', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const serviceResult = await db.query('SELECT * FROM annual_services WHERE id = $1', [id]);

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
    }

    const service = serviceResult.rows[0];

    // service_spaces ცხრილის შექმნა თუ არ არსებობს
    await db.query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL,
        space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_id, space_id)
      );
    `);

    // სივრცეების მიღება
    const spacesResult = await db.query(`
      SELECT s.* FROM spaces s
      JOIN service_spaces ss ON s.id = ss.space_id
      WHERE ss.service_id = $1
    `, [id]);

    // ჯავშნების მიღება (თუ bookings ცხრილი არსებობს)
    const bookingsResult = await db.query(`
      SELECT b.*, c.company_name FROM bookings b
      JOIN companies c ON b.company_id = c.id
      WHERE b.service_id = $1
    `).catch(() => ({ rows: [] })); // თუ bookings ცხრილი არ არსებობს

    service.spaces = spacesResult.rows;
    service.bookings = bookingsResult.rows;

    console.log(`სერვისი ${id}: ${spacesResult.rows.length} სივრცე, ${bookingsResult.rows.length} ჯავშანი`);

    res.status(200).json(service);
  } catch (error) {
    console.error('შეცდომა სერვისის დეტალების მიღებისას:', error);
    res.status(500).json({ message: 'სერვისის დეტალების მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// --- ჯავშნების API ენდპოინტები ---

// GET: ყველა ჯავშნის მიღება
app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.*, s.service_name, e.exhibition_name, c.company_name 
            FROM bookings b
            LEFT JOIN annual_services s ON b.service_id = s.id
            LEFT JOIN exhibitions e ON b.exhibition_id = e.id
            LEFT JOIN companies c ON b.company_id = c.id
            ORDER BY b.booking_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა ჯავშნების მიღებისას:', error);
        res.status(500).json({ message: 'ჯავშნების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი ჯავშნის დამატება
app.post('/api/bookings', authenticateToken, async (req, res) => {
    const { service_id, exhibition_id, company_id, booking_date, start_time, end_time, notes } = req.body;
    const created_by_user_id = req.user.id;

    try {
        const result = await db.query(
            'INSERT INTO bookings (service_id, exhibition_id, company_id, booking_date, start_time, end_time, notes, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [service_id, exhibition_id, company_id, booking_date, start_time, end_time, notes, created_by_user_id]
        );
        res.status(201).json({ message: 'ჯავშანი წარმატებით დაემატა.', booking: result.rows[0] });
    } catch (error) {
        console.error('შეცდომა ჯავშნის დამატებისას:', error);
        res.status(500).json({ message: 'ჯავშნის დამატება ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: ჯავშნის სტატუსის განახლება
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await db.query(
            'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'ჯავშნის სტატუსი წარმატებით განახლდა.', booking: result.rows[0] });
        } else {
            res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა ჯავშნის განახლებისას:', error);
        res.status(500).json({ message: 'ჯავშნის განახლება ვერ მოხერხდა.', error: error.message });
    }
});

// DELETE: ჯავშნის წაშლა
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ ჯავშნების წაშლის უფლება.' });
    }

    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'ჯავშანი წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'ჯავშანი ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა ჯავშნის წაშლისას:', error);
        res.status(500).json({ message: 'ჯავშნის წაშლა ვერ მოხერხდა.', error: error.message });
    }
});

// აღჭურვილობის სია (ყველა მომხმარებელი ხედავს)
app.get('/api/equipment', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM equipment ORDER BY id ASC');
    console.log('აღჭურვილობის მოძებნის შედეგი:', result.rows.length, 'ჩანაწერი');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა აღჭურვილობის მოძებნისას:', error);
    res.status(500).json({ message: 'აღჭურვილობის მოძებნა ვერ მოხერხდა', error: error.message });
  }
});

// აღჭურვილობის ხელმისაწვდომობის შემოწმება კონკრეტული ივენთისთვის
app.get('/api/equipment/availability/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // ივენთის მიღება და თარიღების შემოწმება
    const eventResult = await db.query('SELECT start_date, end_date FROM annual_services WHERE id = $1', [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }

    const { start_date, end_date } = eventResult.rows[0];

    // ყველა აღჭურვილობის მიღება
    const equipmentResult = await db.query('SELECT id, code_name, quantity, price, description FROM equipment ORDER BY code_name');

    // დაჯავშნილი რაოდენობების მიღება ამ პერიოდისთვის
    const bookedResult = await db.query(`
      SELECT 
        eb.equipment_id,
        COALESCE(SUM(eb.quantity), 0) as booked_quantity
      FROM equipment_bookings eb
      JOIN event_participants ep ON eb.participant_id = ep.id
      JOIN annual_services e ON ep.event_id = e.id
      WHERE (e.start_date <= $2 AND e.end_date >= $1)
      AND e.id != $3
      GROUP BY eb.equipment_id
    `, [start_date, end_date, eventId]);

    // დაჯავშნილი რაოდენობების რუკა
    const bookedMap = {};
    bookedResult.rows.forEach(row => {
      bookedMap[row.equipment_id] = parseInt(row.booked_quantity) || 0;
    });

    // ხელმისაწვდომობის გათვლა
    const availability = equipmentResult.rows.map(equipment => ({
      id: equipment.id,
      code_name: equipment.code_name,
      description: equipment.description,
      quantity: equipment.quantity,
      price: equipment.price,
      booked_quantity: bookedMap[equipment.id] || 0,
      available_quantity: equipment.quantity - (bookedMap[equipment.id] || 0)
    }));

    console.log(`აღჭურვილობის ხელმისაწვდომობა ივენთისთვის ${eventId}:`, availability.length, 'ერთეული');
    res.status(200).json(availability);
  } catch (error) {
    console.error('შეცდომა აღჭურვილობის ხელმისაწვდომობის შემოწმებისას:', error);
    res.status(500).json({ message: 'აღჭურვილობის ხელმისაწვდომობის შემოწმება ვერ მოხერხდა', error: error.message });
  }
});

// აღჭურვილობის ხელმისაწვდომი რაოდენობა ღონისძიების პერიოდისთვის
app.get('/api/equipment/availability/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // ღონისძიების პერიოდი
    const eventQuery = await db.query('SELECT start_date, end_date FROM events WHERE id = $1', [eventId]);
    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ message: 'ღონისძიება ვერ მოიძებნა' });
    }

    const { start_date, end_date } = eventQuery.rows[0];

    // აღჭურვილობის საერთო რაოდენობა
    const equipmentQuery = await db.query('SELECT id, code_name, quantity, price FROM equipment ORDER BY code_name');

    // დაჯავშნილი რაოდენობები ამ პერიოდში
    const bookedQuery = await db.query(`
      SELECT 
        eb.equipment_id,
        SUM(eb.quantity) as booked_quantity
      FROM equipment_bookings eb
      JOIN event_participants ep ON eb.participant_id = ep.id
      JOIN annual_services e ON ep.event_id = e.id
      WHERE e.start_date <= $2 AND e.end_date >= $1
      GROUP BY eb.equipment_id
    `, [start_date, end_date]);

    const bookedMap = {};
    bookedQuery.rows.forEach(row => {
      bookedMap[row.equipment_id] = parseInt(row.booked_quantity);
    });

    const availability = equipmentQuery.rows.map(equipment => ({
      ...equipment,
      booked_quantity: bookedMap[equipment.id] || 0,
      available_quantity: equipment.quantity - (bookedMap[equipment.id] || 0)
    }));

    res.json(availability);
  } catch (error) {
    console.error('შეცდომა აღჭურვილობის ხელმისაწვდომობის შემოწმებისას:', error);
    res.status(500).json({ message: 'შეცდომა მოთხოვნის დამუშავებისას' });
  }
});

// მონაწილის აღჭურვილობის ჯავშნები
app.get('/api/participants/:participantId/equipment-bookings', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.params;

    const result = await db.query(`
      SELECT 
        eb.*,
        e.code_name,
        e.description
      FROM equipment_bookings eb
      JOIN equipment e ON eb.equipment_id = e.id
      WHERE eb.participant_id = $1
      ORDER BY e.code_name
    `, [participantId]);

    res.json(result.rows);
  } catch (error) {
    console.error('შეცდომა აღჭურვილობის ჯავშნების მოძებნისას:', error);
    res.status(500).json({ message: 'შეცდომა მოთხოვნის დამუშავებისას' });
  }
});

// აღჭურვილობის ჯავშნის დამატება/განახლება
app.post('/api/participants/:participantId/equipment-bookings', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.params;
    const { equipment_bookings } = req.body;
    const user_id = req.user.id;

    if (!Array.isArray(equipment_bookings) || equipment_bookings.length === 0) {
      return res.status(400).json({ message: 'აღჭურვილობის მონაცემები არასწორია' });
    }

    // Check if participant exists and get event info
    const participantQuery = await db.query(`
      SELECT ep.*, e.start_date, e.end_date 
      FROM event_participants ep
      JOIN annual_services e ON ep.event_id = e.id
      WHERE ep.id = $1
    `, [participantId]);

    if (participantQuery.rows.length === 0) {
      return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
    }

    const participant = participantQuery.rows[0];
    const { start_date, end_date } = participant;

    // Delete existing bookings for this participant
    await db.query('DELETE FROM equipment_bookings WHERE participant_id = $1', [participantId]);

    // Add new bookings
    for (const booking of equipment_bookings) {
      const { equipment_id, quantity, unit_price } = booking;

      if (!equipment_id || !quantity || quantity <= 0) {
        continue; // Skip invalid bookings
      }

      // Check availability
      const availabilityQuery = await db.query(`
        SELECT 
          e.quantity as total_quantity,
          COALESCE(SUM(eb.quantity), 0) as booked_quantity
        FROM equipment e
        LEFT JOIN equipment_bookings eb ON e.id = eb.equipment_id
        LEFT JOIN event_participants ep ON eb.participant_id = eb.id
        LEFT JOIN events ev ON ep.event_id = ev.id
        WHERE e.id = $1 
        AND (ev.start_date IS NULL OR (ev.start_date <= $3 AND ev.end_date >= $2))
        GROUP BY e.id, e.quantity
      `, [equipment_id, start_date, end_date]);

      if (availabilityQuery.rows.length === 0) {
        return res.status(404).json({ message: 'აღჭურვილობა ვერ მოიძებნა' });
      }

      const { total_quantity, booked_quantity } = availabilityQuery.rows[0];
      const available_quantity = total_quantity - booked_quantity;

      if (quantity > available_quantity) {
        return res.status(400).json({ 
          message: `არასაკმარისი რაოდენობა. ხელმისაწვდომია: ${available_quantity}` 
        });
      }

      const total_price = quantity * unit_price;

      await db.query(`
        INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, unit_price, total_price, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [participantId, equipment_id, quantity, unit_price, total_price, user_id]);
    }

    res.json({ message: 'აღჭურვილობის ჯავშანი წარმატებით განახლდა' });
  } catch (error) {
    console.error('შეცდომა აღჭურვილობის ჯავშნისას:', error);
    res.status(500).json({ message: 'შეცდომა მოთხოვნის დამუშავებისას' });
  }
});

// ნოტიფიკაციების ცხრილის შექმნის ფუნქცია
const createNotificationsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_entity_type VARCHAR(50),
        related_entity_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('ნოტიფიკაციების ცხრილი შეიქმნა/შემოწმდა');
  } catch (error) {
    console.error('ნოტიფიკაციების ცხრილის შექმნის შეცდომა:', error);
  }
};

// აღჭურვილობის ჯავშნების ცხრილის შექმნის ფუნქცია
const createEquipmentBookingsTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('აღჭურვილობის ჯავშნების ცხრილი შეიქმნა/შემოწმდა');
  } catch (error) {
    console.error('აღჭურვილობის ჯავშნების ცხრილის შექმნის შეცდომა:', error);
  }
};

// ყველა საჭირო ცხრილის შექმნა
const initializeTables = async () => {
  await createNotificationsTable();
  await createEquipmentBookingsTable();
};

initializeTables();

// ნოტიფიკაციების API
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 OR user_id IS NULL 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('ნოტიფიკაციების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ნოტიფიკაციების მიღება ვერ მოხერხდა.' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await db.query(`
      UPDATE notifications 
      SET is_read = true, updated_at = NOW() 
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
      RETURNING *
    `, [id, userId]);

    if (result.rows.length > 0) {
      res.status(200).json({ message: 'ნოტიფიკაცია განახლდა.' });
    } else {
      res.status(404).json({ message: 'ნოტიფიკაცია ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('ნოტიფიკაციის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'ნოტიფიკაციის განახლება ვერ მოხერხდა.' });
  }
});

// ნოტიფიკაციის შექმნის ფუნქცია
const createNotification = async (userId, type, title, message) => {
  try {
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
    `, [userId, type, title, message]);
  } catch (error) {
    console.error('ნოტიფიკაციის შექმნის შეცდომა:', error);
  }
};

// GET: ყველა სერვისის მიღება
app.get('/api/annual-services', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.*,
        u1.username as created_by,
        u2.username as updated_by
      FROM annual_services a
      LEFT JOIN users u1 ON a.created_by_user_id = u1.id
      LEFT JOIN users u2 ON a.updated_by_user_id = u2.id
      ORDER BY a.start_date DESC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა სერვისების მიღებისას:', error);
    res.status(500).json({ message: 'სერვისების მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// ივენთები (annual_services) - POST: ახალი სერვისის დამატება
app.post('/api/annual-services', authenticateToken, async (req, res) => {
  // მხოლოდ admin, sales, marketing
  if (!['admin', 'sales', 'marketing'].includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია.' });
  }

  const {
    service_name,
    description,
    year_selection,
    service_type,
    start_date,
    end_date,
    is_active = true
  } = req.body;

  const created_by_user_id = req.user.id;

  try {
    const result = await db.query(
      `INSERT INTO annual_services
       (service_name, description, year_selection, service_type, start_date, end_date, is_active, created_by_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [service_name, description, year_selection, service_type, start_date, end_date, is_active, created_by_user_id]
    );

    res.status(201).json({
      message: 'ივენთი წარმატებით დაემატა!',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('შეცდომა ივენთის დამატებისას:', error);
    res.status(500).json({
      message: 'ივენთის დამატება ვერ მოხერხდა.',
      error: error.message
    });
  }
});

// PUT: სერვისის განახლება
app.put('/api/annual-services/:id', authenticateToken, async (req, res) => {
  if (!['admin', 'sales', 'marketing'].includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია.' });
  }

  const { id } = req.params;
  const {
    service_name,
    description,
    year_selection,
    service_type,
    start_date,
    end_date,
    is_active
  } = req.body;

  const updated_by_user_id = req.user.id;

  try {
    const result = await db.query(
      `UPDATE annual_services
       SET service_name = $1, description = $2, year_selection = $3,
           service_type = $4, start_date = $5, end_date = $6, is_active = $7,
           updated_by_user_id = $8, updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [service_name, description, year_selection, service_type, start_date, end_date, is_active, updated_by_user_id, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json({
        message: 'ივენთი წარმატებით განახლდა!',
        event: result.rows[0]
      });
    } else {
      res.status(404).json({ message: 'ივენთი ვერ მოიძებნა.' });
    }
  } catch (error) {
    console.error('შეცდომა ივენთის განახლებისას:', error);
    res.status(500).json({
      message: 'ივენთის განახლება ვერ მოხერხდა.',
      error: error.message
    });
  }
});

// Error handling middleware for multer errors
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'ფაილი ძალიან დიდია. მაქსიმუმ 5MB.' });
        }
    }

    if (error.message === 'მხოლოდ სურათების ფაილები დაშვებულია!') {
        return res.status(400).json({ message: error.message });
    }

    console.error('სერვერის შეცდომა:', error);
    res.status(500).json({ message: 'სერვერის შიდა შეცდომა' });
});

// --- რეპორტების API ენდპოინტები ---

// GET: ივენთების რეპორტები
app.get('/api/reports/events', authenticateToken, async (req, res) => {
    const { type, eventId, startDate, endDate } = req.query;

    try {
        let reportData = {};

        switch (type) {
            case 'participants':
                if (!eventId) {
                    return res.status(400).json({ message: 'ივენთის ID არ არის მითითებული' });
                }

                // მონაწილეების ანალიზი
                const participantsResult = await db.query(`
                    SELECT 
                        ep.*, 
                        c.company_name, 
                        c.country, 
                        c.identification_code
                    FROM event_participants ep
                    JOIN companies c ON ep.company_id = c.id
                    WHERE ep.event_id = $1
                    ${startDate ? 'AND ep.registration_date >= $2' : ''}
                    ${endDate ? 'AND ep.registration_date <= $3' : ''}
                    ORDER BY ep.registration_date DESC
                `, eventId ? [eventId, startDate, endDate].filter(Boolean) : []);

                const participants = participantsResult.rows;

                reportData = {
                    totalParticipants: participants.length,
                    confirmedParticipants: participants.filter(p => p.registration_status === 'დადასტურებული').length,
                    paidParticipants: participants.filter(p => p.payment_status === 'გადახდილი').length,
                    totalRevenue: participants.reduce((sum, p) => sum + (parseFloat(p.payment_amount) || 0), 0),
                    participants: participants
                };
                break;

            case 'financial':
                if (!eventId) {
                    return res.status(400).json({ message: 'ივენთის ID არ არის მითითებული' });
                }

                // ფინანსური ანალიზი
                const financialResult = await db.query(`
                    SELECT 
                        SUM(CASE WHEN payment_amount IS NOT NULL THEN payment_amount ELSE 0 END) as expected_revenue,
                        SUM(CASE WHEN payment_status = 'გადახდილი' THEN payment_amount ELSE 0 END) as actual_revenue,
                        SUM(CASE WHEN payment_due_date < CURRENT_DATE AND payment_status != 'გადახდილი' THEN payment_amount ELSE 0 END) as overdue_amount
                    FROM event_participants 
                    WHERE event_id = $1
                `, [eventId]);

                const financial = financialResult.rows[0];

                reportData = {
                    expectedRevenue: parseFloat(financial.expected_revenue) || 0,
                    actualRevenue: parseFloat(financial.actual_revenue) || 0,
                    overdueAmount: parseFloat(financial.overdue_amount) || 0
                };
                break;

            case 'summary':
                // ზოგადი მიმოხილვა
                const summaryResult = await db.query(`
                    SELECT 
                        COUNT(DISTINCT s.id) as total_events,
                        COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_events,
                        COUNT(DISTINCT ep.id) as total_participants,
                        SUM(CASE WHEN ep.payment_status = 'გადახდილი' THEN ep.payment_amount ELSE 0 END) as total_revenue
                    FROM annual_services s
                    LEFT JOIN event_participants ep ON s.id = ep.event_id
                    WHERE 1=1
                    ${startDate ? 'AND s.start_date >= $1' : ''}
                    ${endDate ? 'AND s.end_date <= $2' : ''}
                `, [startDate, endDate].filter(Boolean));

                const summary = summaryResult.rows[0];

                reportData = {
                    totalEvents: parseInt(summary.total_events) || 0,
                    activeEvents: parseInt(summary.active_events) || 0,
                    totalParticipants: parseInt(summary.total_participants) || 0,
                    totalRevenue: parseFloat(summary.total_revenue) || 0
                };
                break;

            default:
                return res.status(400).json({ message: 'არასწორი რეპორტის ტიპი' });
        }

        res.status(200).json(reportData);
    } catch (error) {
        console.error('შეცდომა რეპორტის გენერაციისას:', error);
        res.status(500).json({ message: 'რეპორტის გენერაცია ვერ მოხერხდა', error: error.message });
    }
});

// GET: კომპანიების რეპორტები
app.get('/api/reports/companies', authenticateToken, async (req, res) => {
    const { startDate, endDate, country, status } = req.query;

    try {
        let query = `
            SELECT 
                c.*,
                COUNT(DISTINCT ce.exhibition_id) as exhibitions_count,
                COUNT(DISTINCT ep.event_id) as events_participated,
                COALESCE(SUM(ep.payment_amount), 0) as total_payments
            FROM companies c
            LEFT JOIN company_exhibitions ce ON c.id = ce.company_id
            LEFT JOIN event_participants ep ON c.id = ep.company_id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (startDate) {
            query += ` AND c.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND c.created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        if (country) {
            query += ` AND c.country = $${paramIndex}`;
            params.push(country);
            paramIndex++;
        }

        if (status) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

        const result = await db.query(query, params);

        const reportData = {
            companies: result.rows,
            totalCompanies: result.rows.length,
            totalRevenue: result.rows.reduce((sum, c) => sum + parseFloat(c.total_payments), 0)
        };

        res.status(200).json(reportData);
    } catch (error) {
        console.error('შეცდომა კომპანიების რეპორტის გენერაციისას:', error);
        res.status(500).json({ message: 'კომპანიების რეპორტის გენერაცია ვერ მოხერხდა', error: error.message });
    }
});

// Routes იმპორტები - მხოლოდ არსებული ფაილებისთვის
// app.use('/api/auth', require('./routes/auth')); // ეს ფაილი არ არსებობს
app.use('/api/companies', require('./routes/companies'));
app.use('/api/equipment', require('./routes/equipment'));
// app.use('/api/annual-services', require('./routes/annualServices')); // ეს ფაილი არ არსებობს
// app.use('/api/events', require('./routes/events')); // ეს ფაილი არ არსებობს
app.use('/api/statistics', require('./routes/statistics'));

// Spaces API
app.get('/api/spaces', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             u1.username as created_by,
             u2.username as updated_by
      FROM spaces s
      LEFT JOIN users u1 ON s.created_by_user_id = u1.id
      LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
      ORDER BY s.created_at DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ message: 'სივრცეების მიღება ვერ მოხერხდა' });
  }
});

// Exhibitions API
app.get('/api/exhibitions', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT e.*, 
             u1.username as created_by,
             u2.username as updated_by
      FROM exhibitions e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      ORDER BY e.created_at DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching exhibitions:', error);
    res.status(500).json({ message: 'გამოფენების მიღება ვერ მოხერხდა' });
  }
});

// Events API (annual services)
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT a.*, 
             u1.username as created_by,
             u2.username as updated_by
      FROM annual_services a
      LEFT JOIN users u1 ON a.created_by_user_id = u1.id
      LEFT JOIN users u2 ON a.updated_by_user_id = u2.id
      ORDER BY a.created_at DESC
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'ივენთების მიღება ვერ მოხერხდა' });
  }
});

// --- ნოტიფიკაციების API ენდპოინტები ---

// GET: მომხმარებლის ნოტიფიკაციების მიღება
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        // ჯერ შევქმნათ notifications ცხრილი თუ არ არსებობს
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                related_entity_type VARCHAR(50),
                related_entity_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const result = await db.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1 OR user_id IS NULL
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.user.id]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა ნოტიფიკაციების მიღებისას:', error);
        res.status(500).json({ message: 'ნოტიფიკაციების მიღება ვერ მოხერხდა', error: error.message });
    }
});

// PUT: ნოტიფიკაციის წაკითხულად მონიშვნა
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(`
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
            RETURNING *
        `, [id, req.user.id]);

        if (result.rows.length > 0) {
            res.status(200).json({ message: 'ნოტიფიკაცია წაკითხულად მონიშნულია' });
        } else {
            res.status(404).json({ message: 'ნოტიფიკაცია ვერ მოიძებნა' });
        }
    } catch (error) {
        console.error('შეცდომა ნოტიფიკაციის განახლებისას:', error);
        res.status(500).json({ message: 'ნოტიფიკაციის განახლება ვერ მოხერხდა', error: error.message });
    }
});

// POST: ახალი ნოტიფიკაციის შექმნა (ადმინისთვის)
app.post('/api/notifications', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'წვდომა აკრძალულია' });
    }

    const { title, message, type, user_id, related_entity_type, related_entity_id } = req.body;

    try {
        const result = await db.query(`
            INSERT INTO notifications (title, message, type, user_id, related_entity_type, related_entity_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [title, message, type || 'info', user_id || null, related_entity_type || null, related_entity_id || null]);

        res.status(201).json({ message: 'ნოტიფიკაცია წარმატებით შეიქმნა', notification: result.rows[0] });
    } catch (error) {
        console.error('შეცდომა ნოტიფიკაციის შექმნისას:', error);
        res.status(500).json({ message: 'ნოტიფიკაციის შექმნა ვერ მოხერხდა', error: error.message });
    }
});

// --- დოკუმენტების გენერაციის API ენდპოინტები ---

// GET: ინვოისის გენერაცია
app.get('/api/documents/invoice/:participantId', authenticateToken, async (req, res) => {
    const { participantId } = req.params;

    try {
        const participantResult = await db.query(`
            SELECT 
                ep.*,
                c.company_name,
                c.legal_address,
                c.identification_code,
                c.contact_persons,
                s.service_name,
                s.start_date,
                s.end_date
            FROM event_participants ep
            JOIN companies c ON ep.company_id = c.id
            JOIN annual_services s ON ep.event_id = s.id
            WHERE ep.id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
        }

        const participant = participantResult.rows[0];

        // ინვოისის ნომრის გენერაცია თუ არ არსებობს
        let invoiceNumber = participant.invoice_number;
        if (!invoiceNumber) {
            const date = new Date();
            invoiceNumber = `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(participantId).padStart(4, '0')}`;

            // ინვოისის ნომრის შენახვა მონაცემთა ბაზაში
            await db.query(`
                UPDATE event_participants 
                SET invoice_number = $1 
                WHERE id = $2
            `, [invoiceNumber, participantId]);
        }

        const invoiceData = {
            invoiceNumber,
            issueDate: new Date().toLocaleDateString('ka-GE'),
            dueDate: participant.payment_due_date ? new Date(participant.payment_due_date).toLocaleDateString('ka-GE') : null,
            company: {
                name: participant.company_name,
                address: participant.legal_address,
                identificationCode: participant.identification_code,
                contactPersons: participant.contact_persons
            },
            event: {
                name: participant.service_name,
                startDate: new Date(participant.start_date).toLocaleDateString('ka-GE'),
                endDate: new Date(participant.end_date).toLocaleDateString('ka-GE')
            },
            services: [
                {
                    description: `მონაწილეობა ივენთში: ${participant.service_name}`,
                    boothNumber: participant.booth_number,
                    boothSize: participant.booth_size,
                    amount: participant.payment_amount || 0
                }
            ],
            totalAmount: participant.payment_amount || 0,
            paymentStatus: participant.payment_status,
            notes: participant.notes
        };

        res.status(200).json(invoiceData);
    } catch (error) {
        console.error('შეცდომა ინვოისის გენერაციისას:', error);
        res.status(500).json({ message: 'ინვოისის გენერაცია ვერ მოხერხდა', error: error.message });
    }
});

// GET: ხელშეკრულების გენერაცია
app.get('/api/documents/contract/:participantId', authenticateToken, async (req, res) => {
    const { participantId } = req.params;

    try {
        const participantResult = await db.query(`
            SELECT 
                ep.*,
                c.*,
                s.service_name,
                s.description as event_description,
                s.start_date,
                s.end_date
            FROM event_participants ep
            JOIN companies c ON ep.company_id = c.id
            JOIN annual_services s ON ep.event_id = s.id
            WHERE ep.id = $1
        `, [participantId]);

        if (participantResult.rows.length === 0) {
            return res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა' });
        }

        const participant = participantResult.rows[0];

        const contractData = {
            contractNumber: `CONTRACT-${new Date().getFullYear()}-${String(participantId).padStart(4, '0')}`,
            date: new Date().toLocaleDateString('ka-GE'),
            company: {
                name: participant.company_name,
                address: participant.legal_address,
                identificationCode: participant.identification_code,
                contactPersons: participant.contact_persons,
                website: participant.website
            },
            event: {
                name: participant.service_name,
                description: participant.event_description,
                startDate: new Date(participant.start_date).toLocaleDateString('ka-GE'),
                endDate: new Date(participant.end_date).toLocaleDateString('ka-GE')
            },
            terms: {
                boothNumber: participant.booth_number,
                boothSize: participant.booth_size,
                paymentAmount: participant.payment_amount || 0,
                paymentDueDate: participant.payment_due_date ? new Date(participant.payment_due_date).toLocaleDateString('ka-GE') : null,
                paymentMethod: participant.payment_method
            },
            notes: participant.notes
        };

        res.status(200).json(contractData);
    } catch (error) {
        console.error('შეცდომა ხელშეკრულების გენერაციისას:', error);
        res.status(500).json({ message: 'ხელშეკრულების გენერაცია ვერ მოხერხდა', error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`სერვერი გაშვებულია http://0.0.0.0:${PORT}`);
});