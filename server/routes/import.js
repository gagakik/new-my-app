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
    console.log('🔐 Authentication middleware called');
    console.log('🔐 Request URL:', req.url);
    console.log('🔐 Request method:', req.method);
    
    const authHeader = req.headers["authorization"];
    console.log('🔐 Auth header present:', !!authHeader);
    console.log('🔐 Auth header value:', authHeader ? authHeader.substring(0, 30) + '...' : 'null');
    
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
        console.log('❌ No token provided');
        return res
            .status(401)
            .json({ error: "ავტორიზაციის ტოკენი არ არის მოწოდებული." });
    }

    console.log('🔐 Token found, verifying...');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('❌ Token verification failed:', err.message);
            return res
                .status(403)
                .json({ error: "არასწორი ან ვადაგასული ავტორიზაციის ტოკენი." });
        }
        console.log('✅ Token verified for user:', user.username);
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

// Simplified multer configuration for better reliability
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/import");

        console.log('🔧 Upload destination:', uploadDir);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            console.log('📁 Creating directory:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        console.log('✅ Directory ready:', uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000000);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `import-${timestamp}-${randomNum}${ext}`;

        console.log('📄 Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log('🔍 File filter check for:', file.originalname);
        console.log('🔍 File mimetype:', file.mimetype);
        console.log('🔍 File fieldname:', file.fieldname);

        const allowedExtensions = [".xlsx", ".xls"];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(fileExtension)) {
            console.log('✅ FILE ACCEPTED:', file.originalname);
            cb(null, true);
        } else {
            console.log('❌ FILE REJECTED:', file.originalname, 'Extension:', fileExtension);
            cb(new Error('მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Company import route
router.post('/companies', upload.single('excelFile'), async (req, res) => {
  console.log('📋📋📋 IMPORT REQUEST RECEIVED 📋📋📋');
  console.log('📋 Timestamp:', new Date().toISOString());
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.url);
  console.log('📋 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Content-Type:', req.headers['content-type']);
  console.log('📋 Content-Length:', req.headers['content-length']);
  console.log('📋 Request body keys:', Object.keys(req.body));
  console.log('📋 Request body:', req.body);
  console.log('📋 Request files object:', req.files);
  console.log('📋 Request file object:', req.file);
  console.log('📋 Request raw headers:', req.rawHeaders);

  if (req.file) {
    console.log('📁 File details:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
  } else {
    console.log('❌ No file found in request');
    console.log('📋 Available fields in request:');
    console.log('  - req.body:', Object.keys(req.body));
    console.log('  - req.files:', req.files ? Object.keys(req.files) : 'null');
    console.log('  - req.file:', req.file ? 'exists' : 'null');
  }

  try {
    console.log('🔄🔄🔄 PROCESSING IMPORT REQUEST 🔄🔄🔄');

    if (!req.file) {
      console.log('❌ ERROR: No file provided in request');
      return res.status(400).json({
        success: false,
        error: 'ფაილი არ არის მოწოდებული. გთხოვთ აირჩიოთ Excel ფაილი.',
        details: {
          receivedFields: Object.keys(req.body),
          hasFiles: !!req.files,
          hasFile: !!req.file
        }
      });
    }

    const filePath = req.file.path;
    console.log('📁 File saved at path:', filePath);
    console.log('📁 File exists?', fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
      console.log('❌ ERROR: File was not saved properly');
      return res.status(500).json({
        success: false,
        error: 'ფაილის შენახვა ვერ მოხერხდა'
      });
    }

    const userId = req.user ? req.user.id : null;
    console.log('👤 Import initiated by user ID:', userId);

    console.log('🚀🚀🚀 STARTING IMPORT PROCESS 🚀🚀🚀');

    // Import companies using the utility function
    const result = await importCompaniesFromExcel(filePath, userId);

    console.log('📊📊📊 IMPORT COMPLETED 📊📊📊');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Temporary file cleaned up:', filePath);
      }
    } catch (cleanupError) {
      console.error('⚠️ File cleanup warning:', cleanupError);
    }

    res.json(result);
  } catch (error) {
    console.error('❌❌❌ IMPORT ROUTE ERROR ❌❌❌');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'იმპორტის პროცესი ვერ დასრულდა: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

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

// GET: List all imported files
router.get("/files", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                if.*,
                u.username as uploaded_by_username
            FROM import_files if
            LEFT JOIN users u ON if.uploaded_by = u.id
            ORDER BY if.uploaded_at DESC
        `);

        res.json({
            success: true,
            files: result.rows
        });
    } catch (error) {
        console.error("Import files list error:", error);
        res.status(500).json({
            error: "იმპორტირებული ფაილების სიის მიღება ვერ მოხერხდა",
            details: error.message
        });
    }
});

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