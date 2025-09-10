
const { importCompaniesFromExcel } = require('./import-companies');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function testImport() {
    try {
        // Create a test Excel file
        const testData = [
            {
                'კომპანიის დასახელება': 'Test Import Company 1',
                'ქვეყანა': 'Georgia',
                'პროფილი': 'IT Services',
                'საიდენტიფიკაციო კოდი': 'TIC001',
                'იურიდიული მისამართი': 'Tbilisi, Georgia',
                'ვებსაიტი': 'https://test1.com',
                'სტატუსი': 'აქტიური',
                'კომენტარი': 'Test company 1',
                'საკონტაქტო პირი': 'John Doe',
                'პოზიცია': 'Manager',
                'ტელეფონი': '+995555123456',
                'ელ-ფოსტა': 'john@test1.com'
            },
            {
                'კომპანიის დასახელება': 'Test Import Company 2',
                'ქვეყანა': 'Germany',
                'პროფილი': 'Manufacturing',
                'საიდენტიფიკაციო კოდი': 'TIC002',
                'იურიდიული მისამართი': 'Berlin, Germany',
                'ვებსაიტი': 'https://test2.com',
                'სტატუსი': 'აქტიური',
                'კომენტარი': 'Test company 2',
                'საკონტაქტო პირი': 'Jane Smith',
                'პოზიცია': 'Director',
                'ტელეფონი': '+49555123456',
                'ელ-ფოსტა': 'jane@test2.com'
            }
        ];

        // Create Excel file
        const worksheet = XLSX.utils.json_to_sheet(testData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "კომპანიები");

        const testFilePath = path.join(__dirname, 'test-companies.xlsx');
        XLSX.writeFile(workbook, testFilePath);

        console.log('Test Excel file created at:', testFilePath);

        // Test the import function
        console.log('Starting import test...');
        const result = await importCompaniesFromExcel(testFilePath, 1);

        console.log('Import result:', result);

        // Clean up the test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('Test file cleaned up');
        }

        // Check final company count
        const db = require('./db');
        const countResult = await db.query('SELECT COUNT(*) as count FROM companies');
        console.log('Final companies count:', countResult.rows[0].count);

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testImport();
