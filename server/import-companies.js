
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const db = require('./db');

async function importCompaniesFromExcel(filePath, userId = null) {
    try {
        console.log('კომპანიების იმპორტის დაწყება...');
        
        // ექსელის ფაილის წაკითხვა
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // პირველი sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // JSON-ად კონვერტაცია
        const companiesData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`მოიძებნა ${companiesData.length} კომპანია`);
        
        // თუ userId არ არის მოწოდებული, ვეცდებით პირველი ადმინის მოძებნას
        let validUserId = userId;
        if (!validUserId) {
            try {
                const userResult = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
                if (userResult.rows.length > 0) {
                    validUserId = userResult.rows[0].id;
                } else {
                    // თუ ადმინი არ მოიძებნა, ვამატებთ დეფოლტ ადმინს
                    console.log('არ მოიძებნა ადმინი, შექმნა დეფოლტ ადმინის...');
                    const createAdminResult = await db.query(`
                        INSERT INTO users (username, email, password_hash, role, is_active) 
                        VALUES ($1, $2, $3, $4, $5) 
                        ON CONFLICT (email) DO UPDATE SET role = 'admin'
                        RETURNING id
                    `, ['admin', 'admin@example.com', 'temp_hash', 'admin', true]);
                    validUserId = createAdminResult.rows[0].id;
                }
            } catch (userError) {
                console.error('მომხმარებლის მოძებნის შეცდომა:', userError);
                validUserId = 1; // ფოლბექ
            }
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < companiesData.length; i++) {
            const row = companiesData[i];
            try {
                // ველების მათდება
                const companyData = {
                    company_name: row['კომპანიის დასახელება'] || row['Company Name'] || row['company_name'] || '',
                    country: row['ქვეყანა'] || row['Country'] || row['country'] || '',
                    company_profile: row['პროფილი'] || row['Profile'] || row['company_profile'] || '',
                    identification_code: row['საიდენტიფიკაციო კოდი'] || row['ID Code'] || row['identification_code'] || '',
                    legal_address: row['იურიდიული მისამართი'] || row['Legal Address'] || row['legal_address'] || '',
                    website: row['ვებსაიტი'] || row['Website'] || row['website'] || '',
                    status: row['სტატუსი'] || row['Status'] || row['status'] || 'აქტიური',
                    comment: row['კომენტარი'] || row['Comment'] || row['comment'] || ''
                };
                
                // საკონტაქტო პირების დამუშავება
                let contactPersons = [];
                if (row['საკონტაქტო პირი'] || row['Contact Person']) {
                    const contactName = row['საკონტაქტო პირი'] || row['Contact Person'];
                    const contactPosition = row['პოზიცია'] || row['Position'] || '';
                    const contactPhone = row['ტელეფონი'] || row['Phone'] || '';
                    const contactEmail = row['ელ-ფოსტა'] || row['Email'] || '';
                    
                    if (contactName) {
                        contactPersons.push({
                            name: contactName,
                            position: contactPosition,
                            phone: contactPhone,
                            email: contactEmail
                        });
                    }
                }
                
                // ვალიდაცია
                if (!companyData.company_name) {
                    throw new Error(`ხაზი ${i + 2}: საჭიროა კომპანიის დასახელება`);
                }
                
                // თუ იდენტიფიკაციო კოდი არ არის, შექმნათ უნიკალური კოდი
                if (!companyData.identification_code) {
                    companyData.identification_code = `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
                
                // მონაცემთა ბაზაში ჩასმა
                const result = await db.query(`
                    INSERT INTO companies (
                        company_name, country, company_profile, identification_code,
                        legal_address, website, status, comment, contact_persons,
                        selected_exhibitions, created_by_user_id, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
                    ON CONFLICT (identification_code) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        country = EXCLUDED.country,
                        company_profile = EXCLUDED.company_profile,
                        legal_address = EXCLUDED.legal_address,
                        website = EXCLUDED.website,
                        status = EXCLUDED.status,
                        comment = EXCLUDED.comment,
                        contact_persons = EXCLUDED.contact_persons,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [
                    companyData.company_name,
                    companyData.country,
                    companyData.company_profile,
                    companyData.identification_code,
                    companyData.legal_address,
                    companyData.website,
                    companyData.status,
                    companyData.comment,
                    JSON.stringify(contactPersons),
                    JSON.stringify([]),
                    validUserId
                ]);
                
                successCount++;
                console.log(`წარმატებით დაემატა: ${companyData.company_name}`);
                
            } catch (error) {
                errorCount++;
                const errorMsg = `ხაზი ${i + 2}: ${error.message}`;
                errors.push(errorMsg);
                console.error(errorMsg);
            }
        }
        
        return {
            success: true,
            total: companiesData.length,
            imported: successCount,
            errors: errorCount,
            errorDetails: errors
        };
        
    } catch (error) {
        console.error('იმპორტის შეცდომა:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// თუ სკრიპტი პირდაპირ გაეშვა
if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('გთხოვთ მიუთითოთ ექსელის ფაილის გზა');
        process.exit(1);
    }
    
    importCompaniesFromExcel(filePath).then(result => {
        console.log('იმპორტი დასრულდა:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { importCompaniesFromExcel };
