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

      let standWithDetails = {
        id: participant.participant_id,
        booth_number: participant.booth_number || `B-${participant.participant_id}`,
        company_name: participant.company_name,
        area: parseFloat(participant.area) || 0,
        status: participant.status === 'გადახდილი' ? 'დასრულებული' : 
                participant.status === 'მომლოდინე' ? 'დაგეგმილი' : 'დაგეგმილი',
        booth_category: participant.booth_category || 'ოქტანორმის სტენდები',
        booth_type: participant.booth_type || 'რიგითი',
        notes: participant.notes,
        contact_person: participant.contact_person,
        contact_phone: participant.contact_phone,
        contact_email: participant.contact_email,
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
            e.price as equipment_price
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
            sd.*,
            u.username as uploaded_by_username
          FROM stand_designs sd
          LEFT JOIN users u ON sd.uploaded_by_user_id = u.id
          WHERE sd.stand_id = $1
          ORDER BY sd.uploaded_at DESC
        `, [participant.participant_id]);

        console.log(`🎨 მონაწილისთვის ${participant.company_name} ნაპოვნი დიზაინის ფაილები: ${designResult.rows.length}`);

        stand_designs = designResult.rows.map(design => ({
          design_id: design.id,
          design_url: design.design_file_url,
          description: design.description,
          uploaded_at: design.uploaded_at,
          uploaded_by: design.uploaded_by_username || 'უცნობი'
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

// GET: ყველა სტენდი
router.get('/stands', authenticateToken, async (req, res) => {
  try {
    console.log('🏗️ ყველა სტენდის მიღება');

    const result = await db.query(`
      SELECT s.*, e.service_name as event_name
      FROM stands s
      LEFT JOIN annual_services e ON s.event_id = e.id
      ORDER BY s.created_at DESC
    `);

    console.log(`✅ მოიძებნა ${result.rows.length} სტენდი`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ სტენდების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სტენდების მიღება ვერ მოხერხდა', error: error.message });
  }
});

// GET: კონკრეტული სტენდის მიღება
router.get('/events/:eventId/stands/:standId', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდის მიღება ID: ${req.params.standId}`);

    const result = await db.query(`
      SELECT s.*, e.service_name as event_name, e.start_date as event_start, e.end_date as event_end
      FROM stands s
      LEFT JOIN annual_services e ON s.event_id = e.id
      WHERE s.id = $1 AND s.event_id = $2
    `, [req.params.standId, req.params.eventId]);

    if (result.rows.length === 0) {
      console.log('❌ სტენდი არ მოიძებნა');
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    console.log('✅ სტენდი მოიძებნა');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ სტენდის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'სტენდის მიღება ვერ მოხერხდა', error: error.message });
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
          design_file_url VARCHAR(500),
          description TEXT,
          uploaded_by_user_id INTEGER REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ stand_designs table ready');
    } catch (tableError) {
      console.log('stand_designs ცხრილი უკვე არსებობს');
    }

    for (const file of req.files) {
      const fileUrl = `/uploads/stands/${file.filename}`;

      const result = await db.query(`
        INSERT INTO stand_designs (stand_id, design_file_url, description, uploaded_by_user_id)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [standId, fileUrl, description || file.originalname, userId]);

      uploadedFiles.push(result.rows[0]);
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
    const designFiles = await db.query(`
      SELECT 
        sd.*,
        u.username as uploaded_by_username
      FROM stand_designs sd
      LEFT JOIN users u ON sd.uploaded_by_user_id = u.id
      WHERE sd.stand_id = $1
      ORDER BY sd.uploaded_at DESC
    `, [standId]);

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
    const standCheck = await db.query('SELECT id FROM stands WHERE id = $1 AND event_id = $2', 
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
      INSERT INTO stand_equipment (stand_id, equipment_id, quantity, notes, assigned_by_user_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [standId, equipment_id, quantity, notes || null, userId]);

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

// POST: ახალი სტენდის დამატება
router.post('/events/:eventId/stands', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ ახალი სტენდის დამატება ივენთისთვის ID: ${req.params.eventId}`);
    console.log('📝 მიღებული მონაცემები:', req.body);

    const {
      booth_number,
      company_name,
      area,
      contact_person,
      contact_phone,
      contact_email,
      status = 'დაგეგმილი',
      notes
    } = req.body;

    // სავალდებულო ველების შემოწმება
    if (!booth_number || !company_name || !area) {
      return res.status(400).json({ 
        message: 'სტენდის ნომერი, კომპანიის სახელი და ფართობი სავალდებულოა' 
      });
    }

    // ივენთის არსებობის შემოწმება
    const eventCheck = await db.query('SELECT id FROM annual_services WHERE id = $1', [req.params.eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი არ მოიძებნა' });
    }

    // სტენდის ნომრის უნიკალურობის შემოწმება ამ ივენთისთვის
    const existingStand = await db.query('SELECT id FROM stands WHERE booth_number = $1 AND event_id = $2', 
      [booth_number, req.params.eventId]);

    if (existingStand.rows.length > 0) {
      console.log('❌ სტენდი უკვე არსებობს ამ ნომრით');
      return res.status(400).json({ message: 'სტენდი ამ ნომრით უკვე არსებობს ამ ივენთზე' });
    }

    const result = await db.query(`
      INSERT INTO stands (
        event_id, booth_number, company_name, area,
        contact_person, contact_phone, contact_email,
        status, notes, created_at, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      RETURNING *
    `, [
      req.params.eventId,
      booth_number,
      company_name,
      parseFloat(area),
      contact_person || null,
      contact_phone || null,
      contact_email || null,
      status,
      notes || null,
      req.user.id
    ]);

    console.log('✅ სტენდი წარმატებით დაემატა');
    res.status(201).json({
      message: 'სტენდი წარმატებით დაემატა',
      stand: result.rows[0]
    });
  } catch (error) {
    console.error('❌ სტენდის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'სტენდის დამატება ვერ მოხერხდა', error: error.message });
  }
});

// PUT: სტენდის განახლება
router.put('/events/:eventId/stands/:standId', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდის განახლება ID: ${req.params.standId}`);
    console.log('📝 განსაახლებელი მონაცემები:', req.body);

    const {
      booth_number,
      company_name,
      area,
      contact_person,
      contact_phone,
      contact_email,
      status,
      notes
    } = req.body;

    // სტენდის არსებობის შემოწმება
    const existingStand = await db.query('SELECT * FROM stands WHERE id = $1 AND event_id = $2', 
      [req.params.standId, req.params.eventId]);

    if (existingStand.rows.length === 0) {
      console.log('❌ სტენდი არ მოიძებნა');
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    // სტენდის ნომრის უნიკალურობის შემოწმება (გარდა მიმდინარე სტენდისა)
    if (booth_number && booth_number !== existingStand.rows[0].booth_number) {
      const duplicateCheck = await db.query('SELECT id FROM stands WHERE booth_number = $1 AND event_id = $2 AND id != $3', 
        [booth_number, req.params.eventId, req.params.standId]);

      if (duplicateCheck.rows.length > 0) {
        console.log('❌ სტენდი უკვე არსებობს ამ ნომრით');
        return res.status(400).json({ message: 'სტენდი ამ ნომრით უკვე არსებობს ამ ივენთზე' });
      }
    }

    const result = await db.query(`
      UPDATE stands SET
        booth_number = COALESCE($1, booth_number),
        company_name = COALESCE($2, company_name),
        area = COALESCE($3, area),
        contact_person = COALESCE($4, contact_person),
        contact_phone = COALESCE($5, contact_phone),
        contact_email = COALESCE($6, contact_email),
        status = COALESCE($7, status),
        notes = COALESCE($8, notes),
        updated_at = NOW()
      WHERE id = $9 AND event_id = $10
      RETURNING *
    `, [
      booth_number || null,
      company_name || null,
      area ? parseFloat(area) : null,
      contact_person || null,
      contact_phone || null,
      contact_email || null,
      status || null,
      notes || null,
      req.params.standId,
      req.params.eventId
    ]);

    console.log('✅ სტენდი წარმატებით განახლდა');
    res.json({
      message: 'სტენდი წარმატებით განახლდა',
      stand: result.rows[0]
    });
  } catch (error) {
    console.error('❌ სტენდის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'სტენდის განახლება ვერ მოხერხდა', error: error.message });
  }
});

// PATCH: სტენდის სტატუსის განახლება
router.patch('/events/:eventId/stands/:standId/status', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდის სტატუსის განახლება ID: ${req.params.standId}`);
    console.log('📝 ახალი სტატუსი:', req.body.status);

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'სტატუსი სავალდებულოა' });
    }

    // Update in event_participants table instead of stands table
    const result = await db.query(`
      UPDATE event_participants SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2 AND event_id = $3
      RETURNING *
    `, [status, req.params.standId, req.params.eventId]);

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

// DELETE: სტენდის წაშლა
router.delete('/events/:eventId/stands/:standId', authenticateToken, async (req, res) => {
  try {
    console.log(`🏗️ სტენდის წაშლა ID: ${req.params.standId}`);

    // სტენდის არსებობის შემოწმება
    const existingStand = await db.query('SELECT * FROM stands WHERE id = $1 AND event_id = $2', 
      [req.params.standId, req.params.eventId]);

    if (existingStand.rows.length === 0) {
      console.log('❌ სტენდი არ მოიძებნა');
      return res.status(404).json({ message: 'სტენდი არ მოიძებნა' });
    }

    // სტენდის წაშლა ბაზიდან
    const result = await db.query('DELETE FROM stands WHERE id = $1 AND event_id = $2 RETURNING *', 
      [req.params.standId, req.params.eventId]);

    console.log('✅ სტენდი წარმატებით წაიშალა');
    res.json({
      message: 'სტენდი წარმატებით წაიშალა',
      deletedStand: result.rows[0]
    });
  } catch (error) {
    console.error('❌ სტენდის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'სტენდის წაშლა ვერ მოხერხდა', error: error.message });
  }
});

// GET: სტენდების სტატისტიკა
router.get('/events/:eventId/stands/statistics', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 სტენდების სტატისტიკა ივენთისთვის ID: ${req.params.eventId}`);

    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(area) as total_area
      FROM stands 
      WHERE event_id = $1 
      GROUP BY status
      ORDER BY count DESC
    `, [req.params.eventId]);

    const totalStands = await db.query('SELECT COUNT(*) as total, SUM(area) as total_area FROM stands WHERE event_id = $1', 
      [req.params.eventId]);

    console.log('✅ სტენდების სტატისტიკა მიღებულია');
    res.json({
      totalStands: parseInt(totalStands.rows[0].total),
      totalArea: parseFloat(totalStands.rows[0].total_area) || 0,
      statusBreakdown: stats.rows
    });
  } catch (error) {
    console.error('❌ სტენდების სტატისტიკის შეცდომა:', error);
    res.status(500).json({ message: 'სტენდების სტატისტიკის მიღება ვერ მოხერხდა', error: error.message });
  }
});

module.exports = router;