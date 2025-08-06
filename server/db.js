const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // ლოკალური PostgreSQL-ისთვის SSL გამორთული
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'sales', 'marketing', 'operation', 'user')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exhibitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exhibitions (
        id SERIAL PRIMARY KEY,
        exhibition_name VARCHAR(255) NOT NULL,
        comment TEXT,
        manager VARCHAR(255),
        price_per_sqm DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Equipment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        code_name VARCHAR(255) UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10,2),
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER REFERENCES users(id),
        updated_by_id INTEGER REFERENCES users(id)
      )
    `);

    // Spaces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        building_name VARCHAR(255),
        description TEXT,
        area_sqm DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Companies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        country VARCHAR(255),
        identification_code VARCHAR(255),
        company_profile TEXT,
        contact_person VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        selected_exhibitions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Annual services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        year_selection INTEGER,
        start_date DATE,
        end_date DATE,
        service_type VARCHAR(100) DEFAULT 'ივენთი',
        is_active BOOLEAN DEFAULT true,
        is_archived BOOLEAN DEFAULT false,
        archived_at TIMESTAMP,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Event participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        company_id INTEGER REFERENCES companies(id),
        registration_status VARCHAR(100) DEFAULT 'მონაწილეობის მოთხოვნა',
        payment_status VARCHAR(100) DEFAULT 'მომლოდინე',
        booth_number VARCHAR(100),
        booth_size VARCHAR(100),
        notes TEXT,
        contact_person VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        payment_amount DECIMAL(10,2),
        payment_due_date DATE,
        payment_method VARCHAR(100),
        invoice_number VARCHAR(255),
        invoice_file VARCHAR(500),
        contract_file VARCHAR(500),
        handover_file VARCHAR(500),
        invoice_file_path VARCHAR(500),
        contract_file_path VARCHAR(500),
        handover_file_path VARCHAR(500),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Equipment bookings table
    await pool.query(`
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

    // Service spaces junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
        UNIQUE(service_id, space_id)
      )
    `);

    // Event completion table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_completion (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES annual_services(id),
        participant_id INTEGER REFERENCES event_participants(id),
        company_id INTEGER REFERENCES companies(id),
        company_name VARCHAR(255),
        registration_status VARCHAR(100),
        payment_status VARCHAR(100),
        payment_amount DECIMAL(10,2),
        payment_method VARCHAR(100),
        invoice_number VARCHAR(255),
        booth_number VARCHAR(100),
        booth_size VARCHAR(100),
        invoice_file_path VARCHAR(500),
        contract_file_path VARCHAR(500),
        handover_file_path VARCHAR(500),
        equipment_bookings JSONB,
        completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        UNIQUE(event_id, participant_id)
      )
    `);

    console.log('ბაზის ტაბულები წარმატებით შეიქმნა');
  } catch (error) {
    console.error('ტაბულების შექმნის შეცდომა:', error);
  }
};

// Initialize database
createTables();

module.exports = pool;