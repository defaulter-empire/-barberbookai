const axios = require('axios');

async function sendWhatsAppMessage(phoneNumberId, accessToken, to, message) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, data: response.data };
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

async function sendReminderMessage(phoneNumberId, accessToken, to, appointmentDetails) {
  const { customer_name, service, appointment_date, appointment_time, hoursUntil } = appointmentDetails;
  const message = hoursUntil === 24
    ? `Hi ${customer_name}! 💈 Reminder: You have a *${service}* appointment tomorrow (${appointment_date}) at *${appointment_time}*. Reply CANCEL to cancel.`
    : `Hi ${customer_name}! ⏰ Your *${service}* appointment is in 1 hour at *${appointment_time}*. See you soon!`;

  return sendWhatsAppMessage(phoneNumberId, accessToken, to, message);
}

module.exports = { sendWhatsAppMessage, sendReminderMessage };
