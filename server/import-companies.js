
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('./db');

async function importCompaniesFromExcel(filePath, userId = null) {
    try {
        console.log('კომპანიების იმპორტის დაწყება...', { filePath, userId });
        
        // შევამოწმოთ ფაილის არსებობა
        if (!fs.existsSync(filePath)) {
            console.error('File does not exist at path:', filePath);
            console.error('Current working directory:', process.cwd());
            console.error('__dirname:', __dirname);
            
            // Try alternative paths
            const alternativePaths = [
                path.resolve(filePath),
                path.join(__dirname, 'uploads', 'import', path.basename(filePath)),
                path.join(__dirname, '..', 'uploads', 'import', path.basename(filePath)),
                path.join(process.cwd(), 'uploads', 'import', path.basename(filePath))
            ];
            
            let foundPath = null;
            for (const altPath of alternativePaths) {
                if (fs.existsSync(altPath)) {
                    foundPath = altPath;
                    console.log('Found file at alternative path:', altPath);
                    break;
                }
            }
            
            if (!foundPath) {
                throw new Error(`ფაილი ვერ მოიძებნა არც ერთ ლოკაციაზე: ${filePath}`);
            }
            
            filePath = foundPath;
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
                // ველების მაპინგი - ზუსტად შაბლონის თანმიმდევრობით
                const companyData = {
                    company_name: (row['კომპანიის დასახელება'] || row['company_name'] || '').toString().trim(),
                    country: (row['ქვეყანა'] || row['country'] || '').toString().trim(),
                    company_profile: (row['პროფილი'] || row['company_profile'] || '').toString().trim(),
                    identification_code: (row['საიდენტიფიკაციო კოდი'] || row['identification_code'] || '').toString().trim(),
                    legal_address: (row['იურიდიული მისამართი'] || row['legal_address'] || '').toString().trim(),
                    website: (row['ვებსაიტი'] || row['website'] || '').toString().trim(),
                    status: (row['სტატუსი'] || row['status'] || 'აქტიური').toString().trim(),
                    comment: (row['კომენტარი'] || row['comment'] || '').toString().trim()
                };

                // მონაწილე გამოფენების დამუშავება (ზუსტად შაბლონის ველიდან)
                const exhibitionsStr = (row['მონაწილე გამოფენები'] || row['selected_exhibitions'] || '').toString().trim();
                let selectedExhibitions = [];
                if (exhibitionsStr) {
                    // კომებით გაყოფილი ID-ების დამუშავება
                    const exhibitionIds = exhibitionsStr.split(',')
                        .map(id => id.trim())
                        .filter(id => id !== '')
                        .map(id => parseInt(id))
                        .filter(id => !isNaN(id) && id > 0);
                    selectedExhibitions = exhibitionIds;
                    console.log(`რიგი ${i + 1}: მონაწილე გამოფენები:`, selectedExhibitions);
                }

                // საკონტაქტო პირის ინფორმაცია (ზუსტად შაბლონის ველებიდან)
                const contactPerson = {
                    name: (row['საკონტაქტო პირი'] || row['contact_person'] || '').toString().trim(),
                    position: (row['პოზიცია'] || row['position'] || '').toString().trim(),
                    phone: (row['ტელეფონი'] || row['phone'] || '').toString().trim(),
                    email: (row['ელ-ფოსტა'] || row['email'] || '').toString().trim()
                };

                // მხოლოდ კომპანიის დასახელება არის სავალდებულო
                if (!companyData.company_name) {
                    const errorMsg = `რიგი ${i + 1}: კომპანიის დასახელება ცარიელია (სავალდებულო ველი)`;
                    errors.push(errorMsg);
                    errorDetails.push({ row: i + 1, error: errorMsg, data: row });
                    errorCount++;
                    continue;
                }

                // საიდენტიფიკაციო კოდი ცარიელი რჩება, თუ შაბლონში ცარიელია
                // ავტომატური კოდის შექმნა არ ხდება

                // საკონტაქტო პირების მასივი
                let contactPersons = [];
                if (contactPerson.name || contactPerson.position || contactPerson.phone || contactPerson.email) {
                    contactPersons.push(contactPerson);
                }

                console.log('მონაცემები რიგიდან:', row);
                console.log('კომპანიის მონაცემები:', companyData);
                console.log('საკონტაქტო პირი:', contactPerson);
                console.log('მონაწილე გამოფენები:', selectedExhibitions);

                // ბაზაში ჩასმა
                let result;
                if (companyData.identification_code) {
                    // თუ საიდენტიფიკაციო კოდი არსებობს, გამოვიყენოთ ON CONFLICT
                    result = await db.query(`
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
                        JSON.stringify(selectedExhibitions),
                        validUserId
                    ]);
                } else {
                    // თუ საიდენტიფიკაციო კოდი ცარიელია, უბრალოდ ჩავსვათ (ცარიელი კოდით)
                    result = await db.query(`
                        INSERT INTO companies (
                            company_name, country, company_profile, identification_code,
                            legal_address, website, status, comment, contact_persons,
                            selected_exhibitions, created_by_user_id, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id
                    `, [
                        companyData.company_name,
                        companyData.country || null,
                        companyData.company_profile || null,
                        companyData.identification_code || null,
                        companyData.legal_address || null,
                        companyData.website || null,
                        companyData.status || null,
                        companyData.comment || null,
                        JSON.stringify(contactPersons) || null,
                        JSON.stringify(selectedExhibitions) || null,
                        validUserId || null
                    ]);
                }

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
