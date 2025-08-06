
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { importCompaniesFromExcel } = require('../import-companies');

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

// Admin only middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'ამ ოპერაციისთვის admin უფლებები არის საჭირო.' });
    }
    next();
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/import');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `companies-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// POST: Import companies from Excel file
router.post('/companies', authenticateToken, requireAdmin, upload.single('excelFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Excel ფაილი არ არის ატვირთული' });
        }

        const filePath = req.file.path;
        
        // Run import
        const result = await importCompaniesFromExcel(filePath);
        
        // Clean up uploaded file
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('Error deleting uploaded file:', error);
        }
        
        if (result.success) {
            res.json({
                message: 'იმპორტი წარმატებით დასრულდა',
                total: result.total,
                imported: result.imported,
                errors: result.errors,
                errorDetails: result.errorDetails
            });
        } else {
            res.status(500).json({
                error: 'იმპორტის შეცდომა',
                details: result.error
            });
        }
        
    } catch (error) {
        console.error('Import endpoint error:', error);
        res.status(500).json({
            error: 'სერვერის შეცდომა',
            details: error.message
        });
    }
});

// GET: Download template Excel file
router.get('/companies/template', authenticateToken, requireAdmin, (req, res) => {
    try {
        const XLSX = require('xlsx');
        
        // Create template data with multiple examples and instructions
        const templateData = [
            {
                'კომპანიის დასახელება': 'მაგალითი კომპანია 1 (საჭირო)',
                'ქვეყანა': 'საქართველო',
                'პროფილი': 'IT კომპანია',
                'საიდენტიფიკაციო კოდი': '123456789 (საჭირო)',
                'იურიდიული მისამართი': 'თბილისი, საქართველო',
                'ვებსაიტი': 'https://example.ge',
                'სტატუსი': 'აქტიური',
                'კომენტარი': 'ტესტ კომენტარი',
                'საკონტაქტო პირი': 'გიორგი გიორგაძე',
                'პოზიცია': 'დირექტორი',
                'ტელეფონი': '+995555123456',
                'ელ-ფოსტა': 'contact@example.ge'
            },
            {
                'კომპანიის დასახელება': 'ABC Technology Ltd (საჭირო)',
                'ქვეყანა': 'გერმანია',
                'პროფილი': 'სონსორული ტექნოლოგიები',
                'საიდენტიფიკაციო კოდი': '987654321 (საჭირო)',
                'იურიდიული მისამართი': 'ბერლინი, გერმანია',
                'ვებსაიტი': 'www.abctech.de',
                'სტატუსი': 'აქტიური',
                'კომენტარი': 'მნიშვნელოვანი პარტნიორი',
                'საკონტაქტო პირი': 'Hans Mueller',
                'პოზიცია': 'CEO',
                'ტელეფონი': '+49-30-12345678',
                'ელ-ფოსტა': 'hans.mueller@abctech.de'
            },
            {
                'კომპანიის დასახელება': 'Global Solutions Inc (საჭირო)',
                'ქვეყანა': 'აშშ',
                'პროფილი': 'კონსულტინგი',
                'საიდენტიფიკაციო კოდი': '456789123 (საჭირო)',
                'იურიდიული მისამართი': 'ნიუ-იორკი, აშშ',
                'ვებსაიტი': '',
                'სტატუსი': 'პასიური',
                'კომენტარი': '',
                'საკონტაქტო პირი': 'John Smith',
                'პოზიცია': 'Manager',
                'ტელეფონი': '',
                'ელ-ფოსტა': 'john@globalsolutions.com'
            }
        ];
        
        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'კომპანიები');
        
        // Set column widths
        const colWidths = [
            { wch: 25 }, // კომპანიის დასახელება
            { wch: 15 }, // ქვეყანა
            { wch: 20 }, // პროფილი
            { wch: 15 }, // საიდენტიფიკაციო კოდი
            { wch: 30 }, // იურიდიული მისამართი
            { wch: 20 }, // ვებსაიტი
            { wch: 10 }, // სტატუსი
            { wch: 25 }, // კომენტარი
            { wch: 20 }, // საკონტაქტო პირი
            { wch: 15 }, // პოზიცია
            { wch: 15 }, // ტელეფონი
            { wch: 25 }  // ელ-ფოსტა
        ];
        worksheet['!cols'] = colWidths;
        
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="companies-template.xlsx"');
        res.send(buffer);
        
    } catch (error) {
        console.error('Template generation error:', error);
        res.status(500).json({
            error: 'შაბლონის გენერირების შეცდომა',
            details: error.message
        });
    }
});

// GET: Export companies to Excel file
router.get('/companies/export', authenticateToken, async (req, res) => {
    try {
        const XLSX = require('xlsx');
        
        // Get all companies from database
        const result = await require('../db').query(`
            SELECT 
                company_name,
                country,
                company_profile,
                identification_code,
                legal_address,
                website,
                status,
                comment,
                contact_persons,
                created_at
            FROM companies 
            ORDER BY company_name
        `);
        
        const companies = result.rows;
        
        // Prepare data for Excel export
        const exportData = companies.map(company => {
            let contactPersons = [];
            try {
                contactPersons = typeof company.contact_persons === 'string' 
                    ? JSON.parse(company.contact_persons) 
                    : company.contact_persons || [];
            } catch (e) {
                contactPersons = [];
            }
            
            const primaryContact = contactPersons.length > 0 ? contactPersons[0] : {};
            
            return {
                'კომპანიის დასახელება': company.company_name || '',
                'ქვეყანა': company.country || '',
                'პროფილი': company.company_profile || '',
                'საიდენტიფიკაციო კოდი': company.identification_code || '',
                'იურიდიული მისამართი': company.legal_address || '',
                'ვებსაიტი': company.website || '',
                'სტატუსი': company.status || '',
                'კომენტარი': company.comment || '',
                'საკონტაქტო პირი': primaryContact.name || '',
                'პოზიცია': primaryContact.position || '',
                'ტელეფონი': primaryContact.phone || '',
                'ელ-ფოსტა': primaryContact.email || '',
                'შექმნის თარიღი': company.created_at ? new Date(company.created_at).toLocaleDateString('ka-GE') : ''
            };
        });
        
        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'კომპანიები');
        
        // Set column widths
        const colWidths = [
            { wch: 25 }, // კომპანიის დასახელება
            { wch: 15 }, // ქვეყანა
            { wch: 20 }, // პროფილი
            { wch: 15 }, // საიდენტიფიკაციო კოდი
            { wch: 30 }, // იურიდიული მისამართი
            { wch: 20 }, // ვებსაიტი
            { wch: 10 }, // სტატუსი
            { wch: 25 }, // კომენტარი
            { wch: 20 }, // საკონტაქტო პირი
            { wch: 15 }, // პოზიცია
            { wch: 15 }, // ტელეფონი
            { wch: 25 }, // ელ-ფოსტა
            { wch: 15 }  // შექმნის თარიღი
        ];
        worksheet['!cols'] = colWidths;
        
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="companies-export-${timestamp}.xlsx"`);
        res.send(buffer);
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            error: 'ექსპორტის შეცდომა',
            details: error.message
        });
    }
});

module.exports = router;
