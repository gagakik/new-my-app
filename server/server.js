require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- multer კონფიგურაცია სურათების ატვირთვისთვის ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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
app.get('/api/exhibitions', async (req, res) => {
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
app.get('/api/equipment', async (req, res) => {
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
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
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
        image_url = `/uploads/${req.file.filename}`;
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
<<<<<<< HEAD
=======

// GET: ყველა სივრცის მიღება (ყველა ავტორიზებული მომხმარებლისთვის)
app.get('/api/spaces', async (req, res) => {
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

>>>>>>> e8881a64810b628cdde938a6aa8d6d64c1684dd8

// GET: ყველა სივრცის მიღება (ყველა ავტორიზებული მომხმარებლისთვის)
app.get('/api/spaces', async (req, res) => {
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

// --- სტატისტიკის API ენდპოინტები ---

// GET: სტატისტიკის მიღება
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        // ძირითადი მონაცემები
        const overviewQuery = `
            SELECT 
                (SELECT COUNT(*) FROM exhibitions) as total_exhibitions,
                (SELECT COUNT(*) FROM companies) as total_companies,
                (SELECT COUNT(*) FROM bookings) as total_bookings,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'confirmed') as total_revenue
        `;
        const overviewResult = await db.query(overviewQuery);
        
        // ყოველთვიური ჯავშნები
        const monthlyQuery = `
            SELECT 
                DATE_TRUNC('month', booking_date) as month,
                COUNT(*) as booking_count,
                COALESCE(SUM(total_amount), 0) as revenue
            FROM bookings 
            WHERE booking_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', booking_date)
            ORDER BY month DESC
        `;
        const monthlyResult = await db.query(monthlyQuery);
        
        // ტოპ სერვისები
        const topServicesQuery = `
            SELECT 
                s.service_name,
                COUNT(b.id) as booking_count,
                COALESCE(SUM(b.total_amount), 0) as total_revenue
            FROM annual_services s
            LEFT JOIN bookings b ON s.id = b.service_id
            GROUP BY s.id, s.service_name
            ORDER BY booking_count DESC
            LIMIT 5
        `;
        const topServicesResult = await db.query(topServicesQuery);
        
        res.status(200).json({
            overview: overviewResult.rows[0],
            monthly_bookings: monthlyResult.rows,
            top_services: topServicesResult.rows
        });
    } catch (error) {
        console.error('შეცდომა სტატისტიკის მიღებისას:', error);
        res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// --- ყოველწლური სერვისების API ენდპოინტები ---

// GET: ყველა ყოველწლური სერვისის მიღება
app.get('/api/annual-services', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, 
                   COUNT(DISTINCT ss.space_id) as spaces_count,
                   COUNT(DISTINCT b.id) as bookings_count
            FROM annual_services s
            LEFT JOIN service_spaces ss ON s.id = ss.service_id
            LEFT JOIN bookings b ON s.id = b.service_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('შეცდომა სერვისების მიღებისას:', error);
        res.status(500).json({ message: 'სერვისების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// GET: სერვისის დეტალების მიღება
app.get('/api/annual-services/:id/details', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // სერვისის ძირითადი ინფორმაცია
        const serviceResult = await db.query('SELECT * FROM annual_services WHERE id = $1', [id]);
        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
        }
        const service = serviceResult.rows[0];

        // სერვისის სივრცეები
        const spacesResult = await db.query(`
            SELECT sp.* FROM spaces sp
            JOIN service_spaces ss ON sp.id = ss.space_id
            WHERE ss.service_id = $1
        `, [id]);

        // სერვისის ჯავშნები
        const bookingsResult = await db.query(`
            SELECT b.*, c.company_name, e.exhibition_name 
            FROM bookings b
            LEFT JOIN companies c ON b.company_id = c.id
            LEFT JOIN exhibitions e ON b.exhibition_id = e.id
            WHERE b.service_id = $1
            ORDER BY b.booking_date DESC
        `, [id]);

        res.status(200).json({
            ...service,
            spaces: spacesResult.rows,
            bookings: bookingsResult.rows
        });
    } catch (error) {
        console.error('შეცდომა სერვისის დეტალების მიღებისას:', error);
        res.status(500).json({ message: 'სერვისის დეტალების მიღება ვერ მოხერხდა.', error: error.message });
    }
});

// POST: ახალი ყოველწლური სერვისის დამატება (მხოლოდ admin, sales, marketing)
app.post('/api/annual-services', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
    }

    const { service_name, description, year_selection, start_date, end_date, service_type, is_active, selected_spaces } = req.body;
    const created_by_user_id = req.user.id;

    try {
        // სერვისის დამატება
        const result = await db.query(
            'INSERT INTO annual_services (service_name, description, year_selection, start_date, end_date, service_type, is_active, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
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

// PUT: ყოველწლური სერვისის რედაქტირება
app.put('/api/annual-services/:id', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
    }

    const { id } = req.params;
    const { service_name, description, year_selection, start_date, end_date, service_type, is_active, selected_spaces } = req.body;

    try {
        // სერვისის განახლება
        const result = await db.query(
            'UPDATE annual_services SET service_name = $1, description = $2, year_selection = $3, start_date = $4, end_date = $5, service_type = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
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

// PUT: სერვისის არქივში გადატანა
app.put('/api/annual-services/:id/archive', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
    }

    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE annual_services SET is_archived = true, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
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

// DELETE: ყოველწლური სერვისის წაშლა
app.delete('/api/annual-services/:id', authenticateToken, async (req, res) => {
    const allowedRoles = ['admin', 'sales', 'marketing'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ სერვისების მართვის უფლება.' });
    }

    const { id } = req.params;
    try {
        // ჯერ შევამოწმოთ ხომ არ არსებობს დაკავშირებული ჯავშნები
        const bookingsResult = await db.query('SELECT COUNT(*) FROM bookings WHERE service_id = $1', [id]);
        const bookingsCount = parseInt(bookingsResult.rows[0].count);

        if (bookingsCount > 0) {
            return res.status(400).json({ 
                message: `სერვისის წაშლა შეუძლებელია. მასზე არსებობს ${bookingsCount} აქტიური ჯავშანი. ჯერ წაშალეთ ყველა ჯავშანი ან გადაიტანეთ სერვისი არქივში.` 
            });
        }

        // თუ ჯავშნები არ არსებობს, მაშინ შეგვიძლია სერვისის წაშლა
        const result = await db.query('DELETE FROM annual_services WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'სერვისი წარმატებით წაიშალა.' });
        } else {
            res.status(404).json({ message: 'სერვისი ვერ მოიძებნა.' });
        }
    } catch (error) {
        console.error('შეცდომა სერვისის წაშლისას:', error);
        if (error.code === '23503') {
            res.status(400).json({ message: 'სერვისის წაშლა შეუძლებელია. მასზე არსებობს დაკავშირებული ჯავშნები.' });
        } else {
            res.status(500).json({ message: 'სერვისის წაშლა ვერ მოხერხდა.', error: error.message });
        }
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
        // Calculate total amount based on service price
        const serviceResult = await db.query('SELECT price FROM annual_services WHERE id = $1', [service_id]);
        const total_amount = serviceResult.rows[0]?.price || 0;

        const result = await db.query(
            'INSERT INTO bookings (service_id, exhibition_id, company_id, booking_date, start_time, end_time, total_amount, notes, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [service_id, exhibition_id, company_id, booking_date, start_time, end_time, total_amount, notes, created_by_user_id]
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

// --- სტატისტიკის API ენდპოინტები ---

// GET: სტატისტიკის მიღება
app.get('/api/statistics', authenticateToken, async (req, res) => {
    try {
        // General statistics
        const totalExhibitions = await db.query('SELECT COUNT(*) FROM exhibitions');
        const totalCompanies = await db.query('SELECT COUNT(*) FROM companies');
        const totalBookings = await db.query('SELECT COUNT(*) FROM bookings');
        const totalRevenue = await db.query('SELECT SUM(total_amount) FROM bookings WHERE status = $1', ['confirmed']);

        // Monthly bookings
        const monthlyBookings = await db.query(`
            SELECT 
                DATE_TRUNC('month', booking_date) as month,
                COUNT(*) as booking_count,
                SUM(total_amount) as revenue
            FROM bookings 
            WHERE booking_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', booking_date)
            ORDER BY month
        `);

        // Top services
        const topServices = await db.query(`
            SELECT 
                s.service_name,
                COUNT(b.id) as booking_count,
                SUM(b.total_amount) as total_revenue
            FROM annual_services s
            LEFT JOIN bookings b ON s.id = b.service_id
            GROUP BY s.id, s.service_name
            ORDER BY booking_count DESC
            LIMIT 5
        `);

        res.status(200).json({
            overview: {
                total_exhibitions: parseInt(totalExhibitions.rows[0].count),
                total_companies: parseInt(totalCompanies.rows[0].count),
                total_bookings: parseInt(totalBookings.rows[0].count),
                total_revenue: parseFloat(totalRevenue.rows[0].sum || 0)
            },
            monthly_bookings: monthlyBookings.rows,
            top_services: topServices.rows
        });
    } catch (error) {
        console.error('შეცდომა სტატისტიკის მიღებისას:', error);
        res.status(500).json({ message: 'სტატისტიკის მიღება ვერ მოხერხდა.', error: error.message });
    }
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`სერვერი გაშვებულია http://0.0.0.0:${PORT}`);
});
