
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('./db');

async function importCompaniesFromExcel(filePath, userId = null) {
    try {
        console.log('კომპანიების იმპორტის დაწყება...', { filePath, userId });
        
        // შევამოწმოთ ფაილის არსებობა
        if (!fs.existsSync(filePath)) {
            throw new Error(`ფაილი ვერ მოიძებნა: ${filePath}`);
        }

        // შევამოწმოთ ბაზის კავშირი და ცხრილის არსებობა
        try {
            const tableCheck = await db.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_name = 'companies' AND table_schema = 'public'
            `);
            console.log('Companies table exists:', tableCheck.rows[0].count > 0);
            
            if (tableCheck.rows[0].count === 0) {
                throw new Error('Companies ცხრილი არ არსებობს ბაზაში');
            }
        } catch (dbError) {
            console.error('Database connectivity error:', dbError);
            throw new Error('ბაზასთან კავშირის პრობლემა: ' + dbError.message);
        }

        // ექსელის ფაილის წაკითხვა
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // პირველი sheet
        const worksheet = workbook.Sheets[sheetName];
        
        console.log('Available sheets:', workbook.SheetNames);
        console.log('Using sheet:', sheetName);
        
        // JSON-ად კონვერტაცია
        const companiesData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log(`მოიძებნა ${companiesData.length} კომპანია`);
        console.log('First 2 rows sample:', JSON.stringify(companiesData.slice(0, 2), null, 2));
        
        if (companiesData.length > 0) {
            console.log('Available columns:', Object.keys(companiesData[0]));
        }
        
        if (companiesData.length === 0) {
            throw new Error('ექსელის ფაილში არ არის მონაცემები');
        }
        
        // თუ userId არ არის მოწოდებული, ვეცდებით პირველი ადმინის მოძებნას
        let validUserId = userId;
        if (!validUserId) {
            try {
                console.log('ვეძებთ ადმინ მომხმარებელს...');
                const userResult = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
                if (userResult.rows.length > 0) {
                    validUserId = userResult.rows[0].id;
                    console.log('მოიძებნა ადმინი:', validUserId);
                } else {
                    // თუ ადმინი არ მოიძებნა, ვამატებთ დეფოლტ ადმინს
                    console.log('არ მოიძებნა ადმინი, შექმნა დეფოლტ ადმინის...');
                    const bcrypt = require('bcryptjs');
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    const createAdminResult = await db.query(`
                        INSERT INTO users (username, password, role) 
                        VALUES ($1, $2, $3) 
                        ON CONFLICT (username) DO UPDATE SET role = 'admin'
                        RETURNING id
                    `, ['admin', hashedPassword, 'admin']);
                    validUserId = createAdminResult.rows[0].id;
                    console.log('შეიქმნა ახალი ადმინი:', validUserId);
                }
            } catch (userError) {
                console.error('მომხმარებლის მოძებნის შეცდომა:', userError);
                validUserId = 1; // ფოლბექ
            }
        }
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        const errorDetails = [];
        
        for (let i = 0; i < companiesData.length; i++) {
            const row = companiesData[i];
            console.log(`დამუშავება რიგი ${i + 1}:`, Object.keys(row));
            
            try {
                // ველების მაპინგი - ყველა შესაძლო ველის სახელის შემოწმება
                const companyData = {
                    company_name: row['კომპანიის დასახელება'] || row['company_name'] || row['კომპანია'] || '',
                    country: row['ქვეყანა'] || row['country'] || row['ქვეყანა/Country'] || '',
                    company_profile: row['პროფილი'] || row['company_profile'] || row['კომპანიის პროფილი'] || '',
                    identification_code: row['საიდენტიფიკაციო კოდი'] || row['identification_code'] || row['საიდ. კოდი'] || '',
                    legal_address: row['იურიდიული მისამართი'] || row['legal_address'] || row['მისამართი'] || '',
                    website: row['ვებსაიტი'] || row['website'] || row['ვებგვერდი'] || '',
                    status: row['სტატუსი'] || row['status'] || 'აქტიური',
                    comment: row['კომენტარი'] || row['comment'] || row['შენიშვნა'] || ''
                };

                // საკონტაქტო პირის ინფორმაცია
                const contactPerson = {
                    name: row['საკონტაქტო პირი'] || row['contact_person'] || row['კონტაქტი'] || '',
                    position: row['პოზიცია'] || row['position'] || row['თანამდებობა'] || '',
                    phone: row['ტელეფონი'] || row['phone'] || row['ტელ.'] || '',
                    email: row['ელ-ფოსტა'] || row['email'] || row['მეილი'] || ''
                };

                // შევამოწმოთ სავალდებულო ველები
                if (!companyData.company_name || companyData.company_name.trim() === '') {
                    const errorMsg = `რიგი ${i + 1}: კომპანიის დასახელება ცარიელია`;
                    errors.push(errorMsg);
                    errorDetails.push({ row: i + 1, error: errorMsg, data: row });
                    errorCount++;
                    continue;
                }

                // თუ საიდენტიფიკაციო კოდი არ არის მოცემული, შევქმნათ ავტომატურად
                if (!companyData.identification_code || companyData.identification_code.trim() === '') {
                    companyData.identification_code = `AUTO_${Date.now()}_${i}`;
                    console.log(`ავტომატურად შექმნილი კოდი: ${companyData.identification_code}`);
                }

                // საკონტაქტო პირების მასივი
                let contactPersons = [];
                if (contactPerson.name || contactPerson.position || contactPerson.phone || contactPerson.email) {
                    contactPersons.push(contactPerson);
                }

                console.log('მონაცემები რიგიდან:', row);
                console.log('კომპანიის მონაცემები:', companyData);
                console.log('საკონტაქტო პირი:', contactPerson);

                // ბაზაში ჩასმა
                const result = await db.query(`
                    INSERT INTO companies (
                        company_name, country, company_profile, identification_code,
                        legal_address, website, status, comment, contact_persons,
                        selected_exhibitions, created_by_user_id, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (identification_code) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        country = EXCLUDED.country,
                        company_profile = EXCLUDED.company_profile,
                        legal_address = EXCLUDED.legal_address,
                        website = EXCLUDED.website,
                        status = EXCLUDED.status,
                        comment = EXCLUDED.comment,
                        contact_persons = EXCLUDED.contact_persons,
                        selected_exhibitions = EXCLUDED.selected_exhibitions,
                        updated_by_user_id = $11,
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
                    JSON.stringify([]), // selected_exhibitions
                    validUserId
                ]);

                console.log(`წარმატებით დამატებულია კომპანია: ${companyData.company_name} (ID: ${result.rows[0].id})`);
                successCount++;

            } catch (rowError) {
                console.error(`შეცდომა რიგზე ${i + 1}:`, rowError);
                const errorMsg = `რიგი ${i + 1}: ${rowError.message}`;
                errors.push(errorMsg);
                errorDetails.push({ row: i + 1, error: rowError.message, data: row });
                errorCount++;
            }
        }

        console.log(`იმპორტი დასრულდა. წარმატებული: ${successCount}, შეცდომები: ${errorCount}`);

        return {
            success: true,
            total: companiesData.length,
            imported: successCount,
            errors: errorCount,
            errorDetails: errorDetails,
            message: `წარმატებით იმპორტირდა ${successCount} კომპანია ${companiesData.length}-დან`
        };

    } catch (error) {
        console.error('იმპორტის ზოგადი შეცდომა:', error);
        return {
            success: false,
            error: error.message,
            total: 0,
            imported: 0,
            errors: 1,
            errorDetails: [{ error: error.message }]
        };
    }
}

module.exports = {
    importCompaniesFromExcel
};
