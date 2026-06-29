const express = require('express');
const supabase = require('../utils/supabase');
const { processMessage } = require('../services/aiService');
const { sendMessage, verifyWebhookSignature } = require('../services/whatsappService');

const router = express.Router();

// ── Webhook Verification (Meta challenge) ────────────────────
router.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': verifyToken } = req.query;
  
  if (mode === 'subscribe') {
    // Find matching business by verify token
    supabase
      .from('businesses')
      .select('id')
      .eq('whatsapp_verify_token', verifyToken)
      .single()
      .then(({ data }) => {
        if (data) {
          console.log('[WEBHOOK] Verification successful');
          res.status(200).send(challenge);
        } else {
          console.warn('[WEBHOOK] Invalid verify token');
          res.sendStatus(403);
        }
      });
    return;
  }
  
  res.sendStatus(403);
});

// ── Inbound Message Handler ──────────────────────────────────
router.post('/', async (req, res) => {
  // Always respond 200 quickly to Meta (within 20s)
  res.sendStatus(200);

  try {
    const rawBody = req.body;
    const body = JSON.parse(rawBody.toString());

    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        // Find business by WhatsApp phone number ID
        const { data: business } = await supabase
          .from('businesses')
          .select('*, services(*)')
          .eq('whatsapp_phone_number_id', phoneNumberId)
          .eq('is_active', true)
          .single();

        if (!business) {
          console.warn('[WEBHOOK] Unknown phone_number_id:', phoneNumberId);
          continue;
        }

        // Verify signature
        const signature = req.headers['x-hub-signature-256'];
        if (process.env.WHATSAPP_APP_SECRET && !verifyWebhookSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET)) {
          console.warn('[WEBHOOK] Invalid signature');
          continue;
        }

        for (const msg of value.messages || []) {
          // Only handle text messages
          if (msg.type !== 'text') continue;

          const customerPhone = msg.from;
          const messageText = msg.text.body;

          console.log(`[WEBHOOK] Message from ${customerPhone}: ${messageText}`);

          await handleInboundMessage({
            business,
            customerPhone,
            messageText,
            phoneNumberId,
          });
        }
      }
    }
  } catch (err) {
    console.error('[WEBHOOK] Processing error:', err);
  }
});

// ── Core Message Handler ─────────────────────────────────────
async function handleInboundMessage({ business, customerPhone, messageText, phoneNumberId }) {
  try {
    // Get or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', business.id)
      .eq('customer_phone', customerPhone)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          business_id: business.id,
          customer_phone: customerPhone,
          context: { history: [] },
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Save inbound message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      direction: 'inbound',
      content: messageText,
      wa_message_id: `${Date.now()}`,
    });

    // Get conversation history
    const history = conversation.context?.history || [];

    // Get active services
    const services = business.services?.filter(s => s.is_active) || [];

    // Process with AI
    const aiReply = await processMessage({
      businessId: business.id,
      customerPhone,
      message: messageText,
      conversationHistory: history,
      business,
      services,
    });

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user', content: messageText },
      { role: 'assistant', content: aiReply },
    ].slice(-20); // Keep last 20 messages

    await supabase.from('conversations').update({
      context: { history: updatedHistory },
      last_message_at: new Date().toISOString(),
    }).eq('id', conversation.id);

    // Send reply via WhatsApp
    await sendMessage(phoneNumberId, business.whatsapp_access_token, customerPhone, aiReply);

    // Save outbound message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      business_id: business.id,
      direction: 'outbound',
      content: aiReply,
    });

    console.log(`[WEBHOOK] Replied to ${customerPhone}: ${aiReply.substring(0, 80)}...`);
  } catch (err) {
    console.error('[WEBHOOK] Handler error:', err);
    
    // Send fallback message
    try {
      await sendMessage(
        phoneNumberId,
        business.whatsapp_access_token,
        customerPhone,
        `Hi! I'm having a little trouble right now. Please call us or try again in a moment. 🙏`
      );
    } catch (_) {}
  }
}

module.exports = router;
