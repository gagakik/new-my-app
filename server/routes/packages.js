
const express = require('express');
const router = express.Router();
const db = require('../db');

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
router.post('/', async (req, res) => {
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

    // პაკეტის შექმნა
    const packageResult = await db.query(
      `INSERT INTO exhibition_packages 
       (exhibition_id, package_name, description, fixed_area_sqm, fixed_price, created_by_user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [exhibition_id, package_name, description, fixed_area_sqm, fixed_price, userId]
    );

    const packageId = packageResult.rows[0].id;

    // აღჭურვილობის დამატება
    if (equipment_list && equipment_list.length > 0) {
      for (const equipment of equipment_list) {
        await db.query(
          `INSERT INTO package_equipment (package_id, equipment_id, quantity) 
           VALUES ($1, $2, $3)`,
          [packageId, equipment.equipment_id, equipment.quantity]
        );
      }
    }

    res.status(201).json({
      message: 'პაკეტი წარმატებით შეიქმნა!',
      package: packageResult.rows[0]
    });
  } catch (error) {
    console.error('პაკეტის შექმნის შეცდომა:', error);
    res.status(500).json({ message: 'პაკეტის შექმნა ვერ მოხერხდა' });
  }
});

// PUT /api/packages/:id - პაკეტის განახლება
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;
