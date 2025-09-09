
const db = require('./db');

async function addSampleCompanies() {
  try {
    const companies = [
      {
        name: 'Test Company 1',
        country: 'Georgia',
        profile: 'Technology',
        code: 'TC001',
        status: 'აქტიური'
      },
      {
        name: 'Test Company 2',
        country: 'Germany',
        profile: 'Manufacturing',
        code: 'TC002',
        status: 'აქტიური'
      },
      {
        name: 'Test Company 3',
        country: 'United States',
        profile: 'Services',
        code: 'TC003',
        status: 'აქტიური'
      }
    ];

    for (const company of companies) {
      await db.query(`
        INSERT INTO companies (
          company_name, country, company_profile, identification_code,
          status, contact_persons, selected_exhibitions, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (identification_code) DO NOTHING
      `, [
        company.name,
        company.country,
        company.profile,
        company.code,
        company.status,
        '[]',
        '[]'
      ]);
      console.log('Added company:', company.name);
    }
    
    console.log('Sample companies added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample companies:', error);
    process.exit(1);
  }
}

addSampleCompanies();
