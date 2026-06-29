const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', req.user.businessId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/', async (req, res) => {
  const allowed = ['name', 'opening_hours', 'closing_hours', 'phone', 'address', 'whatsapp_phone_number_id', 'whatsapp_access_token'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', req.user.businessId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
