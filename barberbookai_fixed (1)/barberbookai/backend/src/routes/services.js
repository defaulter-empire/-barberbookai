const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', req.user.businessId)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('price').isNumeric().isFloat({ min: 0 }),
  body('duration_minutes').isInt({ min: 5 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, price, duration_minutes, description } = req.body;
  const { data, error } = await supabase
    .from('services')
    .insert({ business_id: req.user.businessId, name, price, duration_minutes, description })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('business_id', req.user.businessId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', req.params.id)
    .eq('business_id', req.user.businessId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Service deleted' });
});

module.exports = router;
