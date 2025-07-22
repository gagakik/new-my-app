const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // დაამატეთ multer
const path = require('path'); // დაამატეთ path მოდული

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- multer კონფიგურაცია სურათების ატვირთვისთვის ---
// სურათების შენახვის ადგილი
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // დარწმუნდით, რომ 'uploads' საქაღალდე არსებობს თქვენს server დირექტორიაში
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // უნიკალური ფაილის სახელი
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
        return res.sendStatus(401); // თუ ტოკენი არ არსებობს
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // თუ ტოკენი არასწორია
        }
        req.user = user; // მომხმარებლის მონაცემების დამატება მოთხოვნაში (id, username, role)
        next();
    });
}

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
        res.status(200).json({ message: 'შესვლა წარმატებით დასრულდა.', role: user.role, token: token, userId: user.id });
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
app.post('/api/exhibitions', async (req, res) => {
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
app.put('/api/exhibitions/:id', async (req, res) => {
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
app.delete('/api/exhibitions/:id', async (req, res) => {
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
// შეცვლილია: იღებს ფაილს და მონაცემებს
app.post('/api/equipment', authenticateToken, authorizeEquipmentManagement, upload.single('image'), async (req, res) => {
    const { code_name, quantity, price, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null; // სურათის URL
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
            return res.status(409).json({ message: 'აღჭურვილობა ამ კოდური სახელით უკვე არსებობს.' });
        }
        res.status(500).json({ message: 'აღჭურვილობის დამატება ვერ მოხერხდა.', error: error.message });
    }
});

// PUT: აღჭურვილობის რედაქტირება ID-ის მიხედვით (მხოლოდ admin, operation)
// შეცვლილია: იღებს ფაილს და მონაცემებს
app.put('/api/equipment/:id', authenticateToken, authorizeEquipmentManagement, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { code_name, quantity, price, description } = req.body;
    let image_url = req.body.image_url_existing || null; // არსებული URL-ის მიღება
    if (req.file) {
        image_url = `/uploads/${req.file.filename}`; // ახალი სურათის URL
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
            return res.status(409).json({ message: 'აღჭურვილობა ამ კოდური სახელით უკვე არსებობს.' });
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


app.listen(PORT, () => {
  console.log(`სერვერი გაშვებულია http://localhost:${PORT}`);
});
