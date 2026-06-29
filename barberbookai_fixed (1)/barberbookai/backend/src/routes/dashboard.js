const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const supabase = require('../utils/supabase');
const router = express.Router();

router.use(authenticateToken);

router.get('/stats', async (req, res) => {
  const businessId = req.user.businessId;
  const today = new Date().toISOString().split('T')[0];

  const [totalAppts, todayAppts, customers, services] = await Promise.all([
    supabase.from('appointments').select('id, status', { count: 'exact' }).eq('business_id', businessId),
    supabase.from('appointments').select('*').eq('business_id', businessId).eq('appointment_date', today).in('status', ['confirmed', 'pending']),
    supabase.from('customers').select('id', { count: 'exact' }).eq('business_id', businessId),
    supabase.from('services').select('name, price').eq('business_id', businessId)
  ]);

  // Revenue estimate from confirmed appointments this month
  const monthStart = new Date();
  monthStart.setDate(1);
  const { data: monthAppts } = await supabase
    .from('appointments')
    .select('service')
    .eq('business_id', businessId)
    .gte('appointment_date', monthStart.toISOString().split('T')[0])
    .eq('status', 'confirmed');

  const priceMap = {};
  (services.data || []).forEach(s => { priceMap[s.name.toLowerCase()] = s.price; });

  const revenue = (monthAppts || []).reduce((sum, a) => {
    const price = priceMap[a.service?.toLowerCase()] || 0;
    return sum + price;
  }, 0);

  // Recent appointments
  const { data: recent } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(5);

  res.json({
    total_bookings: totalAppts.count || 0,
    todays_bookings: todayAppts.data?.length || 0,
    total_customers: customers.count || 0,
    monthly_revenue: revenue,
    todays_appointments: todayAppts.data || [],
    recent_appointments: recent || []
  });
});

module.exports = router;
