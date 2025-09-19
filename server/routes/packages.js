
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token არ არის მოწოდებული' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ message: 'არასწორი token' });
    }
    req.user = user;
    next();
  });
};

// GET /api/packages/:exhibitionId - გამოფენის პაკეტების მიღება
router.get('/:exhibitionId', async (req, res) => {
  try {
    const { exhibitionId } = req.params;
    
    const result = await db.query(`
      SELECT 
        ep.*,
        json_agg(
          json_build_object(
            'equipment_id', pe.equipment_id,
            'quantity', pe.quantity,
            'code_name', e.code_name,
            'price', e.price
          )
        ) FILTER (WHERE pe.equipment_id IS NOT NULL) as equipment_list
      FROM exhibition_packages ep
      LEFT JOIN package_equipment pe ON ep.id = pe.package_id
      LEFT JOIN equipment e ON pe.equipment_id = e.id
      WHERE ep.exhibition_id = $1 AND ep.is_active = true
      GROUP BY ep.id
      ORDER BY ep.created_at DESC
    `, [exhibitionId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('პაკეტების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'პაკეტების მიღება ვერ მოხერხდა' });
  }
});

// POST /api/packages - ახალი პაკეტის შექმნა
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      exhibition_id, 
      package_name, 
      description, 
      fixed_area_sqm, 
      fixed_price, 
      equipment_list
    } = req.body;
    const userId = req.user.id;

    console.log('Creating package with data:', {
      exhibition_id, package_name, description, fixed_area_sqm, fixed_price, userId
    });

    // Validate required fields
    if (!exhibition_id || !package_name || !fixed_area_sqm || !fixed_price) {
      return res.status(400).json({ message: 'სავალდებულო ველები არ არის შევსებული' });
    }

    // Check if exhibition_packages table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'exhibition_packages'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({ 
        message: 'პაკეტების ცხრილი არ არსებობს. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.' 
      });
    }

    // პაკეტის შექმნა - simplified insert with only core fields
    const packageResult = await db.query(
      `INSERT INTO exhibition_packages 
       (exhibition_id, package_name, description, fixed_area_sqm, fixed_price, created_by_user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [exhibition_id, package_name, description || '', parseFloat(fixed_area_sqm), parseFloat(fixed_price), userId]
    );

    const packageId = packageResult.rows[0].id;
    console.log('Package created with ID:', packageId);

    // აღჭურვილობის დამატება
    if (equipment_list && equipment_list.length > 0) {
      console.log('Adding equipment to package:', equipment_list);
      for (const equipment of equipment_list) {
        if (equipment.equipment_id && equipment.quantity > 0) {
          await db.query(
            `INSERT INTO package_equipment (package_id, equipment_id, quantity) 
             VALUES ($1, $2, $3)`,
            [packageId, equipment.equipment_id, parseInt(equipment.quantity)]
          );
        }
      }
    }

    res.status(201).json({
      message: 'პაკეტი წარმატებით შეიქმნა!',
      package: packageResult.rows[0]
    });
  } catch (error) {
    console.error('❌ პაკეტის შექმნის შეცდომა:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    let errorMessage = 'პაკეტის შექმნა ვერ მოხერხდა';
    
    if (error.code === '23503') {
      errorMessage = 'არასწორი exhibition_id ან user_id';
    } else if (error.code === '42P01') {
      errorMessage = 'მონაცემთა ბაზის ცხრილი არ არსებობს';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
});

// PUT /api/packages/:id - პაკეტის განახლება
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      package_name, 
      description, 
      fixed_area_sqm, 
      fixed_price, 
      equipment_list 
    } = req.body;
    const userId = req.user.id;

    // პაკეტის განახლება
    const packageResult = await db.query(
      `UPDATE exhibition_packages 
       SET package_name = $1, description = $2, fixed_area_sqm = $3, 
           fixed_price = $4, updated_by_user_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [package_name, description, fixed_area_sqm, fixed_price, userId, id]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ message: 'პაკეტი ვერ მოიძებნა' });
    }

    // ძველი აღჭურვილობის წაშლა
    await db.query('DELETE FROM package_equipment WHERE package_id = $1', [id]);

    // ახალი აღჭურვილობის დამატება
    if (equipment_list && equipment_list.length > 0) {
      for (const equipment of equipment_list) {
        await db.query(
          `INSERT INTO package_equipment (package_id, equipment_id, quantity) 
           VALUES ($1, $2, $3)`,
          [id, equipment.equipment_id, equipment.quantity]
        );
      }
    }

    res.json({
      message: 'პაკეტი წარმატებით განახლდა!',
      package: packageResult.rows[0]
    });
  } catch (error) {
    console.error('პაკეტის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'პაკეტის განახლება ვერ მოხერხდა' });
  }
});

// DELETE /api/packages/:id - პაკეტის წაშლა
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query('UPDATE exhibition_packages SET is_active = false WHERE id = $1', [id]);
    
    res.json({ message: 'პაკეტი წარმატებით გაუქმდა!' });
  } catch (error) {
    console.error('პაკეტის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'პაკეტის წაშლა ვერ მოხერხდა' });
  }
});

// GET /api/packages/equipment/availability/:eventId - აღჭურვილობის ხელმისაწვდომობა
router.get('/equipment/availability/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // ივენთის თარიღების მიღება
    const eventResult = await db.query(
      'SELECT start_date, end_date FROM annual_services WHERE id = $1',
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'ივენთი ვერ მოიძებნა' });
    }
    
    const { start_date, end_date } = eventResult.rows[0];
    
    // ყველა აღჭურვილობის მიღება
    const equipmentResult = await db.query('SELECT * FROM equipment ORDER BY code_name');
    
    // ბუკირების გამოთვლა
    const availabilityPromises = equipmentResult.rows.map(async (equipment) => {
      const bookedResult = await db.query(`
        SELECT COALESCE(SUM(pse.quantity), 0) as booked_quantity
        FROM participant_selected_equipment pse
        JOIN event_participants ep ON pse.participant_id = ep.id
        JOIN annual_services ae ON ep.event_id = ae.id
        WHERE pse.equipment_id = $1 
        AND (
          (ae.start_date <= $2 AND ae.end_date >= $2) OR
          (ae.start_date <= $3 AND ae.end_date >= $3) OR
          (ae.start_date >= $2 AND ae.end_date <= $3)
        )
      `, [equipment.id, start_date, end_date]);
      
      const bookedQuantity = parseInt(bookedResult.rows[0].booked_quantity) || 0;
      const availableQuantity = equipment.quantity - bookedQuantity;
      
      return {
        ...equipment,
        booked_quantity: bookedQuantity,
        available_quantity: Math.max(0, availableQuantity)
      };
    });

    const equipmentWithAvailability = await Promise.all(availabilityPromises);
    res.json(equipmentWithAvailability);
    
  } catch (error) {
    console.error('ხელმისაწვდომობის გამოთვლის შეცდომა:', error);
    res.status(500).json({ message: 'ხელმისაწვდომობის გამოთვლა ვერ მოხერხდა' });
  }
});

// POST /api/packages/bundles - ბანდლ პაკეტის შექმნა
router.post('/bundles', authenticateToken, async (req, res) => {
  try {
    const { exhibition_id, bundle_name, description, package_ids, discount_percent } = req.body;
    const userId = req.user.id;

    // ბანდლის შექმნა
    const bundleResult = await db.query(
      `INSERT INTO package_bundles 
       (exhibition_id, bundle_name, description, discount_percent, created_by_user_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [exhibition_id, bundle_name, description, discount_percent, userId]
    );

    const bundleId = bundleResult.rows[0].id;

    // ბანდლში პაკეტების დამატება
    for (const packageId of package_ids) {
      await db.query(
        `INSERT INTO bundle_packages (bundle_id, package_id) VALUES ($1, $2)`,
        [bundleId, packageId]
      );
    }

    res.status(201).json({
      message: 'ბანდლი წარმატებით შეიქმნა!',
      bundle: bundleResult.rows[0]
    });
  } catch (error) {
    console.error('ბანდლის შექმნის შეცდომა:', error);
    res.status(500).json({ message: 'ბანდლის შექმნა ვერ მოხერხდა' });
  }
});

// GET /api/packages/current-price/:packageId - დინამიური ფასის გამოთვლა
router.get('/current-price/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    
    const packageResult = await db.query(
      'SELECT * FROM exhibition_packages WHERE id = $1',
      [packageId]
    );
    
    if (packageResult.rows.length === 0) {
      return res.status(404).json({ message: 'პაკეტი ვერ მოიძებნა' });
    }
    
    const pkg = packageResult.rows[0];
    const currentDate = new Date();
    let currentPrice = pkg.fixed_price;
    let priceType = 'regular';
    
    // Early bird pricing
    if (pkg.early_bird_price && pkg.early_bird_end_date) {
      if (currentDate <= new Date(pkg.early_bird_end_date)) {
        currentPrice = pkg.early_bird_price;
        priceType = 'early_bird';
      }
    }
    
    // Last minute pricing
    if (pkg.last_minute_price && pkg.last_minute_start_date) {
      if (currentDate >= new Date(pkg.last_minute_start_date)) {
        currentPrice = pkg.last_minute_price;
        priceType = 'last_minute';
      }
    }
    
    res.json({
      package_id: packageId,
      current_price: currentPrice,
      price_type: priceType,
      regular_price: pkg.fixed_price,
      early_bird_price: pkg.early_bird_price,
      last_minute_price: pkg.last_minute_price
    });
  } catch (error) {
    console.error('ფასის გამოთვლის შეცდომა:', error);
    res.status(500).json({ message: 'ფასის გამოთვლა ვერ მოხერხდა' });
  }
});

// GET /api/packages/compare/:exhibitionId - პაკეტების შედარება
router.get('/compare/:exhibitionId', async (req, res) => {
  try {
    const { exhibitionId } = req.params;
    
    const result = await db.query(`
      SELECT 
        ep.*,
        json_agg(
          json_build_object(
            'equipment_id', pe.equipment_id,
            'quantity', pe.quantity,
            'code_name', e.code_name,
            'price', e.price
          )
        ) FILTER (WHERE pe.equipment_id IS NOT NULL) as equipment_list
      FROM exhibition_packages ep
      LEFT JOIN package_equipment pe ON ep.id = pe.package_id
      LEFT JOIN equipment e ON pe.equipment_id = e.id
      WHERE ep.exhibition_id = $1 AND ep.is_active = true
      GROUP BY ep.id
      ORDER BY ep.fixed_price ASC
    `, [exhibitionId]);
    
    // დინამიური ფასების დამატება
    const packagesWithPricing = await Promise.all(
      result.rows.map(async (pkg) => {
        const currentDate = new Date();
        let currentPrice = pkg.fixed_price;
        let priceType = 'regular';
        
        if (pkg.early_bird_price && pkg.early_bird_end_date) {
          if (currentDate <= new Date(pkg.early_bird_end_date)) {
            currentPrice = pkg.early_bird_price;
            priceType = 'early_bird';
          }
        }
        
        if (pkg.last_minute_price && pkg.last_minute_start_date) {
          if (currentDate >= new Date(pkg.last_minute_start_date)) {
            currentPrice = pkg.last_minute_price;
            priceType = 'last_minute';
          }
        }
        
        return {
          ...pkg,
          current_price: currentPrice,
          price_type: priceType
        };
      })
    );
    
    res.json(packagesWithPricing);
  } catch (error) {
    console.error('შედარების მონაცემების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'შედარების მონაცემები ვერ მოიძებნა' });
  }
});

module.exports = router;
