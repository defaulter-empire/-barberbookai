const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const router = express.Router();

router.use(authenticateToken);

// List appointments
router.get('/', async (req, res) => {
  const { date, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('appointments')
    .select('*, customers(name, phone)', { count: 'exact' })
    .eq('business_id', req.user.businessId)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .range(offset, offset + limit - 1);

  if (date) query = query.eq('appointment_date', date);
  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ appointments: data, total: count, page: Number(page), limit: Number(limit) });
});

// Create appointment
router.post('/', [
  body('customer_name').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  body('service').trim().notEmpty(),
  body('appointment_date').isDate(),
  body('appointment_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { customer_name, phone, service, appointment_date, appointment_time, notes } = req.body;

  try {
    // Check for double booking
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', req.user.businessId)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed'])
      .single();

    if (conflict) return res.status(409).json({ error: 'This time slot is already booked' });

    // Upsert customer
    let customer;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', req.user.businessId)
      .eq('phone', phone)
      .single();

    if (existingCustomer) {
      const { data } = await supabase
        .from('customers')
        .update({ name: customer_name, total_visits: existingCustomer.total_visits + 1 })
        .eq('id', existingCustomer.id)
        .select()
        .single();
      customer = data;
    } else {
      const { data } = await supabase
        .from('customers')
        .insert({ business_id: req.user.businessId, name: customer_name, phone, total_visits: 1 })
        .select()
        .single();
      customer = data;
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        business_id: req.user.businessId,
        customer_id: customer.id,
        customer_name,
        phone,
        service,
        appointment_date,
        appointment_time,
        status: 'confirmed',
        notes
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('appointments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', req.user.businessId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Appointment not found' });
  res.json(data);
});

// Delete/Cancel appointment
router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .eq('business_id', req.user.businessId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Appointment cancelled', appointment: data });
});

// Get available slots
router.get('/slots', async (req, res) => {
  const { date, service_name } = req.query;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const { data: business } = await supabase
    .from('businesses')
    .select('opening_hours, closing_hours')
    .eq('id', req.user.businessId)
    .single();

  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('business_id', req.user.businessId)
    .ilike('name', `%${service_name}%`)
    .single();

  const duration = service?.duration_minutes || 30;

  // Generate all possible slots
  const slots = [];
  const [openH, openM] = (business?.opening_hours || '09:00').split(':').map(Number);
  const [closeH, closeM] = (business?.closing_hours || '18:00').split(':').map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (current + duration <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += duration;
  }

  // Get booked slots
  const { data: booked } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('business_id', req.user.businessId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed']);

  const bookedTimes = new Set((booked || []).map(b => b.appointment_time));
  const available = slots.filter(s => !bookedTimes.has(s));

  res.json({ date, available_slots: available, booked_slots: [...bookedTimes] });
});

module.exports = router;
