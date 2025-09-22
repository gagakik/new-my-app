
const db = require('./db');

// Create stands tables
async function setupStandsTables() {
  try {
    console.log('🔧 სტენდების ცხრილების შექმნა...');

    // Main stands table
    await db.query(`
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

    console.log('✅ stands ცხრილი შექმნილია');

    // Stand equipment junction table
    await db.query(`
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

    console.log('✅ stand_equipment ცხრილი შექმნილია');

    // Stand designs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS stand_designs (
        id SERIAL PRIMARY KEY,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        design_file_url VARCHAR(500) NOT NULL,
        description TEXT,
        uploaded_by_user_id INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ stand_designs ცხრილი შექმნილია');

    // Stand photos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS stand_photos (
        id SERIAL PRIMARY KEY,
        stand_id INTEGER REFERENCES stands(id) ON DELETE CASCADE,
        photo_url VARCHAR(500) NOT NULL,
        description TEXT,
        uploaded_by_user_id INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ stand_photos ცხრილი შექმნილია');

    // Check if we have event_participants
    const checkParticipants = await db.query('SELECT COUNT(*) as count FROM event_participants');
    console.log(`📊 event_participants ცხრილში არის ${checkParticipants.rows[0].count} ჩანაწერი`);

    // If we have participants but no stands, migrate them
    const standsCount = await db.query('SELECT COUNT(*) as count FROM stands');
    console.log(`📊 stands ცხრილში არის ${standsCount.rows[0].count} ჩანაწერი`);

    if (checkParticipants.rows[0].count > 0 && standsCount.rows[0].count === 0) {
      console.log('🔄 მონაწილეების მიგრაცია stands ცხრილში...');
      
      await db.query(`
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
      `);

      const migratedCount = await db.query('SELECT COUNT(*) as count FROM stands');
      console.log(`✅ მიგრირებულია ${migratedCount.rows[0].count} სტენდი`);
    }

  } catch (error) {
    console.error('❌ stands ცხრილების შექმნის შეცდომა:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

setupStandsTables();
