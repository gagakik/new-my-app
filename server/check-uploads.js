
const fs = require('fs');
const path = require('path');

function checkUploadsDirectory() {
    console.log('=== UPLOADS DIRECTORY CHECK ===');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    const importDir = path.join(uploadsDir, 'import');
    
    console.log('Working directory:', process.cwd());
    console.log('Script directory:', __dirname);
    console.log('Uploads directory path:', uploadsDir);
    console.log('Import directory path:', importDir);
    
    // Check uploads directory
    try {
        if (fs.existsSync(uploadsDir)) {
            const stats = fs.statSync(uploadsDir);
            console.log('✅ uploads directory exists');
            console.log('  Permissions:', stats.mode.toString(8));
            console.log('  Is directory:', stats.isDirectory());
            
            // List contents
            const contents = fs.readdirSync(uploadsDir);
            console.log('  Contents:', contents);
        } else {
            console.log('❌ uploads directory does not exist');
            console.log('Creating uploads directory...');
            fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });
            console.log('✅ uploads directory created');
        }
    } catch (error) {
        console.error('❌ Error checking uploads directory:', error);
    }
    
    // Check import directory
    try {
        if (fs.existsSync(importDir)) {
            const stats = fs.statSync(importDir);
            console.log('✅ import directory exists');
            console.log('  Permissions:', stats.mode.toString(8));
            console.log('  Is directory:', stats.isDirectory());
            
            // List contents
            const contents = fs.readdirSync(importDir);
            console.log('  Contents:', contents);
            console.log('  File count:', contents.length);
        } else {
            console.log('❌ import directory does not exist');
            console.log('Creating import directory...');
            fs.mkdirSync(importDir, { recursive: true, mode: 0o777 });
            console.log('✅ import directory created');
        }
    } catch (error) {
        console.error('❌ Error checking import directory:', error);
    }
    
    // Test write permissions
    try {
        const testFile = path.join(importDir, `test-${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'test write permissions');
        console.log('✅ Write test successful');
        fs.unlinkSync(testFile);
        console.log('✅ File cleanup successful');
    } catch (error) {
        console.error('❌ Write test failed:', error);
    }
}

checkUploadsDirectory();
