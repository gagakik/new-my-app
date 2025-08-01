const express = require('express');
const router = express.Router();
const db = require('../db');
const { Pool } = require('pg');

// Replace with your actual database connection details
const pool = new Pool({
  user: 'your_db_user',
  host: 'your_db_host',
  database: 'your_db_name',
  password: 'your_db_password',
  port: 5432,
});

router.use(express.json());

// Middleware to simulate user authentication (replace with actual auth)
router.use((req, res, next) => {
  //Simulate a logged-in user
  req.user = { id: 1 };
  next();
});

// POST route to create a new company
router.post('/companies', async (req, res) => {
  const { name, address, phone, email, website, industry, description, logoPath } = req.body;

  try {
    // Add audit fields to company creation
    const result = await pool.query(
      'INSERT INTO companies (name, address, phone, email, website, industry, description, logo_path, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, address, phone, email, website, industry, description, logoPath, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// PUT route to update an existing company
router.put('/companies/:id', async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, website, industry, description, logoPath } = req.body;

  try {
    // Add audit fields to company update
    const result = await pool.query(
      `UPDATE companies 
       SET name = $1, address = $2, phone = $3, email = $4, website = $5, 
           industry = $6, description = $7, logo_path = $8, updated_at = CURRENT_TIMESTAMP, updated_by = $10
       WHERE id = $9 RETURNING *`,
      [name, address, phone, email, website, industry, description, logoPath, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Company not found');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Export the router
module.exports = router;