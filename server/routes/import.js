const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'ავტორიზაციის ტოკენი არ არის მოწოდებული.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'არასწორი ან ვადაგასული ავტორიზაციის ტოკენი.' });
        }
        req.user = user;
        next();
    });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/imports');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const baseName = path.basename(originalName, extension);
        cb(null, `${baseName}_${timestamp}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/excel'
        ];

        if (allowedMimes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('მხოლოდ Excel ფაილები (.xlsx, .xls) დაშვებულია'), false);
        }
    }
});

// POST: Import companies from Excel
router.post('/companies', authenticateToken, upload.single('excelFile'), async (req, res) => {
    console.log('🚀🚀🚀 IMPORT ROUTE CALLED 🚀🚀🚀');
    console.log('📋 Import Route: Request received');
    console.log('📋 Import Route: User:', req.user?.username || req.user?.id);
    console.log('📋 Import Route: File info:', {
        filename: req.file?.filename,
        originalname: req.file?.originalname,
        size: req.file?.size,
        mimetype: req.file?.mimetype,
        path: req.file?.path
    });

    if (!req.file) {
        console.error('❌ Import Route: No file uploaded');
        return res.status(400).json({ 
            success: false,
            message: 'ფაილი არ არის ატვირთული' 
        });
    }

    const filePath = req.file.path;
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    let processedCompanies = [];

    try {
        console.log('📖 Import Route: Reading Excel file from:', filePath);

        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log('📊 Import Route: Data rows found:', data.length);
        console.log('📊 Import Route: First row sample:', data[0]);

        if (data.length === 0) {
            throw new Error('Excel ფაილი ცარიელია ან არასწორ ფორმატშია');
        }

        // Process each row
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            console.log(`📝 Import Route: Processing row ${i + 1}:`, row);
            
            // Debug first few rows more thoroughly
            if (i < 3) {
                console.log(`🔍 Row ${i + 1} detailed analysis:`);
                console.log(`   - Keys:`, Object.keys(row));
                console.log(`   - Values:`, Object.values(row));
                console.log(`   - Company Name variations:`, {
                    'Company Name': row['Company Name'],
                    'კომპანიის სახელი': row['კომპანიის სახელი'],
                    'company_name': row['company_name'],
                    'კომპანიის დასახელება': row['კომპანიის დასახელება']
                });
            }

            try {
                // Map Excel columns to database fields - check all possible column names
                const companyData = {
                    company_name: row['Company Name'] || row['კომპანიის სახელი'] || row['company_name'] || row['კომპანიის დასახელება'] || '',
                    country: row['Country'] || row['ქვეყანა'] || row['country'] || '',
                    company_profile: row['Company Profile'] || row['კომპანიის პროფილი'] || row['company_profile'] || row['პროფილი'] || '',
                    identification_code: row['Identification Code'] || row['საიდენტიფიკაციო კოდი'] || row['identification_code'] || '',
                    legal_address: row['Legal Address'] || row['იურიდიული მისამართი'] || row['legal_address'] || '',
                    website: row['Website'] || row['ვებსაიტი'] || row['website'] || '',
                    status: row['Status'] || row['სტატუსი'] || row['status'] || 'აქტიური',
                    comment: row['Comment'] || row['კომენტარი'] || row['comment'] || '',
                    contact_persons: [],
                    selected_exhibitions: []
                };

                // Debug: log actual column names and first row data
                if (i === 0) {
                    console.log('📊 Available columns in Excel:', Object.keys(row));
                    console.log('📊 First row data:', row);
                    console.log('📊 Mapped company_name:', companyData.company_name);
                }

                // Validate required fields
                if (!companyData.company_name) {
                    throw new Error(`მწკრივი ${i + 1}: კომპანიის სახელი აუცილებელია`);
                }

                console.log(`💾 Import Route: Inserting company:`, companyData.company_name);

                // Insert into database
                const result = await db.query(`
                    INSERT INTO companies (
                        company_name, country, company_profile, identification_code,
                        legal_address, website, status, comment, contact_persons,
                        selected_exhibitions, created_by_user_id, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
                    RETURNING id, company_name
                `, [
                    companyData.company_name,
                    companyData.country,
                    companyData.company_profile,
                    companyData.identification_code,
                    companyData.legal_address,
                    companyData.website,
                    companyData.status,
                    companyData.comment,
                    JSON.stringify(companyData.contact_persons),
                    JSON.stringify(companyData.selected_exhibitions),
                    req.user.id
                ]);

                processedCompanies.push({
                    id: result.rows[0].id,
                    name: result.rows[0].company_name,
                    row: i + 1
                });

                successCount++;
                console.log(`✅ Import Route: Successfully imported company: ${companyData.company_name}`);

            } catch (rowError) {
                errorCount++;
                const errorMessage = `მწკრივი ${i + 1}: ${rowError.message}`;
                errors.push(errorMessage);
                console.error(`❌ Import Route: Row error:`, errorMessage);
                continue;
            }
        }

        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Import Route: Temporary file deleted');
        }

        const response = {
            success: true,
            message: `იმპორტი დასრულდა: ${successCount} კომპანია წარმატებით დაემატა${errorCount > 0 ? `, ${errorCount} შეცდომა` : ''}`,
            statistics: {
                total: data.length,
                success: successCount,
                errors: errorCount
            },
            processedCompanies,
            errors: errors.slice(0, 10) // Limit errors to first 10
        };

        console.log('✅✅✅ IMPORT ROUTE COMPLETED SUCCESSFULLY ✅✅✅');
        console.log('📊 Import Route: Final response:', response);

        res.json(response);

    } catch (error) {
        console.error('❌❌❌ IMPORT ROUTE FAILED ❌❌❌');
        console.error('❌ Import Route: Error:', error.message);
        console.error('❌ Import Route: Stack:', error.stack);

        // Clean up uploaded file on error
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Import Route: Temporary file deleted (after error)');
        }

        res.status(500).json({
            success: false,
            message: `იმპორტის შეცდომა: ${error.message}`,
            statistics: {
                total: 0,
                success: successCount,
                errors: errorCount + 1
            },
            processedCompanies,
            errors: [...errors, error.message]
        });
    }
});

// GET: Download template file
router.get('/template', authenticateToken, (req, res) => {
    try {
        // Create a template Excel file
        const templateData = [
            {
                'Company Name': 'Example Company',
                'Country': 'Georgia',
                'Company Profile': 'Technology',
                'Identification Code': '123456789',
                'Legal Address': '123 Main St, Tbilisi',
                'Website': 'www.example.com',
                'Status': 'აქტიური',
                'Comment': 'Example comment'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

        const templatePath = path.join(__dirname, '../uploads/companies-template.xlsx');
        XLSX.writeFile(workbook, templatePath);

        res.download(templatePath, 'companies-template.xlsx', (err) => {
            if (err) {
                console.error('Template download error:', err);
            }
            // Clean up template file
            if (fs.existsSync(templatePath)) {
                fs.unlinkSync(templatePath);
            }
        });

    } catch (error) {
        console.error('Template generation error:', error);
        res.status(500).json({
            success: false,
            message: 'ტემპლეიტის გენერირება ვერ მოხერხდა'
        });
    }
});

module.exports = router;