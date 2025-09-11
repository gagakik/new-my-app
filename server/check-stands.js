
const db = require('./db');

async function checkStands() {
    try {
        console.log('=== სტენდების ცხრილის შემოწმება ===');
        
        // სტენდების ცხრილის არსებობის შემოწმება
        const tableCheck = await db.query(`
            SELECT table_name
            FROM information_schema.tables 
            WHERE table_name = 'stands'
        `);
        
        if (tableCheck.rows.length === 0) {
            console.log('❌ სტენდების ცხრილი არ არსებობს!');
            console.log('🔧 ცხრილის შექმნა...');
            
            // სტენდების ცხრილის შექმნა
            await db.query(`
                CREATE TABLE stands (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER NOT NULL,
                    booth_number VARCHAR(50) NOT NULL,
                    company_name VARCHAR(255) NOT NULL,
                    stand_status VARCHAR(50) DEFAULT 'დაგეგმილი',
                    design_notes TEXT,
                    construction_notes TEXT,
                    special_requirements TEXT,
                    start_date DATE,
                    deadline DATE,
                    completion_percentage INTEGER DEFAULT 0,
                    design_files JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by_user_id INTEGER,
                    UNIQUE(booth_number, event_id),
                    FOREIGN KEY (event_id) REFERENCES annual_services(id),
                    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                )
            `);
            
            console.log('✅ სტენდების ცხრილი შეიქმნა!');
        } else {
            console.log('✅ სტენდების ცხრილი არსებობს');
        }
        
        // ცხრილის სტრუქტურის შემოწმება
        const columns = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'stands'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 ცხრილის სტრუქტურა:');
        columns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        });
        
        // არსებული სტენდების რაოდენობა
        const standCount = await db.query('SELECT COUNT(*) as count FROM stands');
        console.log(`📊 სტენდების რაოდენობა: ${standCount.rows[0].count}`);
        
        // ბოლო 5 სტენდი
        const recentStands = await db.query(`
            SELECT s.id, s.booth_number, s.company_name, s.status, s.area, e.service_name as event_name
            FROM stands s
            LEFT JOIN annual_services e ON s.event_id = e.id
            ORDER BY s.created_at DESC 
            LIMIT 5
        `);
        
        if (recentStands.rows.length > 0) {
            console.log('🏗️ ბოლო სტენდები:');
            recentStands.rows.forEach(stand => {
                console.log(`  - ID: ${stand.id}, სტენდი: ${stand.booth_number}, კომპანია: ${stand.company_name}, ფართობი: ${stand.area}მ², სტატუსი: ${stand.status || 'N/A'}, ივენთი: ${stand.event_name || 'N/A'}`);
            });
        } else {
            console.log('📝 სტენდები არ მოიძებნა ბაზაში');
        }
        
    } catch (error) {
        console.error('❌ შეცდომა სტენდების ცხრილის შემოწმებისას:', error.message);
        throw error;
    }
}

checkStands().then(() => {
    console.log('=== სტენდების შემოწმება დასრულდა ===');
    process.exit(0);
}).catch(error => {
    console.error('შეცდომა:', error);
    process.exit(1);
});
