
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');

// JWT მიდლვერი
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'ავტორიზაციის ტოკენი არ არის მოწოდებული.' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'არასწორი ან ვადაგასული ავტორიზაციის ტოკენი.' });
    }
    req.user = user;
    next();
  });
}

// ცხრილების შექმნა
function initializeTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS work_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id INTEGER NOT NULL,
      stand_id INTEGER,
      project_name TEXT,
      date DATE NOT NULL,
      hours_worked DECIMAL(4,2) NOT NULL,
      hourly_rate DECIMAL(8,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operator_id) REFERENCES operators(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT DEFAULT 'open',
      total_amount DECIMAL(12,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      total_hours DECIMAL(8,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      bonus_amount DECIMAL(8,2) DEFAULT 0,
      deduction_amount DECIMAL(8,2) DEFAULT 0,
      final_amount DECIMAL(10,2) NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      payment_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
      FOREIGN KEY (operator_id) REFERENCES operators(id)
    )
  `);
}

// სამუშაო საათების დამატება
router.post('/work-hours', authenticateToken, (req, res) => {
  const { operator_id, stand_id, project_name, date, hours_worked, hourly_rate, description } = req.body;
  const db = new sqlite3.Database(dbPath);
  
  initializeTables(db);
  
  const total_amount = hours_worked * hourly_rate;
  
  db.run(
    `INSERT INTO work_hours (operator_id, stand_id, project_name, date, hours_worked, hourly_rate, total_amount, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [operator_id, stand_id, project_name, date, hours_worked, hourly_rate, total_amount, description],
    function(err) {
      if (err) {
        console.error('სამუშაო საათების დამატების შეცდომა:', err);
        return res.status(500).json({ error: 'სამუშაო საათების დამატების შეცდომა' });
      }
      res.status(201).json({ 
        id: this.lastID,
        operator_id,
        stand_id,
        project_name,
        date,
        hours_worked,
        hourly_rate,
        total_amount,
        description
      });
    }
  );
  
  db.close();
});

// სამუშაო საათების ჩამოტვირთვა
router.get('/work-hours', authenticateToken, (req, res) => {
  const { operator_id, start_date, end_date, status } = req.query;
  const db = new sqlite3.Database(dbPath);
  
  let whereClause = 'WHERE 1=1';
  let params = [];
  
  if (operator_id) {
    whereClause += ' AND wh.operator_id = ?';
    params.push(operator_id);
  }
  
  if (start_date) {
    whereClause += ' AND wh.date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    whereClause += ' AND wh.date <= ?';
    params.push(end_date);
  }
  
  if (status) {
    whereClause += ' AND wh.status = ?';
    params.push(status);
  }
  
  db.all(`
    SELECT 
      wh.*,
      o.name as operator_name,
      s.name as stand_name
    FROM work_hours wh
    LEFT JOIN operators o ON wh.operator_id = o.id
    LEFT JOIN stands s ON wh.stand_id = s.id
    ${whereClause}
    ORDER BY wh.date DESC, wh.created_at DESC
  `, params, (err, rows) => {
    if (err) {
      console.error('სამუშაო საათების ჩამოტვირთვის შეცდომა:', err);
      return res.status(500).json({ error: 'სამუშაო საათების ჩამოტვირთვის შეცდომა' });
    }
    res.json(rows);
  });
  
  db.close();
});

// სამუშაო საათების განახლება
router.put('/work-hours/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { hours_worked, hourly_rate, description, status } = req.body;
  const db = new sqlite3.Database(dbPath);
  
  const total_amount = hours_worked * hourly_rate;
  
  db.run(
    `UPDATE work_hours 
     SET hours_worked = ?, hourly_rate = ?, total_amount = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [hours_worked, hourly_rate, total_amount, description, status, id],
    function(err) {
      if (err) {
        console.error('სამუშაო საათების განახლების შეცდომა:', err);
        return res.status(500).json({ error: 'სამუშაო საათების განახლების შეცდომა' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ჩანაწერი ვერ მოიძებნა' });
      }
      res.json({ message: 'სამუშაო საათები განახლდა' });
    }
  );
  
  db.close();
});

// ანაზღაურების პერიოდის შექმნა
router.post('/payroll-periods', authenticateToken, (req, res) => {
  const { period_name, start_date, end_date } = req.body;
  const db = new sqlite3.Database(dbPath);
  
  initializeTables(db);
  
  db.run(
    `INSERT INTO payroll_periods (period_name, start_date, end_date) VALUES (?, ?, ?)`,
    [period_name, start_date, end_date],
    function(err) {
      if (err) {
        console.error('ანაზღაურების პერიოდის შექმნის შეცდომა:', err);
        return res.status(500).json({ error: 'ანაზღაურების პერიოდის შექმნის შეცდომა' });
      }
      res.status(201).json({ 
        id: this.lastID,
        period_name,
        start_date,
        end_date
      });
    }
  );
  
  db.close();
});

// ანაზღაურების გამოთვლა
router.post('/calculate-payroll/:period_id', authenticateToken, (req, res) => {
  const { period_id } = req.params;
  const db = new sqlite3.Database(dbPath);
  
  // პერიოდის მონაცემების მიღება
  db.get('SELECT * FROM payroll_periods WHERE id = ?', [period_id], (err, period) => {
    if (err || !period) {
      return res.status(404).json({ error: 'პერიოდი ვერ მოიძებნა' });
    }
    
    // ოპერატორების სამუშაო საათების მიღება
    db.all(`
      SELECT 
        wh.operator_id,
        o.name as operator_name,
        SUM(wh.hours_worked) as total_hours,
        SUM(wh.total_amount) as total_amount,
        AVG(wh.hourly_rate) as avg_hourly_rate
      FROM work_hours wh
      LEFT JOIN operators o ON wh.operator_id = o.id
      WHERE wh.date >= ? AND wh.date <= ? AND wh.status = 'approved'
      GROUP BY wh.operator_id, o.name
    `, [period.start_date, period.end_date], (err, results) => {
      if (err) {
        console.error('ანაზღაურების გამოთვლის შეცდომა:', err);
        return res.status(500).json({ error: 'ანაზღაურების გამოთვლის შეცდომა' });
      }
      
      const totalPayroll = results.reduce((sum, operator) => sum + operator.total_amount, 0);
      
      res.json({
        period: period,
        operators: results,
        totalPayroll: totalPayroll.toFixed(2),
        summary: {
          totalOperators: results.length,
          totalHours: results.reduce((sum, op) => sum + op.total_hours, 0).toFixed(2),
          averageHourlyRate: (results.reduce((sum, op) => sum + op.avg_hourly_rate, 0) / results.length).toFixed(2)
        }
      });
    });
  });
  
  db.close();
});

// ანაზღაურების ისტორია
router.get('/payroll-history', authenticateToken, (req, res) => {
  const { operator_id } = req.query;
  const db = new sqlite3.Database(dbPath);
  
  let whereClause = '';
  let params = [];
  
  if (operator_id) {
    whereClause = 'WHERE pp.operator_id = ?';
    params.push(operator_id);
  }
  
  db.all(`
    SELECT 
      pp.*,
      o.name as operator_name,
      pr.period_name,
      pr.start_date,
      pr.end_date
    FROM payroll_payments pp
    LEFT JOIN operators o ON pp.operator_id = o.id
    LEFT JOIN payroll_periods pr ON pp.period_id = pr.id
    ${whereClause}
    ORDER BY pr.end_date DESC
  `, params, (err, rows) => {
    if (err) {
      console.error('ანაზღაურების ისტორიის ჩამოტვირთვის შეცდომა:', err);
      return res.status(500).json({ error: 'ანაზღაურების ისტორიის ჩამოტვირთვის შეცდომა' });
    }
    res.json(rows);
  });
  
  db.close();
});

module.exports = router;
