const { Pool } = require("pg");
require("dotenv").config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
});

pool.on("connect", () => {
  console.log("PostgreSQL ბაზასთან კავშირი დამყარდა");
});

pool.on("error", (err) => {
  console.error("PostgreSQL კავშირის შეცდომა:", err);
});

// Promise wrapper for database queries
const query = async (text, params = []) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("PostgreSQL query error:", error.message);
    console.error("Query:", text);
    console.error("Params:", params);
    throw error;
  }
};

// Initialize tables with PostgreSQL syntax
const createTables = async () => {
  try {
    console.log("PostgreSQL ცხრილების შექმნის დაწყება...");

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'sales', 'marketing', 'user', 'operation', 'finance')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    await query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        identification_code VARCHAR(100) UNIQUE,
        company_profile TEXT,
        legal_address TEXT,
        website VARCHAR(500),
        comment TEXT,
        status VARCHAR(50) DEFAULT 'აქტიური',
        selected_exhibitions JSONB DEFAULT '[]',
        contact_persons JSONB DEFAULT '[]',
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
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
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
        manager VARCHAR(255),
        created_by_user_id INTEGER,
        updated_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Annual Services table with proper DATE columns
    await query(`
      CREATE TABLE IF NOT EXISTS annual_services (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        description TEXT,
        year_selection INTEGER,
        start_date DATE,
        end_date DATE,
        start_time TIME,
        end_time TIME,
        service_type VARCHAR(50) DEFAULT 'ივენთი',
        is_active BOOLEAN DEFAULT TRUE,
        is_archived BOOLEAN DEFAULT FALSE,
        exhibition_id INTEGER,
        created_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_at TIMESTAMP,
        plan_file_path VARCHAR(500),
        invoice_files JSONB DEFAULT '[]',
        expense_files JSONB DEFAULT '[]',
        plan_updated_at TIMESTAMP,
        files_updated_at TIMESTAMP
      )
    `);

    console.log("DATE columns verified for annual_services table");

    // Service Spaces table
    await query(`
      CREATE TABLE IF NOT EXISTS service_spaces (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL,
        space_id INTEGER NOT NULL,
        UNIQUE(service_id, space_id)
      )
    `);

    // **ATTENTION: The following table was moved to resolve the dependency issue.**
    // Event Participants table
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        annual_service_id INTEGER REFERENCES annual_services(id),
        booth_type VARCHAR(50) DEFAULT 'ივენთის სტენდი',
        booth_category VARCHAR(50) DEFAULT 'ოქტანორმის სტენდები',
        booth_location VARCHAR(255),
        area DECIMAL(10,2),
        price_per_sqm DECIMAL(10,2),
        total_price DECIMAL(10,2),
        contact_person VARCHAR(255),
        contact_position VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        payment_due_date DATE,
        payment_method VARCHAR(50) DEFAULT 'ნაღდი',
        payment_amount DECIMAL(10,2),
        invoice_number VARCHAR(100),
        contract_file VARCHAR(500),
        invoice_file VARCHAR(500),
        handover_file VARCHAR(500),
        status VARCHAR(50) DEFAULT 'აქტიური',
        notes TEXT,
        created_by_user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment Bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create file_storage table
    await query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100),
        file_data BYTEA,
        file_size INTEGER,
        related_table VARCHAR(100),
        related_id INTEGER,
        uploaded_by INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      )
    `);

    // Create import_files table for tracking imported files
    await query(`
      CREATE TABLE IF NOT EXISTS import_files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        import_status VARCHAR(50) DEFAULT 'pending',
        imported_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        import_completed_at TIMESTAMP,
        import_errors TEXT
      )
    `);


    console.log("PostgreSQL ცხრილები წარმატებით შეიქმნა!");
  } catch (error) {
    console.error("PostgreSQL ცხრილების შექმნის შეცდომა:", error);
    throw error;
  }
};

// Function to add missing columns to existing tables
const addMissingColumns = async () => {
  try {
    console.log("შემოწმდება და დაემატება ყველა საჭირო სვეტი...");
    const tablesToCheck = ["event_participants", "annual_services"];
    for (const tableName of tablesToCheck) {
      const columns = await query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
      `,
        [tableName]
      );
      const existingColumns = columns.rows.map((row) => row.column_name);
      switch (tableName) {
        case "event_participants":
          const participantColumns = [
            "booth_category",
            "booth_type",
            "contact_person",
            "contact_email",
            "contact_phone",
            "payment_due_date",
            "payment_method",
            "invoice_number",
            "invoice_file",
            "contract_file",
            "handover_file",
          ];
          for (const col of participantColumns) {
            if (!existingColumns.includes(col)) {
              console.log(`Adding missing column '${col}' to '${tableName}'...`);
              await query(`
                ALTER TABLE ${tableName}
                ADD COLUMN ${col} VARCHAR(255)
              `);
            }
          }
          break;
        case "annual_services":
          const serviceColumns = [
            "plan_file_path",
            "invoice_files",
            "expense_files",
            "plan_updated_at",
            "files_updated_at",
          ];
          for (const col of serviceColumns) {
            if (!existingColumns.includes(col)) {
              let columnDefinition = "";
              switch (col) {
                case "invoice_files":
                case "expense_files":
                  columnDefinition = "JSONB DEFAULT '[]'";
                  break;
                case "plan_file_path":
                  columnDefinition = "VARCHAR(500)";
                  break;
                case "plan_updated_at":
                case "files_updated_at":
                  columnDefinition = "TIMESTAMP";
                  break;
                default:
                  break;
              }
              if (columnDefinition) {
                console.log(`Adding missing column '${col}' to '${tableName}'...`);
                await query(`
                  ALTER TABLE ${tableName}
                  ADD COLUMN ${col} ${columnDefinition}
                `);
              }
            }
          }
          break;
      }
    }
    console.log("ყველა საჭირო სვეტი წარმატებით შემოწმდა და დაემატა!");
  } catch (error) {
    console.error("სვეტების დამატების შეცდომა:", error);
  }
};

// Function to add image_url column to equipment table if it doesn't exist
const addImageUrlColumn = async () => {
  try {
    const checkColumn = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'equipment'
      AND column_name = 'image_url'
    `);

    if (checkColumn.rows.length === 0) {
      await query("ALTER TABLE equipment ADD COLUMN image_url VARCHAR(500)");
      console.log("image_url სვეტი დაემატა equipment ცხრილში");
    } else {
      console.log("image_url სვეტი უკვე არსებობს equipment ცხრილში");
    }
  } catch (error) {
    console.error("image_url სვეტის დამატების შეცდომა:", error);
  }
};

const initializeDatabase = async () => {
  try {
    await createTables();
    await addMissingColumns();
    await addImageUrlColumn();
    console.log("ბაზის ინიციალიზაცია დასრულებულია.");
  } catch (error) {
    console.error("ბაზის ინიციალიზაციის შეცდომა:", error);
  }
};

module.exports = {
  query,
  pool,
  initializeDatabase,
};