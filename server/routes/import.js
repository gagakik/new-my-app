const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const { importCompaniesFromExcel } = require("../import-companies");

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
        return res
            .status(401)
            .json({ error: "ავტორიზაციის ტოკენი არ არის მოწოდებული." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res
                .status(403)
                .json({ error: "არასწორი ან ვადაგასული ავტორიზაციის ტოკენი." });
        }
        req.user = user;
        next();
    });
}

// Admin only middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res
            .status(403)
            .json({ error: "ამ ოპერაციისთვის admin უფლებები არის საჭირო." });
    }
    next();
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/import");
        console.log('=== MULTER DESTINATION ===');
        console.log('Upload directory path:', uploadDir);
        console.log('Current working directory:', process.cwd());
        console.log('__dirname:', __dirname);
        console.log('File being processed:', file.originalname);
        
        try {
            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
                console.log('Upload directory created:', uploadDir);
            }
            
            // Verify directory permissions
            const stats = fs.statSync(uploadDir);
            console.log('Directory stats:', {
                exists: true,
                isDirectory: stats.isDirectory(),
                permissions: stats.mode.toString(8),
                size: stats.size
            });
            
            // Test write access
            const testFile = path.join(uploadDir, `write-test-${Date.now()}.tmp`);
            try {
                fs.writeFileSync(testFile, 'write test');
                fs.unlinkSync(testFile);
                console.log('✅ Write access confirmed');
            } catch (writeError) {
                console.error('❌ Write access failed:', writeError);
                return cb(writeError);
            }
            
            console.log('✅ Destination set successfully:', uploadDir);
            cb(null, uploadDir);
        } catch (error) {
            console.error('❌ Destination setup failed:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomNum = Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `companies-${timestamp}-${randomNum}${ext}`;
        
        console.log('=== MULTER FILENAME ===');
        console.log('Original filename:', file.originalname);
        console.log('Generated filename:', filename);
        console.log('Extension:', ext);
        console.log('File mimetype:', file.mimetype);
        console.log('File fieldname:', file.fieldname);
        
        cb(null, filename);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log('=== MULTER FILE FILTER ===');
        console.log('Filtering file:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            fieldname: file.fieldname,
            encoding: file.encoding,
            size: file.size || 'unknown'
        });
        
        const allowedExtensions = [".xlsx", ".xls"];
        const allowedMimeTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        const isValidExtension = allowedExtensions.includes(fileExtension);
        const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
        
        console.log('File validation:', {
            extension: fileExtension,
            isValidExtension,
            mimetype: file.mimetype,
            isValidMimeType,
            willAccept: isValidExtension || isValidMimeType
        });
        
        if (isValidExtension || isValidMimeType) {
            console.log('✅ File accepted:', file.originalname);
            cb(null, true);
        } else {
            const errorMsg = `არასწორი ფაილის ფორმატი. მოსალოდნელია: ${allowedExtensions.join(', ')}`;
            console.log('❌ File rejected:', errorMsg);
            cb(new Error(errorMsg), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit (increased)
        files: 1,
        fieldSize: 2 * 1024 * 1024 // 2MB for form fields
    }
});

// POST: Import companies from Excel file
router.post(
    "/companies",
    authenticateToken,
    requireAdmin,
    (req, res, next) => {
        console.log('=== PRE-MULTER REQUEST ===');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Content-Length:', req.headers['content-length']);
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        next();
    },
    upload.single("excelFile"),
    async (req, res) => {
        let filePath = null;
        let tempFileCreated = false;
        
        try {
            console.log('=== POST-MULTER REQUEST ===');
            console.log('Multer processed request');
            console.log('req.file exists:', !!req.file);
            console.log('req.body:', req.body);
            
            if (req.file) {
                console.log('File details:', {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    destination: req.file.destination,
                    path: req.file.path,
                    fieldname: req.file.fieldname
                });
                
                filePath = req.file.path;
                tempFileCreated = true;
                
                // Verify file was actually written
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    console.log('✅ File saved successfully:', {
                        path: filePath,
                        size: stats.size,
                        isFile: stats.isFile()
                    });
                } else {
                    console.error('❌ File not found after multer processing:', filePath);
                    throw new Error('ფაილი ვერ შეინახა სერვერზე');
                }
            } else {
                console.error('❌ No file received from multer');
                console.log('Request headers:', req.headers);
                return res.status(400).json({
                    error: "Excel ფაილი არ არის ატვირთული",
                    details: "მულტერმა ფაილი ვერ დაამუშავა"
                });
            }

            console.log('🔄 Starting import process...');
            
            // Import companies from Excel
            const { importCompaniesFromExcel } = require('../import-companies');
            const result = await importCompaniesFromExcel(filePath, req.user.id);

            console.log('✅ Import completed:', {
                success: result.success,
                imported: result.imported,
                total: result.total,
                errors: result.errors
            });

            if (result.success) {
                res.json({
                    message: `წარმატებით იმპორტირდა ${result.imported} კომპანია ${result.total}-დან`,
                    imported: result.imported,
                    total: result.total,
                    errors: result.errors,
                    errorDetails: result.errorDetails
                });
            } else {
                res.status(400).json({
                    error: 'იმპორტი ვერ განხორციელდა',
                    details: result.error
                });
            }

        } catch (error) {
            console.error('❌ Import process error:', error);
            console.error('Error stack:', error.stack);

            let errorMessage = 'იმპორტის შეცდომა';
            let statusCode = 500;

            if (error.code === 'ENOENT') {
                errorMessage = 'ფაილი ვერ მოიძებნა';
                statusCode = 400;
            } else if (error.code === 'EACCES') {
                errorMessage = 'ფაილზე წვდომის უფლება არ არის';
                statusCode = 403;
            } else if (error.message.includes('ცარიელია')) {
                errorMessage = error.message;
                statusCode = 400;
            }

            res.status(statusCode).json({
                error: errorMessage,
                details: error.message
            });

        } finally {
            // Clean up uploaded file
            if (tempFileCreated && filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('🗑️ Temporary file cleaned up:', filePath);
                } catch (cleanupError) {
                    console.warn('⚠️ File cleanup failed:', cleanupError.message);
                }
            }
        }
    }
);

// GET: Download template Excel file
router.get(
    "/companies/template",
    authenticateToken,
    requireAdmin,
    (req, res) => {
        try {
            const XLSX = require("xlsx");

            // Create template data with multiple examples and instructions
            const templateData = [
                {
                    "კომპანიის დასახელება": "ტექნოლოგიური შპს",
                    "ქვეყანა": "საქართველო",
                    "პროფილი": "ინფორმაციული ტექნოლოგიები",
                    "საიდენტიფიკაციო კოდი": "123456789",
                    "იურიდიული მისამართი": "თბილისი, საქართველო",
                    "ვებსაიტი": "https://techcompany.ge",
                    "სტატუსი": "აქტიური",
                    "კომენტარი": "ტესტ კომპანია",
                    "საკონტაქტო პირი": "ნიკოლოზ გაბუნია",
                    "პოზიცია": "დირექტორი",
                    "ტელეფონი": "+995555123456",
                    "ელ-ფოსტა": "info@techcompany.ge"
                },
                {
                    "კომპანიის დასახელება": "გლობალური სოლუშენები",
                    "ქვეყანა": "აშშ",
                    "პროფილი": "კონსულტინგი",
                    "საიდენტიფიკაციო კოდი": "456789123",
                    "იურიდიული მისამართი": "ნიუ-იორკი, აშშ",
                    "ვებსაიტი": "https://globalsolutions.com",
                    "სტატუსი": "აქტიური",
                    "კომენტარი": "კონსალტინგის კომპანია",
                    "საკონტაქტო პირი": "John Smith",
                    "პოზიცია": "Manager",
                    "ტელეფონი": "+1555123456",
                    "ელ-ფოსტა": "john@globalsolutions.com"
                }
            ];

            // Create workbook
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "კომპანიები");

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
            ];
            worksheet["!cols"] = colWidths;

            // Generate buffer
            const buffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="companies-template.xlsx"',
            );
            res.send(buffer);
        } catch (error) {
            console.error("Template generation error:", error);
            res.status(500).json({
                error: "შაბლონის გენერირების შეცდომა",
                details: error.message,
            });
        }
    },
);

// GET: Export companies to Excel file
router.get("/companies/export", authenticateToken, async (req, res) => {
    try {
        const XLSX = require("xlsx");

        // Get all companies from database
        const result = await require("../db").query(`
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
        const exportData = companies.map((company) => {
            let contactPersons = [];
            try {
                contactPersons =
                    typeof company.contact_persons === "string"
                        ? JSON.parse(company.contact_persons)
                        : company.contact_persons || [];
            } catch (e) {
                contactPersons = [];
            }

            const primaryContact =
                contactPersons.length > 0 ? contactPersons[0] : {};

            return {
                "კომპანიის დასახელება": company.company_name || "",
                ქვეყანა: company.country || "",
                პროფილი: company.company_profile || "",
                "საიდენტიფიკაციო კოდი": company.identification_code || "",
                "იურიდიული მისამართი": company.legal_address || "",
                ვებსაიტი: company.website || "",
                სტატუსი: company.status || "",
                კომენტარი: company.comment || "",
                "საკონტაქტო პირი": primaryContact.name || "",
                პოზიცია: primaryContact.position || "",
                ტელეფონი: primaryContact.phone || "",
                "ელ-ფოსტა": primaryContact.email || "",
                "შექმნის თარიღი": company.created_at
                    ? new Date(company.created_at).toLocaleDateString("ka-GE")
                    : "",
            };
        });

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "კომპანიები");

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
            { wch: 15 }, // შექმნის თარიღი
        ];
        worksheet["!cols"] = colWidths;

        // Generate buffer
        const buffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
        });

        const timestamp = new Date().toISOString().split("T")[0];
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="companies-export-${timestamp}.xlsx"`,
        );
        res.send(buffer);
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({
            error: "ექსპორტის შეცდომა",
            details: error.message,
        });
    }
});

module.exports = router;