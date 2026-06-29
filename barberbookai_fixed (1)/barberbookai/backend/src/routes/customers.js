const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('business_id', req.user.businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ customers: data, total: count });
});

router.get('/:id', async (req, res) => {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', req.params.id)
    .eq('business_id', req.user.businessId)
    .single();

  if (error || !customer) return res.status(404).json({ error: 'Customer not found' });

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('customer_id', req.params.id)
    .order('appointment_date', { ascending: false })
    .limit(10);

  res.json({ ...customer, recent_appointments: appointments });
});

module.exports = router;
