const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// JWT მიდლვერი
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'ავტორიზაციის ტოკენი არ არის მოწოდებული.' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'არასწორი ან ვადაგასული ავტორიზაციის ტოკენი.' });
        }
        req.user = user;
        next();
    });
}

// ფაილების ატვირთვის კონფიგურაცია
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/stands');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'design-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.dwg', '.3ds'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('მხარდაჭერილია მხოლოდ JPG, PNG, PDF, DWG, 3DS ფაილები'), false);
    }
  }
});

// GET: ყველა სტენდის მიღება კონკრეტული ივენთისთვის - მონაწილეებიდან
router.get('/events/:eventId/stands', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდების მიღება ივენთისთვის ID: ${req.params.eventId}`);

    // Get stands data from event participants with full area and booth info
    const result = await db.query(`
      SELECT 
        ep.id as participant_id,
        COALESCE(ep.area, ep.booth_size, 0) as area,
        ep.booth_category,
        ep.booth_type,
        ep.booth_number,
        ep.status,
        ep.notes,
        ep.created_at,
        ep.contact_person,
        ep.contact_phone,
        ep.contact_email,
        ep.price_per_sqm,
        ep.total_price,
        c.company_name,
        c.contact_persons,
        c.company_phone,
        c.company_email,
        c.country,
        c.identification_code,
        c.company_profile,
        c.legal_address,
        c.website,
        c.status as company_status,
        c.comment,
        e.service_name as event_name,
        e.start_date as event_start,
        e.end_date as event_end
      FROM event_participants ep
      JOIN companies c ON ep.company_id = c.id
      LEFT JOIN annual_services e ON ep.event_id = e.id
      WHERE ep.event_id = $1
      ORDER BY c.company_name ASC
    `, [req.params.eventId]);

    console.log(`📊 ნაპოვნი მონაწილეები: ${result.rows.length}`);

    const standsWithDetails = [];

    for (const participant of result.rows) {
      console.log(`📝 მონაწილე: ${participant.company_name}, ფართობი: ${participant.area}`);

      // Parse company contact persons if available
      let companyContactPersons = [];
      try {
        if (participant.contact_persons && participant.contact_persons !== 'null') {
          if (typeof participant.contact_persons === 'string') {
            companyContactPersons = JSON.parse(participant.contact_persons);
          } else if (Array.isArray(participant.contact_persons)) {
            companyContactPersons = participant.contact_persons;
          }
        }
      } catch (e) {
        console.log('Error parsing contact_persons:', e.message);
        companyContactPersons = [];
      }

      // Get primary contact person from company if not set in participant
      let primaryContactPerson = participant.contact_person;
      let primaryContactPhone = participant.contact_phone;
      let primaryContactEmail = participant.contact_email;

      if (!primaryContactPerson && companyContactPersons.length > 0) {
        const firstContact = companyContactPersons[0];
        primaryContactPerson = firstContact.name || '';
        primaryContactPhone = firstContact.phone || participant.company_phone || '';
        primaryContactEmail = firstContact.email || participant.company_email || '';
      }

      // Debug participant status
      console.log(`📊 მონაწილის სტატუსი (raw): "${participant.status}"`);
      console.log(`📊 მონაწილის სტატუსი (type): ${typeof participant.status}`);
      
      // Map participant status to stand status
      let mappedStatus;
      if (participant.status === 'გადახდილი') {
        mappedStatus = 'დასრულებული';
      } else if (participant.status === 'მომლოდინე') {
        mappedStatus = 'დაგეგმილი';
      } else if (participant.status === 'დადასტურებული') {
        mappedStatus = 'დიზაინის ეტაპი';
      } else if (participant.status === 'შეუქმებული') {
        mappedStatus = 'მშენებლობა დაწყებული';
      } else if (participant.status === 'დიზაინის ეტაპი') {
        mappedStatus = 'დიზაინის ეტაპი';
      } else if (participant.status === 'მშენებლობა დაწყებული') {
        mappedStatus = 'მშენებლობა დაწყებული';
      } else if (participant.status === 'მშენებლობა მიმდინარეობს') {
        mappedStatus = 'მშენებლობა მიმდინარეობს';
      } else if (participant.status === 'ჩაბარებული') {
        mappedStatus = 'ჩაბარებული';
      } else {
        mappedStatus = participant.status || 'დაგეგმილი'; // use original status or default
      }
      
      console.log(`📊 მაპირებული სტატუსი: "${mappedStatus}"`);

      let standWithDetails = {
        id: participant.participant_id,
        booth_number: participant.booth_number || `B-${participant.participant_id}`,
        company_name: participant.company_name,
        area: parseFloat(participant.area) || 0,
        status: mappedStatus,
        booth_category: participant.booth_category || 'ოქტანორმის სტენდები',
        booth_type: participant.booth_type || 'რიგითი',
        notes: participant.notes,
        contact_person: primaryContactPerson,
        contact_phone: primaryContactPhone,
        contact_email: primaryContactEmail,
        company_contact_person: primaryContactPerson || (companyContactPersons[0] && companyContactPersons[0].name) || '',
        company_phone: participant.company_phone || '',
        company_email: participant.company_email || '',
        company_contact_persons: companyContactPersons,
        price_per_sqm: parseFloat(participant.price_per_sqm) || 0,
        total_price: parseFloat(participant.total_price) || 0,
        created_at: participant.created_at,
        event_name: participant.event_name,
        event_start: participant.event_start,
        event_end: participant.event_end
      };

      // Get equipment bookings for this participant
      let stand_equipment = [];
      try {
        const equipmentResult = await db.query(`
          SELECT 
            eb.equipment_id,
            eb.quantity,
            eb.booking_date,
            e.code_name as equipment_name,
            e.description as equipment_description,
            e.price as equipment_price,
            e.image_url
          FROM equipment_bookings eb
          JOIN equipment e ON eb.equipment_id = e.id
          WHERE eb.participant_id = $1
          ORDER BY eb.booking_date DESC
        `, [participant.participant_id]);

        console.log(`🔧 მონაწილისთვის ${participant.company_name} ნაპოვნი აღჭურვილობა: ${equipmentResult.rows.length}`);

        stand_equipment = equipmentResult.rows.map(eq => ({
          equipment_id: eq.equipment_id,
          equipment_name: eq.equipment_name || eq.code_name || 'უცნობი აღჭურვილობა',
          equipment_description: eq.equipment_description || 'აღწერა არ არის',
          equipment_price: parseFloat(eq.equipment_price) || 0,
          quantity: parseInt(eq.quantity) || 0,
          booking_date: eq.booking_date,
          image_url: eq.image_url || null,
          total_equipment_price: (parseFloat(eq.equipment_price) || 0) * (parseInt(eq.quantity) || 0)
        }));
      } catch (equipError) {
        console.log('⚠️ აღჭურვილობის მიღების შეცდომა:', equipError.message);
        stand_equipment = [];
      }

      standWithDetails.stand_equipment = stand_equipment;

      // Get design files for this participant
      let stand_designs = [];
      try {
        const designResult = await db.query(`
          SELECT 
            sd.id,
            sd.design_file_url,
            sd.description,
            COALESCE(sd.uploaded_at, CURRENT_TIMESTAMP) as uploaded_at
          FROM stand_designs sd
          WHERE sd.stand_id = $1
          ORDER BY COALESCE(sd.uploaded_at, CURRENT_TIMESTAMP) DESC
        `, [participant.participant_id]);

        console.log(`🎨 მონაწილისთვის ${participant.company_name} ნაპოვნი დიზაინის ფაილები: ${designResult.rows.length}`);

        stand_designs = designResult.rows.map(design => ({
          design_id: design.id,
          design_url: design.design_file_url,
          description: design.description,
          uploaded_at: design.uploaded_at
        }));
      } catch (designError) {
        console.log('⚠️ დიზაინის ფაილების მიღების შეცდომა:', designError.message);
        stand_designs = [];
      }

      standWithDetails.stand_designs = stand_designs;
      standWithDetails.stand_photos = []; // Empty for now - can be populated from file uploads

      standsWithDetails.push(standWithDetails);
    }

    console.log(`✅ მოიძებნა ${standsWithDetails.length} სტენდი`);

    // Debug output with detailed information
    standsWithDetails.forEach(stand => {
      console.log(`📊 სტენდი: ${stand.company_name}`);
      console.log(`   📏 ფართობი: ${stand.area}მ²`);
      console.log(`   🏷️ კატეგორია: ${stand.booth_category}`);
      console.log(`   📋 ტიპი: ${stand.booth_type}`);
      console.log(`   📍 ნომერი: ${stand.booth_number}`);
      console.log(`   📊 სტატუსი: "${stand.status}"`);
      console.log(`   🔧 აღჭურვილობა: ${stand.stand_equipment.length} ნივთი`);

      stand.stand_equipment.forEach((eq, index) => {
        console.log(`      ${index + 1}. ${eq.equipment_name} - ${eq.quantity} ცალი × €${eq.equipment_price} = €${eq.total_equipment_price}`);
      });
    });

    res.json(standsWithDetails);
  } catch (error) {
    console.error('❌ სტენდების მიღების შეცდომა:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'სტენდების მიღება ვერ მოხერხდა', error: error.message });
  }
});

// POST: სტენდის დიზაინის ფაილების ატვირთვა
router.post('/events/:eventId/stands/:standId/design', authenticateToken, upload.array('design_files', 10), async (req, res) => {
  try {
    console.log(`🎨 დიზაინის ფაილების ატვირთვა სტენდისთვის ID: ${req.params.standId}`);
    console.log('📁 მიღებული ფაილები:', req.files);
    console.log('📝 მიღებული body:', req.body);

    const { description } = req.body;
    const standId = req.params.standId;
    const eventId = req.params.eventId;
    const userId = req.user.id;

    // Ensure uploads/stands directory exists
    const standsUploadDir = path.join(__dirname, '../uploads/stands');
    if (!fs.existsSync(standsUploadDir)) {
      fs.mkdirSync(standsUploadDir, { recursive: true });
      console.log('✅ Created uploads/stands directory');
    }

    // შევამოწმოთ არსებობს თუ არა სტენდი event_participants ცხრილში
    const standCheck = await db.query('SELECT id FROM event_participants WHERE id = $1 AND event_id = $2', 
      [standId, eventId]);

    if (standCheck.rows.length === 0) {
      console.log('❌ სტენდი არ მოიძებნა event_participants ცხრილში');
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    const uploadedFiles = [];

    if (!req.files || req.files.length === 0) {
      console.log('❌ ფაილები არ მოიძებნა request-ში');
      return res.status(400).json({ message: 'ფაილები არ არის ატვირთული' });
    }

    // Create stand_designs table if it doesn't exist
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS stand_designs (
          id SERIAL PRIMARY KEY,
          stand_id INTEGER REFERENCES event_participants(id) ON DELETE CASCADE,
          design_file_url VARCHAR(500) NOT NULL,
          description TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ stand_designs table ready');
    } catch (tableError) {
      console.log('stand_designs ცხრილი უკვე არსებობს');
    }

    for (const file of req.files) {
      const fileUrl = `/uploads/stands/${file.filename}`;

      // Insert into stand_designs table
        const designResult = await db.query(`
          INSERT INTO stand_designs (stand_id, design_file_url, description)
          VALUES ($1, $2, $3) RETURNING *
        `, [standId, fileUrl, description || file.originalname]);

      uploadedFiles.push(designResult.rows[0]);
      console.log(`✅ ფაილი შენახულია: ${fileUrl}`);
    }

    console.log('✅ დიზაინის ფაილები ატვირთულია');
    res.status(201).json({
      message: 'დიზაინის ფაილები წარმატებით ატვირთულია',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('❌ დიზაინის ფაილების ატვირთვის შეცდომა:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ message: 'დიზაინის ფაილების ატვირთვა ვერ მოხერხდა', error: error.message });
  }
});

// GET: სტენდის დიზაინის ფაილების მიღება
router.get('/events/:eventId/stands/:standId/design', authenticateToken, async (req, res) => {
  try {
    console.log(`🎨 დიზაინის ფაილების მიღება სტენდისთვის ID: ${req.params.standId}`);

    const standId = req.params.standId;
    const eventId = req.params.eventId;

    // შევამოწმოთ არსებობს თუ არა სტენდი
    const standCheck = await db.query('SELECT id FROM event_participants WHERE id = $1 AND event_id = $2', 
      [standId, eventId]);

    if (standCheck.rows.length === 0) {
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    // მივიღოთ დიზაინის ფაილები
    let designFiles;
    try {
      designFiles = await db.query(`
        SELECT 
          sd.id,
          sd.design_file_url,
          sd.description,
          COALESCE(sd.uploaded_at, CURRENT_TIMESTAMP) as uploaded_at
        FROM stand_designs sd
        WHERE sd.stand_id = $1
        ORDER BY COALESCE(sd.uploaded_at, CURRENT_TIMESTAMP) DESC
      `, [standId]);
    } catch (queryError) {
      console.log('⚠️ დიზაინის ფაილების მიღების შეცდომა:', queryError.message);
      designFiles = { rows: [] };
    }

    console.log(`✅ მოიძებნა ${designFiles.rows.length} დიზაინის ფაილი`);
    res.json(designFiles.rows);
  } catch (error) {
    console.error('❌ დიზაინის ფაილების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'დიზაინის ფაილების მიღება ვერ მოხერხდა', error: error.message });
  }
});

// DELETE: სტენდის დიზაინის ფაილის წაშლა
router.delete('/events/:eventId/stands/:standId/design/:designId', authenticateToken, async (req, res) => {
  try {
    console.log(`🗑️ დიზაინის ფაილის წაშლა ID: ${req.params.designId}`);

    const designResult = await db.query('SELECT * FROM stand_designs WHERE id = $1 AND stand_id = $2', 
      [req.params.designId, req.params.standId]);

    if (designResult.rows.length === 0) {
      return res.status(404).json({ message: 'დიზაინის ფაილი არ მოიძებნა' });
    }

    const design = designResult.rows[0];

    // ფაილის წაშლა ფაილსისტემიდან
    if (design.design_file_url) {
      const filePath = path.join(__dirname, '../', design.design_file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // ბაზიდან წაშლა
    await db.query('DELETE FROM stand_designs WHERE id = $1', [req.params.designId]);

    console.log('✅ დიზაინის ფაილი წაშლილია');
    res.json({ message: 'დიზაინის ფაილი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('❌ დიზაინის ფაილის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'დიზაინის ფაილის წაშლა ვერ მოხერხდა', error: error.message });
  }
});

// POST: სტენდზე აღჭურვილობის დამატება
router.post('/events/:eventId/stands/:standId/equipment', authenticateToken, async (req, res) => {
  try {
    console.log(`🔧 აღჭურვილობის დამატება სტენდზე ID: ${req.params.standId}`);

    const { equipment_id, quantity, notes } = req.body;
    const standId = req.params.standId;
    const userId = req.user.id;

    // შევამოწმოთ არსებობს თუ არა სტენდი
    const standCheck = await db.query('SELECT id FROM event_participants WHERE id = $1 AND event_id = $2', 
      [standId, req.params.eventId]);

    if (standCheck.rows.length === 0) {
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    // შევამოწმოთ არსებობს თუ არა აღჭურვილობა
    const equipmentCheck = await db.query('SELECT id, code_name FROM equipment WHERE id = $1', [equipment_id]);

    if (equipmentCheck.rows.length === 0) {
      return res.status(404).json({ message: 'აღჭურვილობა არ მოიძებნა' });
    }

    const result = await db.query(`
      INSERT INTO equipment_bookings (participant_id, equipment_id, quantity, created_by)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [standId, equipment_id, quantity, userId]);

    console.log('✅ აღჭურვილობა დამატებულია სტენდზე');
    res.status(201).json({
      message: 'აღჭურვილობა წარმატებით დამატებულია სტენდზე',
      equipment: result.rows[0]
    });
  } catch (error) {
    console.error('❌ აღჭურვილობის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'აღჭურვილობის დამატება ვერ მოხერხდა', error: error.message });
  }
});

// PATCH: სტენდის სტატუსის განახლება
router.patch('/events/:eventId/stands/:standId/status', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდის სტატუსის განახლება ID: ${req.params.standId}`);
    console.log('📝 მიღებული body:', req.body);
    console.log('📝 stand_status value:', req.body.stand_status);
    console.log('📝 all keys in body:', Object.keys(req.body));

    const { stand_status } = req.body;

    if (!stand_status) {
      console.log('❌ stand_status არ არის ან ცარიელია');
      return res.status(400).json({ message: 'სტატუსი სავალდებულოა' });
    }

    // Update in event_participants table instead of stands table
    const result = await db.query(`
      UPDATE event_participants SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2 AND event_id = $3
      RETURNING *
    `, [stand_status, req.params.standId, req.params.eventId]);

    if (result.rows.length === 0) {
      console.log('❌ სტენდი არ მოიძებნა');
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    console.log('✅ სტენდის სტატუსი განახლდა');
    res.json({
      message: 'სტენდის სტატუსი წარმატებით განახლდა',
      stand: result.rows[0]
    });
  } catch (error) {
    console.error('❌ სტენდის სტატუსის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'სტენდის სტატუსის განახლება ვერ მოხერხდა', error: error.message });
  }
});

module.exports = router;