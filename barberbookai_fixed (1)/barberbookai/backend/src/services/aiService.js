const supabase = require('../utils/supabase');

// Lazy init OpenAI - only when needed, not at startup
let openai = null;
function getOpenAI() {
  if (!openai) {
    const OpenAI = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

async function getBusinessContext(businessId) {
  const [business, services] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.from('services').select('*').eq('business_id', businessId)
  ]);
  return { business: business.data, services: services.data || [] };
}

async function getAvailableSlots(businessId, date, durationMinutes = 30) {
  const { data: business } = await supabase
    .from('businesses').select('opening_hours, closing_hours')
    .eq('id', businessId).single();

  const slots = [];
  const [openH, openM] = (business?.opening_hours || '09:00').split(':').map(Number);
  const [closeH, closeM] = (business?.closing_hours || '18:00').split(':').map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }

  const { data: booked } = await supabase
    .from('appointments').select('appointment_time')
    .eq('business_id', businessId).eq('appointment_date', date)
    .in('status', ['pending', 'confirmed']);

  const bookedTimes = new Set((booked || []).map(b => b.appointment_time));
  return slots.filter(s => !bookedTimes.has(s));
}

async function bookAppointment(businessId, customerName, phone, service, date, time) {
  const { data: conflict } = await supabase
    .from('appointments').select('id')
    .eq('business_id', businessId).eq('appointment_date', date)
    .eq('appointment_time', time).in('status', ['pending', 'confirmed']).single();

  if (conflict) return { success: false, error: 'Slot already taken' };

  let customer;
  const { data: existing } = await supabase
    .from('customers').select('*')
    .eq('business_id', businessId).eq('phone', phone).single();

  if (existing) {
    const { data } = await supabase.from('customers')
      .update({ name: customerName, total_visits: (existing.total_visits || 0) + 1 })
      .eq('id', existing.id).select().single();
    customer = data;
  } else {
    const { data } = await supabase.from('customers')
      .insert({ business_id: businessId, name: customerName, phone, total_visits: 1 })
      .select().single();
    customer = data;
  }

  const { data: appointment, error } = await supabase.from('appointments')
    .insert({
      business_id: businessId, customer_id: customer?.id,
      customer_name: customerName, phone, service,
      appointment_date: date, appointment_time: time, status: 'confirmed'
    }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, appointment };
}

async function cancelAppointment(businessId, phone, date) {
  let query = supabase.from('appointments')
    .update({ status: 'cancelled' })
    .eq('business_id', businessId).eq('phone', phone)
    .in('status', ['pending', 'confirmed']);
  if (date) query = query.eq('appointment_date', date);
  const { data, error } = await query.select().single();
  if (error) return { success: false };
  return { success: true, appointment: data };
}

async function getCustomerAppointments(businessId, phone) {
  const { data } = await supabase.from('appointments').select('*')
    .eq('business_id', businessId).eq('phone', phone)
    .in('status', ['pending', 'confirmed']).order('appointment_date', { ascending: true });
  return data || [];
}

async function processMessage(businessId, customerPhone, customerMessage, conversationHistory = []) {
  const ctx = await getBusinessContext(businessId);
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const systemPrompt = `You are an AI receptionist for "${ctx.business?.name || 'the barbershop'}". 
You help customers book, cancel, and reschedule appointments via WhatsApp.

Business Hours: ${ctx.business?.opening_hours || '09:00'} - ${ctx.business?.closing_hours || '18:00'}
Today: ${today}

Services:
${ctx.services.map(s => `- ${s.name}: $${s.price} (${s.duration_minutes} mins)`).join('\n')}

Customer phone: ${customerPhone}

RULES:
1. Be friendly and concise.
2. When booking: ask name, date, time, service if not provided.
3. Use action blocks to perform operations:
   [ACTION:BOOK|name=John|date=2024-01-15|time=10:00|service=Haircut]
   [ACTION:CANCEL|phone=${customerPhone}]
   [ACTION:CHECK_SLOTS|date=2024-01-15|service=Haircut]
   [ACTION:MY_APPOINTMENTS]
4. If slot unavailable, suggest alternatives.
5. Keep responses short and WhatsApp-friendly.`;

  const messages = [
    ...conversationHistory.slice(-10),
    { role: 'user', content: customerMessage }
  ];

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.3, max_tokens: 500
  });

  let aiText = response.choices[0].message.content;
  const actionMatch = aiText.match(/\[ACTION:([^\]]+)\]/);

  if (actionMatch) {
    const parts = actionMatch[1].split('|');
    const actionType = parts[0];
    const params = {};
    parts.slice(1).forEach(p => { const [k,v] = p.split('='); if(k&&v) params[k]=v; });

    let actionResult = '';

    if (actionType === 'CHECK_SLOTS') {
      const slots = await getAvailableSlots(businessId, params.date || tomorrow);
      actionResult = slots.length === 0
        ? `No slots available on ${params.date}. Try another day.`
        : `Available times on ${params.date}:\n${slots.slice(0, 8).join(', ')}`;
    } else if (actionType === 'BOOK') {
      const result = await bookAppointment(businessId, params.name, customerPhone, params.service, params.date, params.time);
      if (result.success) {
        actionResult = `Booked! ✅\n📅 ${params.date} at ${params.time}\n💈 ${params.service}\nSee you then!`;
      } else {
        const alts = await getAvailableSlots(businessId, params.date);
        actionResult = `That slot is taken. Try: ${alts.slice(0, 3).join(', ')}`;
      }
    } else if (actionType === 'CANCEL') {
      const result = await cancelAppointment(businessId, customerPhone, params.date);
      actionResult = result.success
        ? 'Cancelled! ❌ Hope to see you again soon!'
        : 'No active appointment found.';
    } else if (actionType === 'MY_APPOINTMENTS') {
      const appts = await getCustomerAppointments(businessId, customerPhone);
      actionResult = appts.length === 0 ? 'No upcoming appointments.'
        : 'Your appointments:\n' + appts.map(a => `📅 ${a.appointment_date} at ${a.appointment_time} - ${a.service}`).join('\n');
    }

    aiText = aiText.replace(actionMatch[0], '').trim();
    if (actionResult) aiText = actionResult;
  }

  return {
    message: aiText,
    updatedHistory: [...conversationHistory, { role: 'user', content: customerMessage }, { role: 'assistant', content: aiText }]
  };
}

module.exports = { processMessage, getAvailableSlots, bookAppointment, cancelAppointment };
