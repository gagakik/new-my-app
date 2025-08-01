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

// uploads ფოლდერის შექმნა development-ისთვის
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('uploads ფოლდერი შეიქმნა');
}

app.use(cors());
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
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname).toLowerCase();
        cb(null, 'img-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({ 
    storage: multerStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB ლიმიტი
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('მხოლოდ სურათების ფაილები დაშვებულია!'));
        }
    }
});

// სურათის ატვირთვის ფუნქცია ლოკალურად
function uploadImage(file) {
    // Development-ში localhost:5000, Production-ში შედარებითი მისამართი
    if (process.env.NODE_ENV === 'production') {
        return `/uploads/${file.filename}`;
    } else {
        return `http://localhost:${PORT}/uploads/${file.filename}`;
    }
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
    const result = await db.query('SELECT * FROM exhibitions ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('შეცდომა გამოფენების მიღებისას:', error);
    res.status(500).json({ message: 'გამოფენების მიღება ვერ მოხერხდა.', error: error.message });
  }
});

// POST: ახალი გამოფენის დამატება
app.post('/api/exhibitions', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ გამოფენების მართვის უფლება.' });
  }
  const { exhibition_name, comment, manager } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO exhibitions (exhibition_name, comment, manager) VALUES ($1, $2, $3) RETURNING *',
      [exhibition_name, comment, manager]
    );
    res.status(201).json({ message: 'გამოფენა წარმატებით დაემატა.', exhibition: result.rows[0] });
  } catch (error) {
    console.error('შეცდომა გამოფენის დამატებისას:', error);
    res.status(500).json({ message: 'გამოფენის დამატება ვერ მოხერხდა.', error: error.message });
  }
});

// PUT: გამოფენის რედაქტირება ID-ის მიხედვით
app.put('/api/exhibitions/:id', authenticateToken, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'marketing'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ გამოფენების მართვის უფლება.' });
  }
  const { id } = req.params;
  const { exhibition_name, comment, manager } = req.body;
  try {
    const result = await db.query(
      'UPDATE exhibitions SET exhibition_name = $1, comment = $2, manager = $3 WHERE id = $4 RETURNING *',
      [exhibition_name, comment, manager, id]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ message: 'გამოფენა წარმატებით განახლდა.', exhibition: result.rows[0] });
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
app.get('/api/companies', authenticateToken, async (req, res) => { // დავამატეთ authenticateToken
    const { searchTerm, country, profile, status } = req.query;
    let query = 'SELECT * FROM companies WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
        query += ` AND company_name ILIKE $${paramIndex}`;
        values.push(`%${searchTerm}%`);
        paramIndex++;
    }
    if (country) {
        query += ` AND country = $${paramIndex}`;
        values.push(country);
        paramIndex++;
    }
    if (profile) {
        query += ` AND company_profile ILIKE $${paramIndex}`;
        values.push(`%${profile}%`);
        paramIndex++;
    }
    if (status) {
        query += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
    }

    query += ' ORDER BY id ASC';

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
      AND s.is_archived = FALSE
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
        const result = await db.query(`
            SELECT ep.*, c.company_name, c.country, c.identification_code
            FROM event_participants ep
            JOIN companies c ON ep.company_id = c.id
            WHERE ep.event_id = $1
            ORDER BY ep.registration_date DESC
        `, [eventId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა მონაწილეების მიღებისას:', error);
        res.status(500).json({ message: 'მონაწილეების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი მონაწილის რეგისტრაცია
app.post('/api/events/:eventId/participants', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ მონაწილეების მართვის უფლება.' });
    }

    const { eventId } = req.params;
    const { 
        company_id, booth_number, booth_size, notes, 
        contact_person, contact_email, contact_phone 
    } = req.body;
    const created_by_user_id = req.user.id;

    try {
        const result = await db.query(
            `INSERT INTO event_participants 
            (event_id, company_id, booth_number, booth_size, notes, contact_person, contact_email, contact_phone, created_by_user_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [eventId, company_id, booth_number, booth_size, notes, contact_person, contact_email, contact_phone, created_by_user_id]
        );
        res.status(201).json({ message: 'მონაწილე წარმატებით დარეგისტრირდა.', participant: result.rows[0] });
    } catch (error) {
        console.error('შეცდომა მონაწილის რეგისტრაციისას:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'ეს კომპანია უკვე რეგისტრირებულია ამ ივენთზე.' });
        }
        res.status(500).json({ message: 'მონაწილის რეგისტრაცია ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: მონაწილის სტატუსის განახლება
app.put('/api/events/:eventId/participants/:participantId', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ მონაწილეების მართვის უფლება.' });
    }

    const { participantId } = req.params;
    const { 
        registration_status, booth_number, booth_size, notes, 
        payment_status, contact_person, contact_email, contact_phone 
    } = req.body;

    try {
        const result = await db.query(
            `UPDATE event_participants SET 
            registration_status = $1, booth_number = $2, booth_size = $3, notes = $4,
            payment_status = $5, contact_person = $6, contact_email = $7, contact_phone = $8,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 RETURNING *`,
            [registration_status, booth_number, booth_size, notes, payment_status, 
             contact_person, contact_email, contact_phone, participantId]
        );

        if (result.rows.length > 0) {
            res.status(200).json({ message: 'მონაწილის ინფორმაცია წარმატებით განახლდა.', participant: result.rows[0] });
        } else {
            res.status(404).json({ message: 'მონაწილე ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა მონაწილის განახლებისას:', error);
        res.status(500).json({ message: 'მონაწილის განახლება ვერ მოხერხდა.', error: error.message });
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
      SELECT s.*, 
             COUNT(DISTINCT ss.space_id) as spaces_count,
             COUNT(DISTINCT b.id) as bookings_count
      FROM annual_services s
      LEFT JOIN service_spaces ss ON s.id = ss.service_id
      LEFT JOIN bookings b ON s.id = b.service_id
      WHERE s.is_archived = FALSE
      GROUP BY s.id
      ORDER BY s.created_at DESC
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
    service_type, is_active, selected_spaces, selected_exhibitions 
  } = req.body;
  const created_by_user_id = req.user.id;

  try {
    const result = await db.query(
      `INSERT INTO annual_services 
      (service_name, description, year_selection, start_date, end_date, service_type, is_active, created_by_user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [service_name, description, year_selection, start_date, end_date, service_type, is_active, created_by_user_id]
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

    res.status(201).json({ message: 'სერვისი წარმატებით დაემატა.', service });
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
    service_type, is_active, selected_spaces 
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE annual_services SET 
      service_name = $1, description = $2, year_selection = $3, start_date = $4, 
      end_date = $5, service_type = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [service_name, description, year_selection, start_date, end_date, service_type, is_active, id]
    );

    if (result.rows.length > 0) {
      // არსებული სივრცეების კავშირების წაშლა
      await db.query('DELETE FROM service_spaces WHERE service_id = $1', [id]);

      // ახალი სივრცეების კავშირების დამატება
      if (selected_spaces && selected_spaces.length > 0) {
        for (const spaceId of selected_spaces) {
          await db.query(
            'INSERT INTO service_spaces (service_id, space_id) VALUES ($1, $2)',
            [id, spaceId]
          );
        }
      }

      res.status(200).json({ message: 'სერვისი წარმატებით განახლდა.', service: result.rows[0] });
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

    // სივრცეების მიღება
    const spacesResult = await db.query(`
      SELECT s.* FROM spaces s
      JOIN service_spaces ss ON s.id = ss.space_id
      WHERE ss.service_id = $1
    `, [id]);

    // ჯავშნების მიღება
    const bookingsResult = await db.query(`
      SELECT b.*, c.company_name FROM bookings b
      JOIN companies c ON b.company_id = c.id
      WHERE b.service_id = $1
    `, [id]);

    service.spaces = spacesResult.rows;
    service.bookings = bookingsResult.rows;

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`სერვერი გაშვებულია http://0.0.0.0:${PORT}`);
});