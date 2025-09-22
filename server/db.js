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
        event_id INTEGER REFERENCES annual_services(id),
        booth_type VARCHAR(50) DEFAULT 'ივენთის სტენდი',
        booth_category VARCHAR(50) DEFAULT 'ოქტანორმის სტენდები',
        booth_location VARCHAR(255),
        booth_number VARCHAR(100),
        booth_size DECIMAL(10,2),
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
        payment_status VARCHAR(50) DEFAULT 'მომლოდინე',
        registration_status VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა',
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invoice_number VARCHAR(100),
        contract_file VARCHAR(500),
        invoice_file VARCHAR(500),
        handover_file VARCHAR(500),
        invoice_file_path VARCHAR(500),
        contract_file_path VARCHAR(500),
        handover_file_path VARCHAR(500),
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

    // Exhibition Packages table
    await query(`
      CREATE TABLE IF NOT EXISTS exhibition_packages (
        id SERIAL PRIMARY KEY,
        exhibition_id INTEGER REFERENCES exhibitions(id),
        package_name VARCHAR(255) NOT NULL,
        description TEXT,
        fixed_area_sqm DECIMAL(10,2) NOT NULL,
        fixed_price DECIMAL(10,2) NOT NULL,
        early_bird_price DECIMAL(10,2),
        early_bird_end_date DATE,
        last_minute_price DECIMAL(10,2),
        last_minute_start_date DATE,
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Package Equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS package_equipment (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES exhibition_packages(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id),
        quantity INTEGER NOT NULL DEFAULT 1,
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
        created_by_user_id INTEGER REFERENCES users(id),
        updated_by_user_id INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bundle Packages table
    await query(`
      CREATE TABLE IF NOT EXISTS bundle_packages (
        id SERIAL PRIMARY KEY,
        bundle_id INTEGER REFERENCES package_bundles(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES exhibition_packages(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Participant Selected Equipment table
    await query(`
      CREATE TABLE IF NOT EXISTS participant_selected_equipment (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stands table
    await query(`
      CREATE TABLE IF NOT EXISTS stands (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES annual_services(id) ON DELETE CASCADE,
        booth_number VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        area DECIMAL(8,2),
        contact_person VARCHAR(255),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        status VARCHAR(100) DEFAULT 'დაგეგმილი',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_user_id INTEGER REFERENCES users(id),
        UNIQUE(event_id, booth_number)
      )
    `);

    // Stand equipment junction table
    await query(`
      CREATE TABLE IF NOT EXISTS stand_equipment (
        id SERIAL PRIMARY KEY,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        assigned_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stand_id, equipment_id)
      )
    `);

    // Update stand_designs to reference stands table
    await query(`
      CREATE TABLE IF NOT EXISTS stand_designs (
        id SERIAL PRIMARY KEY,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        design_file_url VARCHAR(500) NOT NULL,
        description TEXT,
        uploaded_by_user_id INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stand photos table
    await query(`
      CREATE TABLE IF NOT EXISTS stand_photos (
        id SERIAL PRIMARY KEY,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        photo_url VARCHAR(500) NOT NULL,
        description TEXT,
        uploaded_by_user_id INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            { name: "event_id", type: "INTEGER REFERENCES annual_services(id)" },
            { name: "booth_category", type: "VARCHAR(50) DEFAULT 'ოქტანორმის სტენდები'" },
            { name: "booth_type", type: "VARCHAR(50) DEFAULT 'რიგითი'" },
            { name: "booth_number", type: "VARCHAR(100)" },
            { name: "booth_size", type: "DECIMAL(10,2)" },
            { name: "area", type: "DECIMAL(10,2)" },
            { name: "price_per_sqm", type: "DECIMAL(10,2)" },
            { name: "total_price", type: "DECIMAL(10,2)" },
            { name: "contact_person", type: "VARCHAR(255)" },
            { name: "contact_position", type: "VARCHAR(255)" },
            { name: "contact_email", type: "VARCHAR(255)" },
            { name: "contact_phone", type: "VARCHAR(255)" },
            { name: "payment_due_date", type: "DATE" },
            { name: "payment_method", type: "VARCHAR(50) DEFAULT 'ნაღდი'" },
            { name: "payment_amount", type: "DECIMAL(10,2)" },
            { name: "invoice_number", type: "VARCHAR(100)" },
            { name: "invoice_file", type: "VARCHAR(500)" },
            { name: "contract_file", type: "VARCHAR(500)" },
            { name: "handover_file", type: "VARCHAR(500)" },
            { name: "status", type: "VARCHAR(50) DEFAULT 'აქტიური'" },
            { name: "notes", type: "TEXT" }
          ];
          for (const col of participantColumns) {
            if (!existingColumns.includes(col.name)) {
              console.log(`Adding missing column '${col.name}' to '${tableName}'...`);
              try {
                await query(`
                  ALTER TABLE ${tableName}
                  ADD COLUMN ${col.name} ${col.type}
                `);
              } catch (addColumnError) {
                console.log(`Column '${col.name}' might already exist or constraint issue:`, addColumnError.message);
              }
            }
          }

          // Update event_id from annual_service_id if needed
          try {
            await query(`
              UPDATE event_participants 
              SET event_id = annual_service_id 
              WHERE event_id IS NULL AND annual_service_id IS NOT NULL
            `);
          } catch (updateError) {
            console.log('Could not update event_id from annual_service_id:', updateError.message);
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

// Function to add missing columns to equipment table if they don't exist
const addEquipmentColumns = async () => {
  try {
    const requiredColumns = [
      { name: 'image_url', type: 'VARCHAR(500)' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_by_id', type: 'INTEGER' }
    ];

    for (const column of requiredColumns) {
      const checkColumn = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'equipment'
        AND column_name = $1
      `, [column.name]);

      if (checkColumn.rows.length === 0) {
        await query(`ALTER TABLE equipment ADD COLUMN ${column.name} ${column.type}`);
        console.log(`${column.name} სვეტი დამატებულია equipment ცხრილში`);
      }
    }
    console.log("Equipment table ყველა საჭირო სვეტით მზადაა!");
  } catch (error) {
    console.error("Equipment table-ის სვეტების დამატების შეცდომა:", error);
  }
};

// Function to create stand_designs table if it doesn't exist
const createStandDesignsTable = async () => {
  try {
    console.log("🔧 შევამოწმებთ stand_designs ცხრილს...");

    // Check if table exists
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stand_designs'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('📋 stand_designs ცხრილი არ არსებობს, ვქმნით...');

      await query(`
        CREATE TABLE stand_designs (
          id SERIAL PRIMARY KEY,
          stand_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
          design_file_url VARCHAR(500) NOT NULL,
          description TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ stand_designs ცხრილი შეიქმნა!');
    } else {
      console.log('✓ stand_designs ცხრილი უკვე არსებობს');
    }

  } catch (error) {
    console.error('❌ შეცდომა stand_designs ცხრილის შექმნისას:', error);
  }
};

const initializeDatabase = async () => {
  try {
    await createTables();
    await addMissingColumns();
    await addEquipmentColumns();
    await createStandDesignsTable();
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