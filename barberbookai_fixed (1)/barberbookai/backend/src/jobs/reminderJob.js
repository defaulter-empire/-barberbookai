const cron = require('node-cron');
const supabase = require('../utils/supabase');
const { sendReminderMessage } = require('../services/whatsappService');

async function sendReminders(hoursUntil) {
  const targetDate = new Date();
  targetDate.setHours(targetDate.getHours() + hoursUntil);

  const dateStr = targetDate.toISOString().split('T')[0];
  const hour = targetDate.getHours().toString().padStart(2, '0');
  const minute = targetDate.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hour}:${minute}`;

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, businesses(whatsapp_phone_number_id, whatsapp_access_token)')
    .eq('appointment_date', dateStr)
    .eq('appointment_time', timeStr)
    .eq('status', 'confirmed')
    .eq(`reminder_${hoursUntil}h_sent`, false);

  if (!appointments || appointments.length === 0) return;

  console.log(`Sending ${hoursUntil}h reminders to ${appointments.length} customers`);

  for (const appt of appointments) {
    const business = appt.businesses;
    if (!business?.whatsapp_phone_number_id) continue;

    await sendReminderMessage(
      business.whatsapp_phone_number_id,
      business.whatsapp_access_token,
      appt.phone,
      {
        customer_name: appt.customer_name,
        service: appt.service,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        hoursUntil
      }
    );

    // Mark reminder as sent
    const field = hoursUntil === 24 ? 'reminder_24h_sent' : 'reminder_1h_sent';
    await supabase.from('appointments').update({ [field]: true }).eq('id', appt.id);
  }
}

// Run every hour
cron.schedule('0 * * * *', () => {
  console.log('Running reminder job...');
  sendReminders(24).catch(console.error);
  sendReminders(1).catch(console.error);
});

console.log('Reminder cron job started');
module.exports = { sendReminders };
