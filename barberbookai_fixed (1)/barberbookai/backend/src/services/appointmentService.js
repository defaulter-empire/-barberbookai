const supabase = require('../utils/supabase');

/**
 * Get available time slots for a given date and service
 */
async function getAvailableSlots(businessId, date, serviceId) {
  // Get business settings
  const { data: business } = await supabase
    .from('businesses')
    .select('opening_time, closing_time, working_days, timezone')
    .eq('id', businessId)
    .single();

  if (!business) throw new Error('Business not found');

  // Check if date is a working day
  const dayOfWeek = new Date(date + 'T00:00:00').getDay(); // 0=Sun
  if (!business.working_days.includes(dayOfWeek)) {
    return []; // Closed this day
  }

  // Get service duration
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .single();

  if (!service) throw new Error('Service not found');

  // Get existing bookings for that date
  const { data: bookings } = await supabase
    .from('appointments')
    .select('appointment_time, end_time')
    .eq('business_id', businessId)
    .eq('appointment_date', date)
    .not('status', 'in', '("cancelled")');

  const blockedSlots = bookings || [];

  // Generate 30-minute interval slots between open/close
  const slots = [];
  const [openH, openM] = business.opening_time.split(':').map(Number);
  const [closeH, closeM] = business.closing_time.split(':').map(Number);
  
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + service.duration_minutes <= closeMinutes; m += 30) {
    const slotH = Math.floor(m / 60);
    const slotM = m % 60;
    const slotTime = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
    
    const slotEndM = m + service.duration_minutes;
    const slotEndH = Math.floor(slotEndM / 60);
    const slotEndMin = slotEndM % 60;
    const slotEndTime = `${String(slotEndH).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

    // Check if this slot conflicts with any existing booking
    const isBooked = blockedSlots.some(booking => {
      return slotTime < booking.end_time && slotEndTime > booking.appointment_time;
    });

    // Don't show past slots for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (date === today) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (m <= currentMinutes + 30) continue; // Need 30min buffer
    }

    slots.push({
      time: slotTime,
      end_time: slotEndTime,
      available: !isBooked,
    });
  }

  return slots.filter(s => s.available);
}

/**
 * Parse a time string like "2:30 PM" or "14:30" into HH:MM format
 */
function normalizeTime(timeStr) {
  if (!timeStr) return null;
  
  // Handle "2:30 PM" format
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const mins = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }
  
  // Handle "14:30" format
  const twentyFourMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    return `${String(twentyFourMatch[1]).padStart(2, '0')}:${twentyFourMatch[2]}`;
  }
  
  return null;
}

/**
 * Get or create a customer record
 */
async function upsertCustomer(businessId, phone, name) {
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single();

  if (existing) {
    if (name && existing.name !== name) {
      await supabase.from('customers').update({ name }).eq('id', existing.id);
    }
    return { ...existing, name: name || existing.name };
  }

  const { data: newCustomer } = await supabase
    .from('customers')
    .insert({ business_id: businessId, name: name || 'Unknown', phone })
    .select()
    .single();

  return newCustomer;
}

/**
 * Book an appointment (used by AI)
 */
async function bookAppointment({ businessId, customerPhone, customerName, serviceId, date, time }) {
  const service = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .single();

  if (!service.data) throw new Error('Service not found');
  const svc = service.data;

  const [startH, startM] = time.split(':').map(Number);
  const endMinutes = startH * 60 + startM + svc.duration_minutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  // Final conflict check
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('business_id', businessId)
    .eq('appointment_date', date)
    .not('status', 'in', '("cancelled")')
    .or(`and(appointment_time.lt.${end_time},end_time.gt.${time})`);

  if (conflicts && conflicts.length > 0) {
    throw new Error('SLOT_TAKEN');
  }

  const customer = await upsertCustomer(businessId, customerPhone, customerName);

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      business_id: businessId,
      customer_id: customer.id,
      service_id: serviceId,
      customer_name: customerName || customer.name,
      phone: customerPhone,
      service: svc.name,
      appointment_date: date,
      appointment_time: time,
      end_time,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      status: 'confirmed',
      booked_via: 'whatsapp',
    })
    .select()
    .single();

  if (error) throw error;
  return appointment;
}

module.exports = { getAvailableSlots, normalizeTime, upsertCustomer, bookAppointment };
