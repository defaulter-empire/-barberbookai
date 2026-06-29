const express = require('express');
const supabase = require('../utils/supabase');
const { processMessage } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const router = express.Router();

// In-memory conversation store (use Redis in production)
const conversations = new Map();

// Webhook verification
router.get('/webhook/:businessId', (req, res) => {
  const { businessId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log(`Webhook verified for business ${businessId}`);
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// Receive messages
router.post('/webhook/:businessId', async (req, res) => {
  const { businessId } = req.params;
  res.status(200).json({ status: 'ok' }); // Respond immediately

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const customerPhone = message.from;
    const messageText = message.text?.body || message.button?.text || '';

    if (!messageText) return;

    // Get business WhatsApp config
    const { data: business } = await supabase
      .from('businesses')
      .select('whatsapp_phone_number_id, whatsapp_access_token')
      .eq('id', businessId)
      .single();

    if (!business?.whatsapp_phone_number_id) return;

    // Get conversation history
    const convKey = `${businessId}:${customerPhone}`;
    const history = conversations.get(convKey) || [];

    // Process with AI
    const result = await processMessage(businessId, customerPhone, messageText, history);

    // Store updated history (cap at 20 messages)
    conversations.set(convKey, result.updatedHistory.slice(-20));

    // Send response
    await sendWhatsAppMessage(
      business.whatsapp_phone_number_id,
      business.whatsapp_access_token,
      customerPhone,
      result.message
    );

    // Log conversation
    await supabase.from('conversation_logs').insert({
      business_id: businessId,
      customer_phone: customerPhone,
      customer_message: messageText,
      ai_response: result.message
    });

  } catch (err) {
    console.error('Webhook processing error:', err);
  }
});

// Manual message send (from dashboard)
router.post('/send', async (req, res) => {
  const { phone, message, businessId } = req.body;

  const { data: business } = await supabase
    .from('businesses')
    .select('whatsapp_phone_number_id, whatsapp_access_token')
    .eq('id', businessId)
    .single();

  if (!business?.whatsapp_phone_number_id) {
    return res.status(400).json({ error: 'WhatsApp not configured for this business' });
  }

  const result = await sendWhatsAppMessage(
    business.whatsapp_phone_number_id,
    business.whatsapp_access_token,
    phone,
    message
  );

  res.json(result);
});

module.exports = router;
