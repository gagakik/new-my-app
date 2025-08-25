const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware imports
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token არ არის მოწოდებული' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'არასწორი token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'არ გაქვთ ამ მოქმედების ნებართვა' });
    }
    next();
  };
};

// GET pricing rules for exhibition
router.get('/rules/:exhibitionId', authenticateToken, async (req, res) => {
  try {
    const { exhibitionId } = req.params;

    const result = await db.query(`
      SELECT * FROM pricing_rules 
      WHERE exhibition_id = $1 
      ORDER BY priority DESC, created_at DESC
    `, [exhibitionId]);

    res.json(result.rows);
  } catch (error) {
    console.error('ფასწარმოების წესების მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ფასწარმოების წესების მიღება ვერ მოხერხდა' });
  }
});

// POST create pricing rule
router.post('/rules', authenticateToken, authorizeRoles('admin', 'sales', 'marketing'), async (req, res) => {
  try {
    const {
      exhibition_id,
      rule_name,
      rule_type,
      discount_percentage,
      fixed_discount_amount,
      start_date,
      end_date,
      min_area_sqm,
      max_area_sqm,
      min_participants,
      priority
    } = req.body;

    const result = await db.query(`
      INSERT INTO pricing_rules (
        exhibition_id, rule_name, rule_type, discount_percentage, 
        fixed_discount_amount, start_date, end_date, min_area_sqm, 
        max_area_sqm, min_participants, priority, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *
    `, [
      exhibition_id, rule_name, rule_type, discount_percentage || 0,
      fixed_discount_amount || 0, start_date, end_date, min_area_sqm,
      max_area_sqm, min_participants, priority || 1, req.user.id
    ]);

    res.status(201).json({
      message: 'ფასწარმოების წესი წარმატებით დაემატა',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('ფასწარმოების წესის დამატების შეცდომა:', error);
    res.status(500).json({ message: 'ფასწარმოების წესის დამატება ვერ მოხერხდა' });
  }
});

// PUT update pricing rule
router.put('/rules/:id', authenticateToken, authorizeRoles('admin', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rule_name,
      rule_type,
      discount_percentage,
      fixed_discount_amount,
      start_date,
      end_date,
      min_area_sqm,
      max_area_sqm,
      min_participants,
      priority,
      is_active
    } = req.body;

    const result = await db.query(`
      UPDATE pricing_rules SET 
        rule_name = $1, rule_type = $2, discount_percentage = $3,
        fixed_discount_amount = $4, start_date = $5, end_date = $6,
        min_area_sqm = $7, max_area_sqm = $8, min_participants = $9,
        priority = $10, is_active = $11
      WHERE id = $12 RETURNING *
    `, [
      rule_name, rule_type, discount_percentage || 0,
      fixed_discount_amount || 0, start_date, end_date,
      min_area_sqm, max_area_sqm, min_participants,
      priority || 1, is_active !== undefined ? is_active : true, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ფასწარმოების წესი ვერ მოიძებნა' });
    }

    res.json({
      message: 'ფასწარმოების წესი წარმატებით განახლდა',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('ფასწარმოების წესის განახლების შეცდომა:', error);
    res.status(500).json({ message: 'ფასწარმოების წესის განახლება ვერ მოხერხდა' });
  }
});

// DELETE pricing rule
router.delete('/rules/:id', authenticateToken, authorizeRoles('admin', 'sales', 'marketing'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM pricing_rules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ფასწარმოების წესი ვერ მოიძებნა' });
    }

    res.json({ message: 'ფასწარმოების წესი წარმატებით წაიშალა' });
  } catch (error) {
    console.error('ფასწარმოების წესის წაშლის შეცდომა:', error);
    res.status(500).json({ message: 'ფასწარმოების წესის წაშლა ვერ მოხერხდა' });
  }
});

// POST calculate price for participant
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const {
      exhibition_id,
      booth_size,
      registration_date = new Date(),
      participant_count = 1
    } = req.body;

    // Get exhibition base price
    const exhibitionResult = await db.query(
      'SELECT price_per_sqm FROM exhibitions WHERE id = $1',
      [exhibition_id]
    );

    if (exhibitionResult.rows.length === 0) {
      return res.status(404).json({ message: 'გამოფენა ვერ მოიძებნა' });
    }

    const basePricePerSqm = parseFloat(exhibitionResult.rows[0].price_per_sqm) || 0;
    const basePrice = basePricePerSqm * parseFloat(booth_size);

    // Get applicable pricing rules
    const rulesResult = await db.query(`
      SELECT * FROM pricing_rules 
      WHERE exhibition_id = $1 
        AND is_active = true
        AND (start_date IS NULL OR start_date <= $2)
        AND (end_date IS NULL OR end_date >= $2)
        AND (min_area_sqm IS NULL OR min_area_sqm <= $3)
        AND (max_area_sqm IS NULL OR max_area_sqm >= $3)
        AND (min_participants IS NULL OR min_participants <= $4)
      ORDER BY priority DESC
    `, [exhibition_id, registration_date, booth_size, participant_count]);

    let totalDiscount = 0;
    const appliedDiscounts = [];

    // Apply discounts
    for (const rule of rulesResult.rows) {
      let discount = 0;

      if (rule.discount_percentage > 0) {
        discount = basePrice * (parseFloat(rule.discount_percentage) / 100);
      } else if (rule.fixed_discount_amount > 0) {
        discount = parseFloat(rule.fixed_discount_amount);
      }

      if (discount > 0) {
        totalDiscount += discount;
        appliedDiscounts.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          discount_amount: discount,
          discount_percentage: rule.discount_percentage,
          fixed_amount: rule.fixed_discount_amount
        });
      }
    }

    // Ensure total discount doesn't exceed base price
    totalDiscount = Math.min(totalDiscount, basePrice * 0.9); // Max 90% discount

    const finalPrice = Math.max(basePrice - totalDiscount, basePrice * 0.1); // Min 10% of base price

    res.json({
      base_price: basePrice,
      discount_amount: totalDiscount,
      final_price: finalPrice,
      applied_discounts: appliedDiscounts,
      price_per_sqm: basePricePerSqm,
      booth_size: parseFloat(booth_size)
    });
  } catch (error) {
    console.error('ფასის გაანგარიშების შეცდომა:', error);
    res.status(500).json({ message: 'ფასის გაანგარიშება ვერ მოხერხდა' });
  }
});

// GET pricing history for participant
router.get('/history/:participantId', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.params;

    const result = await db.query(`
      SELECT * FROM participant_pricing 
      WHERE participant_id = $1 
      ORDER BY pricing_date DESC
    `, [participantId]);

    res.json(result.rows);
  } catch (error) {
    console.error('ფასების ისტორიის მიღების შეცდომა:', error);
    res.status(500).json({ message: 'ფასების ისტორიის მიღება ვერ მოხერხდა' });
  }
});

module.exports = router;