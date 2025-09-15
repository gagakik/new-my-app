
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const db = require("../db");
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

// Simple multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/import");
        
        console.log('=== File Upload Debug ===');
        console.log('__dirname:', __dirname);
        console.log('uploadDir:', uploadDir);
        console.log('Directory exists:', fs.existsSync(uploadDir));

        // Ensure directory exists with proper permissions
        try {
            if (!fs.existsSync(uploadDir)) {
                console.log('Creating upload directory:', uploadDir);
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Upload directory created successfully');
                
                // Set permissions after creation (Unix/Linux)
                try {
                    fs.chmodSync(uploadDir, 0o755);
                } catch (chmodError) {
                    console.log('chmod not supported on this system:', chmodError.message);
                }
            }
            
            // Test write permissions
            const testFile = path.join(uploadDir, `test-${Date.now()}.tmp`);
            try {
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
                console.log('✅ Write permissions confirmed for:', uploadDir);
            } catch (writeError) {
                console.error('❌ Write permission test failed:', writeError);
                // Try to create with different approach
                try {
                    const alternateDir = path.resolve(__dirname, "..", "uploads", "import");
                    if (!fs.existsSync(alternateDir)) {
                        fs.mkdirSync(alternateDir, { recursive: true });
                    }
                    const testFile2 = path.join(alternateDir, `test-${Date.now()}.tmp`);
                    fs.writeFileSync(testFile2, 'test');
                    fs.unlinkSync(testFile2);
                    console.log('✅ Alternate directory works:', alternateDir);
                    return cb(null, alternateDir);
                } catch (altError) {
                    console.error('❌ Alternate approach also failed:', altError);
                }
            }

            console.log('Final upload directory:', uploadDir);
            cb(null, uploadDir);
        } catch (dirError) {
            console.error('Directory creation error:', dirError);
            // Fallback to parent uploads directory
            const fallbackDir = path.join(__dirname, "../uploads");
            console.log('Using fallback directory:', fallbackDir);
            cb(null, fallbackDir);
        }
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `companies-${timestamp}${ext}`;
        console.log('Generated filename:', filename);
        console.log('Original filename:', file.originalname);
        console.log('File mimetype:', file.mimetype);
        console.log('File size:', file.size);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        const allowedExtensions = [".xlsx", ".xls"];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            console.log('✅ File accepted:', file.originalname);
            cb(null, true);
        } else {
            console.log('❌ File rejected:', file.originalname);
            cb(new Error('მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// POST: Import companies from Excel file
router.post(
    "/companies",
    authenticateToken,
    requireAdmin,
    (req, res, next) => {
        console.log('=== Before multer processing ===');
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Content-Length:', req.headers['content-length']);
        console.log('Authorization header exists:', !!req.headers['authorization']);
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        next();
    },
    (req, res, next) => {
        console.log('=== Multer processing start ===');
        const multerHandler = upload.single("excelFile");
        multerHandler(req, res, (err) => {
            console.log('=== Multer processing result ===');
            if (err) {
                console.error('Multer error:', err);
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ error: 'ფაილი ძალიან დიდია (მაქსიმუმ 5MB)' });
                }
                return res.status(400).json({ error: err.message });
            }
            console.log('File after multer:', req.file ? 'Present' : 'Missing');
            if (req.file) {
                console.log('File info:', {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    path: req.file.path
                });
            }
            next();
        });
    },
    async (req, res) => {
        let filePath = null;

        try {
            console.log('=== Import request received ===');
            console.log('Request headers keys:', Object.keys(req.headers));
            console.log('Request body keys:', Object.keys(req.body));
            console.log('Multer file info:', req.file ? 'File present' : 'No file');
            console.log('Request files:', req.files);
            
            if (req.file) {
                console.log('File details:', {
                    originalname: req.file.originalname,
                    filename: req.file.filename,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    path: req.file.path,
                    destination: req.file.destination
                });
            }

            if (!req.file) {
                console.error('No file received in request');
                console.log('This might be due to:');
                console.log('1. File size too large');
                console.log('2. Wrong field name (should be "excelFile")');
                console.log('3. File type not allowed');
                console.log('4. Multer configuration issue');
                return res.status(400).json({
                    error: "Excel ფაილი არ არის ატვირთული"
                });
            }

            console.log('File received:', {
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                path: req.file.path
            });

            filePath = req.file.path;

            // Verify file exists
            if (!fs.existsSync(filePath)) {
                throw new Error('ფაილი ვერ შეინახა სერვერზე');
            }

            console.log('Starting import process...');

            // Import companies from Excel
            const result = await importCompaniesFromExcel(filePath, req.user.id);

            console.log('Import completed:', {
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
            console.error('Import error:', error);

            let errorMessage = 'იმპორტის შეცდომა';
            let statusCode = 500;

            if (error.code === 'ENOENT') {
                errorMessage = 'ფაილი ვერ მოიძებნა';
                statusCode = 400;
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
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('Temporary file cleaned up');
                } catch (cleanupError) {
                    console.warn('File cleanup failed:', cleanupError.message);
                }
            }
        }
    }
);

// Test upload endpoint for debugging
router.post('/test-upload', authenticateToken, requireAdmin, upload.single('testFile'), (req, res) => {
    console.log('=== Test upload endpoint hit ===');
    console.log('File received:', req.file);
    console.log('Body:', req.body);

    if (req.file) {
        // Clean up test file immediately
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) {
            console.warn('Could not delete test file:', e.message);
        }

        res.json({ 
            success: true, 
            message: 'Upload test successful',
            fileInfo: {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } else {
        res.status(400).json({ error: 'No file received in test upload' });
    }
});

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
                    "ქვეყანა": "",
                    "პროფილი": "",
                    "საიდენტიფიკაციო კოდი": "",
                    "იურიდიული მისამართი": "",
                    "ვებსაიტი": "",
                    "სტატუსი": "",
                    "კომენტარი": "",
                    "საკონტაქტო პირი": "",
                    "პოზიცია": "",
                    "ტელეფონი": "",
                    "ელ-ფოსტა": "",
                    "მონაწილე გამოფენები": ""
                },
                {
                    "კომპანიის დასახელება": "მაგალითი კომპანია 1",
                    "ქვეყანა": "საქართველო",
                    "პროფილი": "ინფორმაციული ტექნოლოგიები",
                    "საიდენტიფიკაციო კოდი": "123456789",
                    "იურიდიული მისამართი": "თბილისი, საქართველო",
                    "ვებსაიტი": "https://example.ge",
                    "სტატუსი": "აქტიური",
                    "კომენტარი": "ტესტ კომპანია",
                    "საკონტაქტო პირი": "ნიკოლოზ გაბუნია",
                    "პოზიცია": "დირექტორი",
                    "ტელეფონი": "+995555123456",
                    "ელ-ფოსტა": "info@example.ge",
                    "მონაწილე გამოფენები": "1,2,3"
                },
                {
                    "კომპანიის დასახელება": "მაგალითი კომპანია 2",
                    "ქვეყანა": "აშშ",
                    "პროფილი": "კონსულტინგი",
                    "საიდენტიფიკაციო კოდი": "",
                    "იურიდიული მისამართი": "",
                    "ვებსაიტი": "",
                    "სტატუსი": "",
                    "კომენტარი": "",
                    "საკონტაქტო პირი": "",
                    "პოზიცია": "",
                    "ტელეფონი": "",
                    "ელ-ფოსტა": "",
                    "მონაწილე გამოფენები": "1,4"
                }
            ];

            // Create workbook with instructions
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "კომპანიები");

            // Add instructions as comments/notes in the first row
            if (worksheet['A1']) {
                worksheet['A1'].c = [{
                    a: "ინსტრუქცია",
                    t: "მხოლოდ 'კომპანიის დასახელება' არის სავალდებულო ველი. " +
                       "დანარჩენი ველები შეიძლება იყოს ცარიელი. " +
                       "მონაწილე გამოფენები - კომებით გაყოფილი ID-ების ჩამონათვალი (მაგ: 1,2,3)"
                }];
            }

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
                { wch: 20 }, // მონაწილე გამოფენები
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

            // მონაწილე გამოფენების ID-ების სტრინგად გადაქცევა
            let selectedExhibitionsStr = "";
            try {
                const exhibitions = typeof company.selected_exhibitions === "string" 
                    ? JSON.parse(company.selected_exhibitions) 
                    : company.selected_exhibitions || [];
                selectedExhibitionsStr = exhibitions.join(",");
            } catch (e) {
                selectedExhibitionsStr = "";
            }

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
                "მონაწილე გამოფენები": selectedExhibitionsStr
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
            { wch: 20 }, // მონაწილე გამოფენები
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
