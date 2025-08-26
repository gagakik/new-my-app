
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

// ოპერატორების ჩამოტვირთვა
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM operators ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('ოპერატორების ჩამოტვირთვის შეცდომა:', err);
      return res.status(500).json({ error: 'ოპერატორების ჩამოტვირთვის შეცდომა' });
    }
    res.json(rows);
  });
  
  db.close();
});

// ახალი ოპერატორის დამატება
router.post('/', (req, res) => {
  const { name, phone, role, status } = req.body;
  const db = new sqlite3.Database(dbPath);
  
  // ცხრილის შექმნა თუ არ არსებობს
  db.run(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT DEFAULT 'operator',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('ცხრილის შექმნის შეცდომა:', err);
    }
  });
  
  db.run(
    'INSERT INTO operators (name, phone, role, status) VALUES (?, ?, ?, ?)',
    [name, phone, role, status],
    function(err) {
      if (err) {
        console.error('ოპერატორის დამატების შეცდომა:', err);
        return res.status(500).json({ error: 'ოპერატორის დამატების შეცდომა' });
      }
      res.status(201).json({ 
        id: this.lastID,
        name,
        phone,
        role,
        status
      });
    }
  );
  
  db.close();
});

// ოპერატორის განახლება
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, role, status } = req.body;
  const db = new sqlite3.Database(dbPath);
  
  db.run(
    'UPDATE operators SET name = ?, phone = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, phone, role, status, id],
    function(err) {
      if (err) {
        console.error('ოპერატორის განახლების შეცდომა:', err);
        return res.status(500).json({ error: 'ოპერატორის განახლების შეცდომა' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ოპერატორი ვერ მოიძებნა' });
      }
      res.json({ message: 'ოპერატორი განახლდა' });
    }
  );
  
  db.close();
});

// ოპერატორის წაშლა
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = new sqlite3.Database(dbPath);
  
  db.run('DELETE FROM operators WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('ოპერატორის წაშლის შეცდომა:', err);
      return res.status(500).json({ error: 'ოპერატორის წაშლის შეცდომა' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'ოპერატორი ვერ მოიძებნა' });
    }
    res.json({ message: 'ოპერატორი წაშლილია' });
  });
  
  db.close();
});

module.exports = router;
