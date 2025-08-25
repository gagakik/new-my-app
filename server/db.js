<<<<<<< HEAD
const { Pool } = require("pg");
require("dotenv").config();
=======
const { Pool } = require('pg');
require('dotenv').config();
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
<<<<<<< HEAD
});

pool.on("connect", () => {
  console.log("PostgreSQL ბაზასთან კავშირი დამყარდა");
});

pool.on("error", (err) => {
  console.error("PostgreSQL კავშირის შეცდომა:", err);
=======
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
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8
});

// Promise wrapper for database queries
const query = async (text, params = []) => {
<<<<<<< HEAD
  console.log("Executing PostgreSQL query:", text, "with params:", params);

  try {
    const result = await pool.query(text, params);
    console.log("PostgreSQL query result:", result.rowCount, "rows affected");
    return result;
  } catch (error) {
    console.error("PostgreSQL query error:", error);
=======
  console.log('Executing PostgreSQL query:', text, 'with params:', params);

  try {
    const result = await pool.query(text, params);
    console.log('PostgreSQL query result:', result.rowCount, 'rows affected');
    return result;
  } catch (error) {
    console.error('PostgreSQL query error:', error);
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8
    throw error;
  }
};

// Initialize tables with PostgreSQL syntax
const createTables = async () => {
  try {
<<<<<<< HEAD
    console.log("PostgreSQL ცხრილების შექმნის დაწყება...");
=======
    console.log('PostgreSQL ცხრილების შექმნის დაწყება...');
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8

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
<<<<<<< HEAD
    console.log("Users table created/verified successfully");
=======
    console.log('Users table created/verified successfully');
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8

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

    // Event participants table - original version
    // await query(`
    //   CREATE TABLE IF NOT EXISTS event_participants (
    //     id SERIAL PRIMARY KEY,
    //     event_id INTEGER NOT NULL,
    //     company_id INTEGER NOT NULL,
    //     registration_status VARCHAR(100) DEFAULT 'მონაწილეობის მოთხოვნა',
    //     payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
    //     booth_number VARCHAR(50),
    //     booth_size VARCHAR(50),
    //     notes TEXT,
    //     contact_person VARCHAR(255),
    //     contact_position VARCHAR(255),
    //     contact_email VARCHAR(255),
    //     contact_phone VARCHAR(50),
    //     payment_amount DECIMAL(10,2),
    //     payment_due_date DATE,
    //     payment_method VARCHAR(100),
    //     invoice_number VARCHAR(100),
    //     invoice_file VARCHAR(500),
    //     contract_file VARCHAR(500),
    //     handover_file VARCHAR(500),
    //     registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     created_by_user_id INTEGER,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //   )
    // `);

    // Equipment bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // New event_participants table with package support
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        booth_size DECIMAL(10,2),
        booth_number VARCHAR(50),
        payment_amount DECIMAL(10,2),
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
        registration_status VARCHAR(20) DEFAULT 'registered' CHECK (registration_status IN ('registered', 'confirmed', 'cancelled', 'pending')),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_by_user_id INTEGER REFERENCES users(id),
        invoice_file_path VARCHAR(500),
        contract_file_path VARCHAR(500),
        handover_file_path VARCHAR(500),
        package_id INTEGER REFERENCES exhibition_packages(id),
        registration_type VARCHAR(20) DEFAULT 'individual' CHECK (registration_type IN ('individual', 'package'))
      )
    `);

    // Exhibitions packages
    await query(`
      CREATE TABLE IF NOT EXISTS exhibition_packages (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
        package_name VARCHAR(255) NOT NULL,
        description TEXT,
        fixed_area_sqm DECIMAL(10,2) NOT NULL,
        fixed_price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Equipment included in the package
    await query(`
      CREATE TABLE IF NOT EXISTS package_equipment (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES exhibition_packages(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        UNIQUE(package_id, equipment_id)
      )
    `);

<<<<<<< HEAD
    // Dynamic pricing rules
    await query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
        rule_name VARCHAR(255) NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('early_bird', 'volume', 'seasonal', 'last_minute')),
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        fixed_discount_amount DECIMAL(10,2) DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        min_area_sqm DECIMAL(10,2),
        max_area_sqm DECIMAL(10,2),
        min_participants INTEGER,
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Participant pricing details
    await query(`
      CREATE TABLE IF NOT EXISTS participant_pricing (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        base_price DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        final_price DECIMAL(10,2) NOT NULL,
        applied_discounts JSONB,
        pricing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booth_size DECIMAL(10,2),
        participant_count INTEGER DEFAULT 1
      )
    `);

=======
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8
    // Participant's package selection
    await query(`
      CREATE TABLE IF NOT EXISTS participant_package_selection (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES exhibition_packages(id),
        base_price DECIMAL(10,2),
        additional_equipment JSONB,
        total_price DECIMAL(10,2),
        UNIQUE(participant_id)
      )
    `);

    // New participant_selected_equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS participant_selected_equipment (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        is_from_package BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

<<<<<<< HEAD
    // Participant check-ins table
    await query(`
      CREATE TABLE IF NOT EXISTS participant_checkins (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checked_in_by INTEGER REFERENCES users(id),
        notes TEXT,
        UNIQUE(participant_id, event_id)
      )
    `);

    console.log("ყველა PostgreSQL ცხრილა წარმატებით შეიქმნა");
  } catch (error) {
    console.error("PostgreSQL ცხრილების შექმნის შეცდომა:", error);
=======

    console.log('ყველა PostgreSQL ცხრილა წარმატებით შეიქმნა');
  } catch (error) {
    console.error('PostgreSQL ცხრილების შექმნის შეცდომა:', error);
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8
  }
};

// Initialize database
createTables();

<<<<<<< HEAD
module.exports = { query, pool };
=======
module.exports = { query, pool };
>>>>>>> ce4006cad59f36b84da1d9a0b1aeaf8cc643a5d8
