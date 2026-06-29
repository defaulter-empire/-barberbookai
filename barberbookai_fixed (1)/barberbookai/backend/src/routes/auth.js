const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const router = express.Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('business_name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, business_name } = req.body;

  try {
    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);

    // Create business first
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        name: business_name,
        opening_hours: '09:00',
        closing_hours: '18:00'
      })
      .select()
      .single();

    if (bizErr) throw bizErr;

    // Create user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ email, password_hash, business_id: business.id })
      .select('id, email, business_id')
      .single();

    if (userErr) throw userErr;

    // Seed default services
    await supabase.from('services').insert([
      { business_id: business.id, name: 'Haircut', price: 25, duration_minutes: 30 },
      { business_id: business.id, name: 'Beard Trim', price: 15, duration_minutes: 20 },
      { business_id: business.id, name: 'Haircut + Beard', price: 35, duration_minutes: 50 },
      { business_id: business.id, name: 'Hair Wash', price: 10, duration_minutes: 15 }
    ]);

    const token = jwt.sign(
      { userId: user.id, businessId: business.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: user.id, email, business_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, business_id')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', user.business_id)
      .single();

    const token = jwt.sign(
      { userId: user.id, businessId: user.business_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, business_name: business?.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
