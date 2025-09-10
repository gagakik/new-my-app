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
        console.log('Upload directory path:', uploadDir);
        
        try {
            // Create directory with recursive option and set permissions
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
                console.log('Upload directory created successfully:', uploadDir);
            } else {
                console.log('Upload directory already exists:', uploadDir);
            }
            
            // Check if directory is writable
            fs.accessSync(uploadDir, fs.constants.W_OK);
            console.log('Directory is writable');
            
            cb(null, uploadDir);
        } catch (error) {
            console.error('Error creating/accessing upload directory:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const randomNum = Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const filename = `companies-${timestamp}-${randomNum}${ext}`;
        console.log('Generated filename:', filename);
        cb(null, filename);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log('File filter check:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        const allowedTypes = [".xlsx", ".xls"];
        const allowedMimes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ];
        
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(ext) || allowedMimes.includes(file.mimetype)) {
            console.log('File accepted:', file.originalname);
            cb(null, true);
        } else {
            console.log('File rejected:', file.originalname, 'Type:', file.mimetype, 'Ext:', ext);
            cb(new Error("მხოლოდ Excel ფაილები (.xlsx, .xls) ნებადართულია"));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// POST: Import companies from Excel file
router.post(
    "/companies",
    authenticateToken,
    requireAdmin,
    upload.single("excelFile"),
    async (req, res) => {
        let filePath = null;
        
        try {
            console.log('Request received:', {
                hasFile: !!req.file,
                body: req.body,
                headers: req.headers['content-type']
            });
            
            if (!req.file) {
                console.error('No file received in request');
                return res.status(400).json({ 
                    error: "Excel ფაილი არ არის ატვირთული",
                    details: "მულტერმა ფაილი ვერ დაამუშავა"
                });
            }

            filePath = req.file.path;
            console.log('File received successfully:', {
                filePath,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                fieldname: req.file.fieldname
            });

            // Verify file exists and is readable
            if (!fs.existsSync(filePath)) {
                throw new Error(`ფაილი ვერ მოიძებნა მითითებულ მისამართზე: ${filePath}`);
            }

            const fileStats = fs.statSync(filePath);
            console.log('File stats:', {
                size: fileStats.size,
                isFile: fileStats.isFile(),
                permissions: fileStats.mode.toString(8)
            });

            if (fileStats.size === 0) {
                throw new Error('ატვირთული ფაილი ცარიელია');
            }

            console.log('Starting import process for user:', req.user.id);

            // Import companies from Excel
            const { importCompaniesFromExcel } = require('../import-companies');
            const result = await importCompaniesFromExcel(filePath, req.user.id);

            console.log('Import completed:', result);

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
            console.error('Import process error:', error);

            let errorMessage = 'იმპორტის შეცდომა';
            let statusCode = 500;

            if (error.message.includes('ENOENT')) {
                errorMessage = 'ფაილი ვერ მოიძებნა ან წაიშალა';
                statusCode = 400;
            } else if (error.message.includes('EACCES')) {
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
            // Clean up uploaded file in finally block
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('File cleanup successful:', filePath);
                } catch (cleanupError) {
                    console.warn('File cleanup failed:', cleanupError.message);
                }
            }
        }
    },
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