
const db = require('./db');

async function checkDatabase() {
    try {
        console.log('=== Database Connection Check ===');
        
        // Test basic connection
        const connectionTest = await db.query('SELECT NOW() as current_time');
        console.log('✓ Database connection successful');
        console.log('Current time from DB:', connectionTest.rows[0].current_time);
        
        // Check if companies table exists
        const tableCheck = await db.query(`
            SELECT table_name, column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'companies'
            ORDER BY ordinal_position
        `);
        
        if (tableCheck.rows.length === 0) {
            console.log('❌ Companies table does not exist!');
            return;
        }
        
        console.log('✓ Companies table exists with columns:');
        tableCheck.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        });
        
        // Check users table
        const usersCheck = await db.query(`
            SELECT table_name, column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        
        if (usersCheck.rows.length > 0) {
            console.log('✓ Users table exists with columns:');
            usersCheck.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
            });
            
            // Check for admin users
            const adminUsers = await db.query('SELECT id, username, role FROM users WHERE role = $1', ['admin']);
            console.log(`✓ Found ${adminUsers.rows.length} admin user(s):`);
            adminUsers.rows.forEach(user => {
                console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
            });
        } else {
            console.log('❌ Users table does not exist!');
        }
        
        // Count existing companies
        const companyCount = await db.query('SELECT COUNT(*) as count FROM companies');
        console.log(`✓ Current companies count: ${companyCount.rows[0].count}`);
        
        // Show recent companies
        const recentCompanies = await db.query('SELECT id, company_name, created_at FROM companies ORDER BY created_at DESC LIMIT 5');
        if (recentCompanies.rows.length > 0) {
            console.log('Recent companies:');
            recentCompanies.rows.forEach(company => {
                console.log(`  - ID: ${company.id}, Name: ${company.company_name}, Created: ${company.created_at}`);
            });
        } else {
            console.log('No companies found in database');
        }
        
    } catch (error) {
        console.error('=== Database Check Error ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkDatabase().then(() => {
    console.log('=== Database check completed ===');
    process.exit(0);
}).catch(error => {
    console.error('Database check failed:', error);
    process.exit(1);
});
