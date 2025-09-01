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

    // Exhibitions table first (required for exhibition_packages foreign key)
    await query(`
      CREATE TABLE IF NOT EXISTS exhibitions (
        id SERIAL PRIMARY KEY,
        exhibition_name VARCHAR(255) NOT NULL,
        comment TEXT,
        manager VARCHAR(255),
        price_per_sqm DECIMAL(10,2),
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exhibition packages
    await query(`
      CREATE TABLE IF NOT EXISTS exhibition_packages (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        package_name VARCHAR(255) NOT NULL,
        description TEXT,
        fixed_area_sqm DECIMAL(8,2),
        fixed_price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_bundle BOOLEAN DEFAULT false,
        bundle_discount_percent DECIMAL(5,2) DEFAULT 0,
        early_bird_price DECIMAL(10,2),
        early_bird_end_date DATE,
        last_minute_price DECIMAL(10,2),
        last_minute_start_date DATE
      )
    `);

    // Add missing columns one by one
    const columnsToAdd = [
      { name: 'is_bundle', type: 'BOOLEAN DEFAULT false' },
      { name: 'bundle_discount_percent', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'early_bird_price', type: 'DECIMAL(10,2)' },
      { name: 'early_bird_end_date', type: 'DATE' },
      { name: 'last_minute_price', type: 'DECIMAL(10,2)' },
      { name: 'last_minute_start_date', type: 'DATE' }
    ];

    for (const column of columnsToAdd) {
      try {
        await query(`ALTER TABLE exhibition_packages ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
        console.log(`Column ${column.name} added/verified successfully`);
      } catch (alterError) {
        if (alterError.code === '42701') {
          console.log(`Column ${column.name} already exists`);
        } else {
          console.error(`Error adding column ${column.name}:`, alterError.message);
        }
      }
    }

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

    // Annual services table (events)
    await query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        start_date DATE,
        end_date DATE,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Event participants table
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES annual_services(id),
        company_id INTEGER REFERENCES companies(id),
        participant_name VARCHAR(255),
        booth_number VARCHAR(50),
        registration_status VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა',
        registration_type VARCHAR(20) DEFAULT 'individual' CHECK (registration_type IN ('individual', 'package')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Package Bundles table
    await query(`
      CREATE TABLE IF NOT EXISTS package_bundles (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        bundle_name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bundle packages junction table
    await query(`
      CREATE TABLE IF NOT EXISTS bundle_packages (
        id SERIAL PRIMARY KEY,
        bundle_id INTEGER REFERENCES package_bundles(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES exhibition_packages(id) ON DELETE CASCADE,
        UNIQUE(bundle_id, package_id)
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