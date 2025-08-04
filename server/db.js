const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // ლოკალური PostgreSQL-ისთვის SSL გამორთული
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
          'ჩინეთი', 'ბრაზილია', 'მექსიკა', 'არგენტინა', 'ჩილე',
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

    // Remove price column if it exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'price'
        ) THEN
          ALTER TABLE annual_services DROP COLUMN price;
        END IF;
      END $$;
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

        -- Add is_archived column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'is_archived'
        ) THEN
          ALTER TABLE annual_services 
          ADD COLUMN is_archived BOOLEAN DEFAULT false;
        END IF;

        -- Add archived_at column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'archived_at'
        ) THEN
          ALTER TABLE annual_services 
          ADD COLUMN archived_at TIMESTAMP;
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

    // Service-Exhibition junction table (სერვისი-გამოფენის კავშირი)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_exhibitions (
        id SERIAL PRIMARY KEY,
        service_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        exhibition_id INTEGER REFERENCES exhibitions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_id, exhibition_id)
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
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `);

    // Remove total_amount column if it exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'bookings' AND column_name = 'total_amount'
        ) THEN
          ALTER TABLE bookings DROP COLUMN total_amount;
        END IF;
      END $$;
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

    // Add tracking columns to exhibitions table
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exhibitions' AND column_name = 'created_by_user_id'
        ) THEN
          ALTER TABLE exhibitions ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exhibitions' AND column_name = 'updated_by_user_id'
        ) THEN
          ALTER TABLE exhibitions ADD COLUMN updated_by_user_id INTEGER REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exhibitions' AND column_name = 'created_at'
        ) THEN
          ALTER TABLE exhibitions ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exhibitions' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE exhibitions ADD COLUMN updated_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // Add tracking columns to annual_services table
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'created_by_user_id'
        ) THEN
          ALTER TABLE annual_services ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'updated_by_user_id'
        ) THEN
          ALTER TABLE annual_services ADD COLUMN updated_by_user_id INTEGER REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'created_at'
        ) THEN
          ALTER TABLE annual_services ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE annual_services ADD COLUMN updated_at TIMESTAMP;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'annual_services' AND column_name = 'exhibition_id'
        ) THEN
          ALTER TABLE annual_services ADD COLUMN exhibition_id INTEGER REFERENCES exhibitions(id);
        END IF;
      END $$;
    `);

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_entity_type VARCHAR(50),
        related_entity_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // Event Participants table (ივენთის მონაწილეები)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        registration_status VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა',
        payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
        booth_number VARCHAR(20),
        booth_size DECIMAL(10,2),
        notes TEXT,
        contact_person VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        payment_amount DECIMAL(10,2),
        payment_due_date DATE,
        payment_method VARCHAR(50),
        invoice_number VARCHAR(100),
        invoice_file VARCHAR(500),
        contract_file VARCHAR(500),
        handover_file VARCHAR(500),
        registration_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        UNIQUE(event_id, company_id)
      );
    `);

    // Add contact_position column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'event_participants' AND column_name = 'contact_position'
        ) THEN
          ALTER TABLE event_participants ADD COLUMN contact_position VARCHAR(255);
        END IF;
      END $$;
    `);

    // Add file attachment columns if they don't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'event_participants' AND column_name = 'invoice_file'
        ) THEN
          ALTER TABLE event_participants ADD COLUMN invoice_file VARCHAR(500);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'event_participants' AND column_name = 'contract_file'
        ) THEN
          ALTER TABLE event_participants ADD COLUMN contract_file VARCHAR(500);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'event_participants' AND column_name = 'handover_file'
        ) THEN
          ALTER TABLE event_participants ADD COLUMN handover_file VARCHAR(500);
        END IF;
      END $$;
    `);

    // აღჭურვილობის ცხრილი
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        code_name VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        price DECIMAL(10,2),
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER REFERENCES users(id),
        updated_by_id INTEGER REFERENCES users(id)
      )
    `);

    // დავამატოთ ველები თუ არ არსებობს
    await pool.query(`
      ALTER TABLE equipment 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER REFERENCES users(id)
    `);

    await pool.query(`
      ALTER TABLE annual_services 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER REFERENCES users(id)
    `);

    await pool.query(`
      ALTER TABLE exhibitions 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER REFERENCES users(id)
    `);

    await pool.query(`
      ALTER TABLE spaces 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER REFERENCES users(id)
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
      );
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