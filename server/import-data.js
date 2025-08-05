
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importData() {
    try {
        console.log('მონაცემების იმპორტის დაწყება...');
        
        const exportPath = path.join(__dirname, 'data-export.json');
        
        if (!fs.existsSync(exportPath)) {
            throw new Error('data-export.json ფაილი ვერ მოიძებნა');
        }
        
        const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        
        // ცხრილების იმპორტის თანმიმდევრობა (foreign key-ების გამო)
        const importOrder = ['users', 'exhibitions', 'events', 'equipment', 'companies', 'event_participants'];
        
        for (const tableName of importOrder) {
            if (exportData[tableName] && exportData[tableName].length > 0) {
                console.log(`იმპორტირდება ${tableName}...`);
                
                for (const row of exportData[tableName]) {
                    try {
                        const columns = Object.keys(row);
                        const values = Object.values(row);
                        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                        
                        await db.query(
                            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                            values
                        );
                    } catch (error) {
                        console.error(`შეცდომა ${tableName} ჩანაწერის იმპორტისას:`, error.message);
                    }
                }
                
                console.log(`${tableName}: ${exportData[tableName].length} ჩანაწერი იმპორტირდა`);
            }
        }
        
        console.log('მონაცემების იმპორტი დასრულდა');
        return { success: true };
    } catch (error) {
        console.error('იმპორტის შეცდომა:', error);
        return { success: false, error: error.message };
    }
}

// თუ სკრიპტი პირდაპირ გაეშვა
if (require.main === module) {
    importData().then(result => {
        console.log('იმპორტი დასრულდა:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { importData };
