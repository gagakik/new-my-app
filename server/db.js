
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('PostgreSQL ბაზასთან კავშირი დამყარდა');
});

pool.on('error', (err) => {
  console.error('PostgreSQL კავშირის შეცდომა:', err);
});

// Promise wrapper for database queries
const query = async (text, params = []) => {
  console.log('Executing PostgreSQL query:', text, 'with params:', params);
  
  try {
    const result = await pool.query(text, params);
    console.log('PostgreSQL query result:', result.rowCount, 'rows affected');
    return result;
  } catch (error) {
    console.error('PostgreSQL query error:', error);
    throw error;
  }
};

// Initialize tables with PostgreSQL syntax
const createTables = async () => {
  try {
    console.log('PostgreSQL ცხრილების შექმნის დაწყება...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'sales', 'marketing', 'user')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created/verified successfully');

    // Companies table
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        identification_code VARCHAR(100),
        company_profile TEXT,
        selected_exhibitions JSONB DEFAULT '[]',
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        code_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10,2) DEFAULT 0,
        image_url VARCHAR(500),
        created_by_id INTEGER,
        updated_by_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Spaces table
    await query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        building_name VARCHAR(255) NOT NULL,
        description TEXT,
        area_sqm DECIMAL(10,2) DEFAULT 0,
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exhibitions table
    await query(`
      CREATE TABLE IF NOT EXISTS exhibitions (
        id SERIAL PRIMARY KEY,
        exhibition_name VARCHAR(255) NOT NULL,
        comment TEXT,
        manager VARCHAR(255),
        price_per_sqm DECIMAL(10,2) DEFAULT 0,
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Annual services table
    await query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        year_selection INTEGER,
        start_date DATE,
        end_date DATE,
        service_type VARCHAR(50) DEFAULT 'ივენთი',
        is_active BOOLEAN DEFAULT TRUE,
        is_archived BOOLEAN DEFAULT FALSE,
        exhibition_id INTEGER,
        created_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_at TIMESTAMP
      )
    `);

    // Service spaces junction table
    await query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL,
        space_id INTEGER NOT NULL,
        UNIQUE(service_id, space_id)
      )
    `);

    // Event participants table
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        registration_status VARCHAR(100) DEFAULT 'მონაწილეობის მოთხოვნა',
        payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
        booth_number VARCHAR(50),
        booth_size VARCHAR(50),
        notes TEXT,
        contact_person VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        payment_amount DECIMAL(10,2),
        payment_due_date DATE,
        payment_method VARCHAR(100),
        invoice_number VARCHAR(100),
        invoice_file VARCHAR(500),
        contract_file VARCHAR(500),
        handover_file VARCHAR(500),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('ყველა PostgreSQL ცხრილა წარმატებით შეიქმნა');
  } catch (error) {
    console.error('PostgreSQL ცხრილების შექმნის შეცდომა:', error);
  }
};

// Initialize database
createTables();

module.exports = { query, pool };
