const db = require('./db');

// Create stands tables
async function createStandsTables() {
  try {
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
      );
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
      );
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
      );
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
      );
    `);

    console.log('✅ stand_photos ცხრილი შექმნილია');

  } catch (error) {
    console.error('❌ stands ცხრილების შექმნის შეცდომა:', error);
    throw error;
  }
}

setupStandsTables().then(() => {
    console.log('=== სტენდების ცხრილების მომზადება დასრულდა ===');
    process.exit(0);
}).catch(error => {
    console.error('შეცდომა:', error);
    process.exit(1);
});