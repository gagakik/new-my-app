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
        company_phone VARCHAR(255),
        company_email VARCHAR(255),
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
    // Event Participants table - with proper error handling
    await query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        company_id INTEGER,
        annual_service_id INTEGER,
        event_id INTEGER,
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

    // Add foreign key constraints separately to avoid circular dependencies
    try {
      await query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'event_participants_company_id_fkey'
          ) THEN
            ALTER TABLE event_participants 
            ADD CONSTRAINT event_participants_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id);
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('Foreign key constraint for company_id already exists or companies table not ready:', e.message);
    }

    try {
      await query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'event_participants_annual_service_id_fkey'
          ) THEN
            ALTER TABLE event_participants 
            ADD CONSTRAINT event_participants_annual_service_id_fkey 
            FOREIGN KEY (annual_service_id) REFERENCES annual_services(id);
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('Foreign key constraint for annual_service_id already exists or annual_services table not ready:', e.message);
    }

    try {
      await query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'event_participants_event_id_fkey'
          ) THEN
            ALTER TABLE event_participants 
            ADD CONSTRAINT event_participants_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES annual_services(id);
          END IF;
        END $$;
      `);
    } catch (e) {
      console.log('Foreign key constraint for event_id already exists or annual_services table not ready:', e.message);
    }

    // Equipment Bookings table
    await query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id SERIAL PRIMARY KEY,
        participant_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        created_by INTEGER,
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
    const tablesToCheck = ["event_participants", "annual_services", "equipment_bookings"];
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
            { name: "payment_status", type: "VARCHAR(50) DEFAULT 'მომლოდინე'" },
            { name: "registration_status", type: "VARCHAR(50) DEFAULT 'მონაწილეობის მოთხოვნა'" },
            { name: "registration_date", type: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
            { name: "invoice_number", type: "VARCHAR(100)" },
            { name: "invoice_file", type: "VARCHAR(500)" },
            { name: "contract_file", type: "VARCHAR(500)" },
            { name: "handover_file", type: "VARCHAR(500)" },
            { name: "invoice_file_path", type: "VARCHAR(500)" },
            { name: "contract_file_path", type: "VARCHAR(500)" },
            { name: "handover_file_path", type: "VARCHAR(500)" },
            { name: "status", type: "VARCHAR(50) DEFAULT 'აქტიური'" },
            { name: "notes", type: "TEXT" },
            { name: "price_registr_fee", type: "DECIMAL(10,2)" },
            { name: "price_Participation_fee", type: "DECIMAL(10,2)" },
            { name: "price_participation_fee", type: "DECIMAL(10,2)" },
            { name: "Frieze_inscription_geo", type: "TEXT" },
            { name: "Frieze_inscription_eng", type: "TEXT" },
            { name: "frieze_inscription_geo", type: "TEXT" },
            { name: "frieze_inscription_eng", type: "TEXT" }
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
            "plan_uploaded_by",
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
                case "plan_uploaded_by":
                  columnDefinition = "VARCHAR(255)";
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
        case "equipment_bookings":
          const bookingColumns = [
            { name: "unit_price", type: "DECIMAL(10,2)" },
            { name: "total_price", type: "DECIMAL(10,2)" },
            { name: "created_by", type: "INTEGER" }
          ];
          for (const col of bookingColumns) {
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
          break;
      }
    }
    console.log("ყველა საჭირო სვეტი წარმატებით შემოწმდა და დაემატა!");
  } catch (error) {
    console.error("სვეტების დამატების შეცდომა:", error);
  }
};

// Function to add missing columns to equipment table if they don't exist
const addMissingEquipmentColumns = async () => {
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

// Function to add missing columns to companies table if they don't exist
const addMissingCompanyColumns = async () => {
  try {
    const requiredColumns = [
      { name: 'company_phone', type: 'VARCHAR(255)' },
      { name: 'company_email', type: 'VARCHAR(255)' }
    ];

    for (const column of requiredColumns) {
      const checkColumn = await query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'companies'
        AND column_name = $1
      `, [column.name]);

      if (checkColumn.rows.length === 0) {
        await query(`ALTER TABLE companies ADD COLUMN ${column.name} ${column.type}`);
        console.log(`${column.name} სვეტი დამატებულია companies ცხრილში`);
      }
    }
    console.log("Companies table ყველა საჭირო სვეტით მზადაა!");
  } catch (error) {
    console.error("Companies table-ის სვეტების დამატების შეცდომა:", error);
  }
};

// Function to initialize stands-related tables
const initializeStandsTables = async () => {
  try {
    console.log("🏗️ სტენდების ცხრილების ინიციალიზაცია...");

    // Main stands table
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

    // Stand designs table
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

    console.log("✅ სტენდების ცხრილები შეიქმნა");

    // Check if we need to migrate data from event_participants to stands
    const participantsCount = await query('SELECT COUNT(*) as count FROM event_participants');
    const standsCount = await query('SELECT COUNT(*) as count FROM stands');

    if (participantsCount.rows[0].count > 0 && standsCount.rows[0].count === 0) {
      console.log('🔄 მონაწილეების მიგრაცია stands ცხრილში...');

      // Check if companies table exists for JOIN
      const companiesTableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'companies'
        )
      `);

      let migrationQuery;
      if (companiesTableCheck.rows[0].exists) {
        migrationQuery = `
          INSERT INTO stands (event_id, booth_number, company_name, area, contact_person, contact_phone, contact_email, status, notes, created_at, created_by_user_id)
          SELECT 
            ep.event_id,
            COALESCE(ep.booth_number, 'B-' || ep.id) as booth_number,
            COALESCE(c.company_name, 'Unknown Company ' || ep.id) as company_name,
            COALESCE(ep.area, ep.booth_size, 0) as area,
            ep.contact_person,
            ep.contact_phone,
            ep.contact_email,
            CASE 
              WHEN ep.status = 'გადახდილი' THEN 'დასრულებული'
              WHEN ep.status = 'მომლოდინე' THEN 'დაგეგმილი'
              WHEN ep.status = 'დადასტურებული' THEN 'დიზაინის ეტაპი'
              WHEN ep.status = 'შეუქმებული' THEN 'მშენებლობა დაწყებული'
              ELSE 'დაგეგმილი'
            END as status,
            ep.notes,
            ep.created_at,
            ep.created_by_user_id
          FROM event_participants ep
          LEFT JOIN companies c ON ep.company_id = c.id
          WHERE ep.event_id IS NOT NULL
        `;
      } else {
        migrationQuery = `
          INSERT INTO stands (event_id, booth_number, company_name, area, contact_person, contact_phone, contact_email, status, notes, created_at, created_by_user_id)
          SELECT 
            ep.event_id,
            COALESCE(ep.booth_number, 'B-' || ep.id) as booth_number,
            'Company ' || ep.id as company_name,
            COALESCE(ep.area, ep.booth_size, 0) as area,
            ep.contact_person,
            ep.contact_phone,
            ep.contact_email,
            CASE 
              WHEN ep.status = 'გადახდილი' THEN 'დასრულებული'
              WHEN ep.status = 'მომლოდინე' THEN 'დაგეგმილი'
              WHEN ep.status = 'დადასტურებული' THEN 'დიზაინის ეტაპი'
              WHEN ep.status = 'შეუქმებული' THEN 'მშენებლობა დაწყებული'
              ELSE 'დაგეგმილი'
            END as status,
            ep.notes,
            ep.created_at,
            ep.created_by_user_id
          FROM event_participants ep
          WHERE ep.event_id IS NOT NULL
        `;
      }

      await query(migrationQuery);

      const migratedCount = await query('SELECT COUNT(*) as count FROM stands');
      console.log(`✅ მიგრირებულია ${migratedCount.rows[0].count} სტენდი`);
    }

  } catch (error) {
    console.error("❌ სტენდების ცხრილების ინიციალიზაციის შეცდომა:", error);
  }
};


// Comprehensive table existence check
const ensureAllTablesExist = async () => {
  try {
    console.log("🔍 შევამოწმებთ ყველა ცხრილის არსებობას...");

    const requiredTables = [
      'users',
      'companies',
      'exhibitions',
      'spaces',
      'annual_services',
      'service_spaces',
      'event_participants',
      'equipment',
      'equipment_bookings',
      'service_spaces',
      'stands',
      'stand_equipment',
      'stand_designs',
      'stand_photos'
    ];

    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.rows.map(row => row.table_name);
    console.log("📋 არსებული ცხრილები:", existingTables.join(', '));

    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log("❌ არ არსებული ცხრილები:", missingTables.join(', '));
      console.log("🔧 ვცდილობთ ცხრილების შექმნას...");
      await createTables();
    } else {
      console.log("✅ ყველა საჭირო ცხრილი არსებობს");
    }

    // Check event_participants table structure
    const epColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'event_participants'
      ORDER BY ordinal_position
    `);

    console.log(`📊 event_participants ცხრილის სტრუქტურა (${epColumns.rows.length} სვეტი):`, 
      epColumns.rows.map(col => `${col.column_name} (${col.data_type})`).join(', ')
    );

  } catch (error) {
    console.error("❌ ცხრილების შემოწმების შეცდომა:", error);
    throw error;
  }
};

const initializeDatabase = async () => {
  try {
    await ensureAllTablesExist();
    await addMissingColumns();
    await addMissingEquipmentColumns();
    await addMissingCompanyColumns();

    // Initialize stands tables
    await initializeStandsTables();

    console.log("✅ ბაზის ინიციალიზაცია წარმატებით დასრულდა");
  } catch (error) {
    console.error("❌ ბაზის ინიციალიზაციის შეცდომა:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
};

module.exports = {
  query,
  pool,
  initializeDatabase,
};