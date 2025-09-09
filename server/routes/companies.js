const express = require('express');
const router = express.Router();
const db = require('../db');
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

// GET: ყველა კომპანიის მიღება
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { searchTerm, country, profile, status, identification_code, exhibition } = req.query;

        let query = `
            SELECT 
                c.*,
                u1.username as created_by_username,
                u2.username as updated_by_username
            FROM companies c
            LEFT JOIN users u1 ON c.created_by_user_id = u1.id
            LEFT JOIN users u2 ON c.updated_by_user_id = u2.id
            WHERE 1=1
        `;

        const queryParams = [];
        let paramCount = 0;

        // ძებნა კომპანიის სახელით
        if (searchTerm) {
            paramCount++;
            query += ` AND LOWER(c.company_name) LIKE LOWER($${paramCount})`;
            queryParams.push(`%${searchTerm}%`);
        }

        // ფილტრი ქვეყნის მიხედვით
        if (country && country.trim() && country.trim() !== 'All Countries') {
            paramCount++;
            query += ` AND LOWER(c.country) = LOWER($${paramCount})`;
            queryParams.push(country.trim());
        }

        // ფილტრი პროფილის მიხედვით
        if (profile) {
            paramCount++;
            query += ` AND LOWER(c.company_profile) LIKE LOWER($${paramCount})`;
            queryParams.push(`%${profile}%`);
        }

        // ფილტრი სტატუსის მიხედვით
        if (status) {
            paramCount++;
            query += ` AND c.status = $${paramCount}`;
            queryParams.push(status);
        }

        // ფილტრი საიდენტიფიკაციო კოდის მიხედვით
        if (identification_code) {
            paramCount++;
            query += ` AND c.identification_code LIKE $${paramCount}`;
            queryParams.push(`%${identification_code}%`);
        }

        // ფილტრი გამოფენის მიხედვით
        if (exhibition) {
            console.log('Filtering by exhibition ID:', exhibition);
            const exhibitionId = parseInt(exhibition);

            if (!isNaN(exhibitionId)) {
                // PostgreSQL-ისთვის ვიყენებთ jsonb ოპერატორს @> JSON მასივში ელემენტის მოსაძებნად
                paramCount++;
                query += ` AND c.selected_exhibitions @> $${paramCount}`;
                queryParams.push(JSON.stringify([exhibitionId]));

                console.log('Updated paramCount:', paramCount);
                console.log('Query params:', queryParams);
            } else {
                console.log('Invalid exhibition ID:', exhibition);
                // თუ არასწორი ID არის, ვერაფერი არ გამოვიდეს
                paramCount++;
                query += ` AND 1=0`;
            }
        }

        query += ` ORDER BY c.created_at DESC`;

        const result = await db.query(query, queryParams);

        // Parse contact_persons and selected_exhibitions JSON for each company
        const companies = result.rows.map(company => {
            let selectedExhibitions = [];
            let contactPersons = [];

            // Parse contact_persons - check if it's already an object or needs parsing
            try {
                if (company.contact_persons === null || company.contact_persons === undefined) {
                    contactPersons = [];
                } else if (typeof company.contact_persons === 'string') {
                    // Only try to parse if it's a valid JSON string
                    if (company.contact_persons.trim() === '' || company.contact_persons === '[]') {
                        contactPersons = [];
                    } else {
                        contactPersons = JSON.parse(company.contact_persons);
                    }
                } else if (Array.isArray(company.contact_persons)) {
                    contactPersons = company.contact_persons;
                } else if (typeof company.contact_persons === 'object') {
                    // If it's already an object, convert to array if needed
                    contactPersons = Array.isArray(company.contact_persons) ? company.contact_persons : [];
                } else {
                    contactPersons = [];
                }
            } catch (e) {
                console.error('Error parsing contact_persons for company', company.id, ':', e);
                contactPersons = [];
            }

            // Parse selected_exhibitions - check if it's already an object or needs parsing
            try {
                if (company.selected_exhibitions) {
                    if (typeof company.selected_exhibitions === 'string') {
                        const parsed = JSON.parse(company.selected_exhibitions);
                        selectedExhibitions = Array.isArray(parsed) ? parsed.map(id => Number(id)) : [];
                    } else if (Array.isArray(company.selected_exhibitions)) {
                        selectedExhibitions = company.selected_exhibitions.map(id => Number(id));
                    } else {
                        selectedExhibitions = [];
                    }
                    console.log(`Company ${company.id} selected_exhibitions:`, selectedExhibitions);
                }
            } catch (e) {
                console.error('Error parsing selected_exhibitions for company', company.id, ':', e);
                selectedExhibitions = [];
            }

            return {
                ...company,
                contact_persons: contactPersons,
                selected_exhibitions: selectedExhibitions
            };
        });

        res.json(companies);
    } catch (error) {
        console.error('კომპანიების მიღების შეცდომა:', error);
        console.error('Query:', query);
        console.error('Query params:', queryParams);
        console.error('Request query:', req.query);
        res.status(500).json({ 
            message: 'სერვერის შეცდომა',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET: კონკრეტული კომპანიის მიღება ID-ის მიხედვით
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(`
            SELECT 
                c.*,
                u1.username as created_by_username,
                u2.username as updated_by_username
            FROM companies c
            LEFT JOIN users u1 ON c.created_by_user_id = u1.id
            LEFT JOIN users u2 ON c.updated_by_user_id = u2.id
            WHERE c.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'კომპანია ვერ მოიძებნა' });
        }

        const company = result.rows[0];

        // Parse contact_persons - check if it's already an object or needs parsing
        try {
            if (company.contact_persons === null || company.contact_persons === undefined) {
                company.contact_persons = [];
            } else if (typeof company.contact_persons === 'string') {
                if (company.contact_persons.trim() === '' || company.contact_persons === '[]') {
                    company.contact_persons = [];
                } else {
                    company.contact_persons = JSON.parse(company.contact_persons);
                }
            } else if (typeof company.contact_persons === 'object' && !Array.isArray(company.contact_persons)) {
                company.contact_persons = [];
            } else if (!Array.isArray(company.contact_persons)) {
                company.contact_persons = [];
            }
        } catch (e) {
            console.error('Error parsing contact_persons:', e);
            company.contact_persons = [];
        }

        // Parse selected_exhibitions - check if it's already an object or needs parsing
        console.log('Raw selected_exhibitions from DB:', company.selected_exhibitions);
        if (company.selected_exhibitions) {
            try {
                if (typeof company.selected_exhibitions === 'string') {
                    const parsed = JSON.parse(company.selected_exhibitions);
                    console.log('Parsed selected_exhibitions:', parsed, 'Type:', typeof parsed);
                    company.selected_exhibitions = Array.isArray(parsed) ? parsed.map(id => Number(id)) : [];
                } else if (Array.isArray(company.selected_exhibitions)) {
                    company.selected_exhibitions = company.selected_exhibitions.map(id => Number(id));
                } else {
                    company.selected_exhibitions = [];
                }
                console.log('Final selected_exhibitions array:', company.selected_exhibitions);
            } catch (e) {
                console.error('Error parsing selected_exhibitions:', e);
                company.selected_exhibitions = [];
            }
        } else {
            console.log('No selected_exhibitions found, setting empty array');
            company.selected_exhibitions = [];
        }

        res.json(company);
    } catch (error) {
        console.error('კომპანიის მიღების შეცდომა:', error);
        res.status(500).json({ message: 'სერვერის შეცდომა' });
    }
});

// POST: ახალი კომპანიის შექმნა
router.post('/', authenticateToken, async (req, res) => {
    const {
        company_name,
        country,
        company_profile,
        identification_code,
        legal_address,
        website,
        status,
        comment,
        contact_persons,
        selected_exhibitions
    } = req.body;

    const created_by_user_id = req.user ? req.user.id : null;

    try {
        const result = await db.query(`
            INSERT INTO companies (
                company_name, country, company_profile, identification_code,
                legal_address, website, status, comment, contact_persons,
                selected_exhibitions, created_by_user_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            company_name, country, company_profile, identification_code,
            legal_address, website, status || 'აქტიური', comment,
            JSON.stringify(contact_persons || []), 
            JSON.stringify(selected_exhibitions || []), created_by_user_id
        ]);

        const company = result.rows[0];
        company.contact_persons = company.contact_persons ? JSON.parse(company.contact_persons) : [];
        company.selected_exhibitions = company.selected_exhibitions ? JSON.parse(company.selected_exhibitions) : [];

        res.status(201).json({
            message: 'კომპანია წარმატებით შეიქმნა',
            company
        });
    } catch (error) {
        console.error('კომპანიის შექმნის შეცდომა:', error);

        if (error.code === '23505') {
            return res.status(409).json({ message: 'კომპანია ამ კოდით უკვე არსებობს' });
        }

        res.status(500).json({ message: 'კომპანიის შექმნა ვერ მოხერხდა' });
    }
});

// PUT: კომპანიის განახლება
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        company_name,
        country,
        company_profile,
        identification_code,
        legal_address,
        website,
        status,
        comment,
        contact_persons,
        selected_exhibitions
    } = req.body;

    // თუ მხოლოდ selected_exhibitions არის გადმოცემული, განვაახლოთ მხოლოდ ის
    if (Object.keys(req.body).length === 1 && req.body.hasOwnProperty('selected_exhibitions')) {
        try {
            let sanitizedExhibitions = [];
            if (selected_exhibitions) {
                if (Array.isArray(selected_exhibitions)) {
                    sanitizedExhibitions = selected_exhibitions.filter(id => 
                        Number.isInteger(Number(id))
                    ).map(id => Number(id));
                }
            }

            const result = await db.query(`
                UPDATE companies SET
                    selected_exhibitions = $1,
                    updated_by_user_id = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `, [JSON.stringify(sanitizedExhibitions), req.user.id, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'კომპანია ვერ მოიძებნა' });
            }

            const company = result.rows[0];
            company.selected_exhibitions = sanitizedExhibitions;

            return res.json({
                message: 'გამოფენები წარმატებით განახლდა',
                company
            });
        } catch (error) {
            console.error('გამოფენების განახლების შეცდომა:', error);
            return res.status(500).json({ message: 'გამოფენების განახლება ვერ მოხერხდა' });
        }
    }

    const updated_by_user_id = req.user ? req.user.id : null;

    try {
        // Validate and sanitize contact_persons
        let sanitizedContactPersons = [];
        if (contact_persons) {
            if (Array.isArray(contact_persons)) {
                sanitizedContactPersons = contact_persons.filter(person => 
                    person && typeof person === 'object' && person.name
                );
            } else if (typeof contact_persons === 'string') {
                try {
                    const parsed = JSON.parse(contact_persons);
                    if (Array.isArray(parsed)) {
                        sanitizedContactPersons = parsed.filter(person => 
                            person && typeof person === 'object' && person.name
                        );
                    }
                } catch (e) {
                    console.error('Error parsing contact_persons:', e);
                    sanitizedContactPersons = [];
                }
            }
        }

        // Validate and sanitize selected_exhibitions
        let sanitizedExhibitions = [];
        if (selected_exhibitions) {
            if (Array.isArray(selected_exhibitions)) {
                sanitizedExhibitions = selected_exhibitions.filter(id => 
                    Number.isInteger(Number(id))
                ).map(id => Number(id));
            } else if (typeof selected_exhibitions === 'string') {
                try {
                    const parsed = JSON.parse(selected_exhibitions);
                    if (Array.isArray(parsed)) {
                        sanitizedExhibitions = parsed.filter(id => 
                            Number.isInteger(Number(id))
                        ).map(id => Number(id));
                    }
                } catch (e) {
                    console.error('Error parsing selected_exhibitions:', e);
                    sanitizedExhibitions = [];
                }
            }
        }

        const result = await db.query(`
            UPDATE companies SET
                company_name = $1,
                country = $2,
                company_profile = $3,
                identification_code = $4,
                legal_address = $5,
                website = $6,
                status = $7,
                comment = $8,
                contact_persons = $9,
                selected_exhibitions = $10,
                updated_by_user_id = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [
            company_name, country, company_profile, identification_code,
            legal_address, website, status, comment,
            JSON.stringify(sanitizedContactPersons), 
            JSON.stringify(sanitizedExhibitions), updated_by_user_id, id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'კომპანია ვერ მოიძებნა' });
        }

        const company = result.rows[0];

        // PostgreSQL returns JSON data as parsed objects, not strings
        // Handle contact_persons
        if (!company.contact_persons || !Array.isArray(company.contact_persons)) {
            company.contact_persons = [];
        }

        // Handle selected_exhibitions  
        if (!company.selected_exhibitions || !Array.isArray(company.selected_exhibitions)) {
            company.selected_exhibitions = [];
        } else {
            // Ensure all exhibition IDs are numbers
            company.selected_exhibitions = company.selected_exhibitions.map(id => Number(id));
        }

        res.json({
            message: 'კომპანია წარმატებით განახლდა',
            company
        });
    } catch (error) {
        console.error('კომპანიის განახლების შეცდომა:', error);
        res.status(500).json({ message: 'კომპანიის განახლება ვერ მოხერხდა' });
    }
});

// DELETE: კომპანიის წაშლა
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'კომპანია ვერ მოიძებნა' });
        }

        res.json({ message: 'კომპანია წარმატებით წაიშალა' });
    } catch (error) {
        console.error('კომპანიის წაშლის შეცდომა:', error);
        res.status(500).json({ message: 'კომპანიის წაშლა ვერ მოხერხდა' });
    }
});

module.exports = router;