
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, 'database.sqlite');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('SQLite კავშირის შეცდომა:', err);
  } else {
    console.log('SQLite ბაზასთან კავშირი დამყარდა');
  }
});

// Promise wrapper for database queries
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    const method = sql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
    
    db[method](sql, params, function(err, result) {
      if (err) {
        reject(err);
      } else {
        if (method === 'run') {
          resolve({ rows: [], lastID: this.lastID, changes: this.changes });
        } else {
          resolve({ rows: result || [] });
        }
      }
    });
  });
};

// Initialize tables
const createTables = async () => {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        country TEXT,
        identification_code TEXT,
        company_profile TEXT,
        selected_exhibitions TEXT DEFAULT '[]',
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        image_url TEXT,
        created_by_id INTEGER,
        updated_by_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Spaces table
    await query(`
      CREATE TABLE IF NOT EXISTS spaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        building_name TEXT NOT NULL,
        description TEXT,
        area_sqm REAL DEFAULT 0,
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Exhibitions table
    await query(`
      CREATE TABLE IF NOT EXISTS exhibitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exhibition_name TEXT NOT NULL,
        comment TEXT,
        manager TEXT,
        price_per_sqm REAL DEFAULT 0,
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Annual services table
    await query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        description TEXT,
        year_selection INTEGER,
        start_date TEXT,
        end_date TEXT,
        service_type TEXT DEFAULT 'ივენთი',
        is_active BOOLEAN DEFAULT 1,
        is_archived BOOLEAN DEFAULT 0,
        exhibition_id INTEGER,
        created_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        archived_at DATETIME
      )
    `);

    // Service spaces junction table
    await query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL,
        space_id INTEGER NOT NULL,
        UNIQUE(service_id, space_id)
      )
    `);

    // Event participants table
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        company_id INTEGER NOT NULL,
        registration_status TEXT DEFAULT 'მონაწილეობის მოთხოვნა',
        payment_status TEXT DEFAULT 'მომლოდინე',
        booth_number TEXT,
        booth_size TEXT,
        notes TEXT,
        contact_person TEXT,
        contact_position TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        payment_amount REAL,
        payment_due_date TEXT,
        payment_method TEXT,
        invoice_number TEXT,
        invoice_file TEXT,
        contract_file TEXT,
        handover_file TEXT,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_id INTEGER NOT NULL,
        equipment_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('ყველა ტაბულა წარმატებით შეიქმნა');
  } catch (error) {
    console.error('ტაბულების შექმნის შეცდომა:', error);
  }
};

// Initialize database
createTables();

module.exports = { query };
