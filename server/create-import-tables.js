
const db = require('./db');

async function createImportTables() {
    try {
        console.log('Creating import-related tables...');

        // Create file_storage table
        await db.query(`
            CREATE TABLE IF NOT EXISTS file_storage (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(100),
                file_data BYTEA NOT NULL,
                file_size INTEGER NOT NULL,
                related_table VARCHAR(50),
                related_id INTEGER,
                uploaded_by INTEGER REFERENCES users(id),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )
        `);

        // Create import_files table
        await db.query(`
            CREATE TABLE IF NOT EXISTS import_files (
                id SERIAL PRIMARY KEY,
                original_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500),
                file_size INTEGER,
                uploaded_by INTEGER REFERENCES users(id),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                import_status VARCHAR(20) DEFAULT 'pending',
                import_completed_at TIMESTAMP,
                total_count INTEGER DEFAULT 0,
                imported_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                error_details JSONB,
                storage_id INTEGER REFERENCES file_storage(id)
            )
        `);

        console.log('✅ Import tables created successfully');
    } catch (error) {
        console.error('❌ Error creating import tables:', error);
        throw error;
    }
}

if (require.main === module) {
    createImportTables()
        .then(() => {
            console.log('Database setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { createImportTables };
