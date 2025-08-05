
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function exportData() {
    try {
        console.log('მონაცემების ექსპორტის დაწყება...');
        
        // ყველა ცხრილის მონაცემების ექსპორტი
        const tables = ['users', 'exhibitions', 'events', 'equipment', 'companies', 'event_participants'];
        const exportData = {};
        
        for (const table of tables) {
            try {
                const result = await db.query(`SELECT * FROM ${table}`);
                exportData[table] = result.rows;
                console.log(`${table}: ${result.rows.length} ჩანაწერი`);
            } catch (error) {
                console.error(`შეცდომა ${table} ცხრილიდან:`, error.message);
                exportData[table] = [];
            }
        }
        
        // JSON ფაილად შენახვა
        const exportPath = path.join(__dirname, 'data-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
        
        console.log('მონაცემები წარმატებით ექსპორტირდა:', exportPath);
        
        // ფაილების სიის შექმნა
        const uploadsPath = path.join(__dirname, 'uploads');
        const filesList = [];
        
        function getAllFiles(dir, fileList = []) {
            if (fs.existsSync(dir)) {
                const items = fs.readdirSync(dir);
                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    if (fs.statSync(fullPath).isDirectory()) {
                        getAllFiles(fullPath, fileList);
                    } else {
                        fileList.push(fullPath.replace(__dirname, ''));
                    }
                });
            }
            return fileList;
        }
        
        const allFiles = getAllFiles(uploadsPath);
        const filesListPath = path.join(__dirname, 'files-list.json');
        fs.writeFileSync(filesListPath, JSON.stringify({ files: allFiles }, null, 2), 'utf8');
        
        console.log('ფაილების სია შეიქმნა:', filesListPath);
        console.log(`სულ ფაილები: ${allFiles.length}`);
        
        return { success: true, dataFile: exportPath, filesFile: filesListPath };
    } catch (error) {
        console.error('ექსპორტის შეცდომა:', error);
        return { success: false, error: error.message };
    }
}

// თუ სკრიპტი პირდაპირ გაეშვა
if (require.main === module) {
    exportData().then(result => {
        console.log('ექსპორტი დასრულდა:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { exportData };
