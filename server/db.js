const { Pool } = require('pg');
require('dotenv').config(); // .env ფაილის ჩასატვირთად

const pool = new Pool({
  user: process.env.DB_USER,        // მომხმარებლის სახელი .env-დან
  host: process.env.DB_HOST,        // ჰოსტი .env-დან (localhost)
  database: process.env.DB_DATABASE, // ბაზის სახელი .env-დან
  password: process.env.DB_PASSWORD, // პაროლი .env-დან
  port: process.env.DB_PORT,        // პორტი .env-დან
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
        role VARCHAR(50) DEFAULT 'user',
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Create country ENUM
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE company_country AS ENUM (
          'საქართველო', 'აშშ', 'გერმანია', 'საფრანგეთი', 'დიდი ბრიტანეთი',
          'იტალია', 'ესპანეთი', 'კანადა', 'ავსტრალია', 'იაპონია',
          'ჩინეთი', 'ბრაზილია', 'მექსიკო', 'არგენტინა', 'ჩილე',
          'ინდოეთი', 'თურქეთი', 'რუსეთი', 'უკრაინა', 'პოლონეთი'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Companies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        country company_country,
        company_profile TEXT,
        identification_code VARCHAR(255) UNIQUE,
        legal_address TEXT,
        contact_persons JSONB,
        website VARCHAR(255),
        comment TEXT,
        status VARCHAR(50) DEFAULT 'აქტიური',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Spaces table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        building_name VARCHAR(255) NOT NULL,
        description TEXT,
        area_sqm DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id)
      )
    `);
    // Create service_type ENUM
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE service_type AS ENUM (
          'გამოფენა', 'კონფერენცია', 'გაქირავება', 'ივენთი'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Annual Services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        year_selection INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        service_type service_type NOT NULL DEFAULT 'გამოფენა',
        is_active BOOLEAN DEFAULT true,
        is_archived BOOLEAN DEFAULT false,
        archived_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Add missing columns if they don't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add year_selection column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'year_selection'
        ) THEN
          ALTER TABLE annual_services 
          ADD COLUMN year_selection INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
        END IF;
        
        -- Add start_date column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'start_date'
        ) THEN
          ALTER TABLE annual_services 
          ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
        END IF;
        
        -- Add end_date column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'end_date'
        ) THEN
          ALTER TABLE annual_services 
          ADD COLUMN end_date DATE NOT NULL DEFAULT CURRENT_DATE + INTERVAL '1 day';
        END IF;
      END $$;
    `);

    // Service-Space junction table (სერვისი-სივრცის კავშირი)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_id, space_id)
      )
    `);

    // Bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES annual_services(id),
        exhibition_id INTEGER REFERENCES exhibitions(id),
        company_id INTEGER REFERENCES companies(id),
        booking_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Statistics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        metric_name VARCHAR(255) NOT NULL,
        metric_value DECIMAL(15,2),
        metric_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Company-Exhibition junction table (კომპანია-გამოფენის კავშირი)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_exhibitions (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
        participation_status VARCHAR(50) DEFAULT 'მონაწილე',
        booth_number VARCHAR(50),
        booth_size DECIMAL(10,2),
        registration_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, exhibition_id)
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
};

// Initialize tables
createTables();
module.exports = {
  query: (text, params) => pool.query(text, params),
};