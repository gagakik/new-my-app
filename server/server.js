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
app.post('/api/exhibitions', authenticateToken, authorizeCompanyManagement, async (req, res) => { // დავამატეთ ავტორიზაცია
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
app.put('/api/exhibitions/:id', authenticateToken, authorizeCompanyManagement, async (req, res) => { // დავამატეთ ავტორიზაცია
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
app.delete('/api/exhibitions/:id', authenticateToken, authorizeCompanyManagement, async (req, res) => { // დავამატეთ ავტორიზაცია
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

// დამხმარე ფუნქცია როლის შემოწმებისთვის
const authorizeEquipmentManagement = (req, res, next) => {
    const allowedRoles = ['admin', 'operation'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'წვდომა აკრძალულია: არ გაქვთ აღჭურვილობის მართვის უფლება.' });
    }
    next();
};

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
        website, comment, status
    } = req.body;
    const created_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
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
        res.status(201).json({ message: 'კომპანია წარმატებით დაემატა.', company: result.rows[0] });
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
        website, comment, status
    } = req.body;
    const updated_by_user_id = req.user.id; // მომხმარებლის ID ტოკენიდან

    try {
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


app.listen(PORT, () => {
  console.log(`სერვერი გაშვებულია http://localhost:${PORT}`);
});
