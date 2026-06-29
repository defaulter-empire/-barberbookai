# BarberBookAI — WhatsApp Appointment Booking SaaS

AI-powered WhatsApp booking system for barbershops. Customers text your WhatsApp number and the AI handles everything: booking, rescheduling, cancellations, and reminders.

---

## Project Structure

```
barberbookai/
├── backend/                  # Node.js + Express API
│   └── src/
│       ├── index.js          # Server entry point
│       ├── routes/           # API endpoints
│       │   ├── auth.js       # Register / Login
│       │   ├── appointments.js
│       │   ├── customers.js
│       │   ├── services.js
│       │   ├── business.js
│       │   ├── dashboard.js
│       │   └── whatsapp.js   # Webhook handler
│       ├── services/
│       │   ├── aiService.js  # OpenAI GPT-4o-mini logic
│       │   └── whatsappService.js
│       ├── middleware/
│       │   └── auth.js       # JWT middleware
│       ├── utils/
│       │   └── supabase.js
│       └── jobs/
│           └── reminderJob.js # Cron reminders
├── frontend/                 # Next.js 14 App Router
│   └── app/
│       ├── login/
│       ├── register/
│       └── dashboard/
│           ├── page.tsx      # Stats overview
│           ├── appointments/
│           ├── customers/
│           ├── services/
│           └── settings/
└── SUPABASE_SCHEMA.sql       # Run this first in Supabase
```

---

## Step 1: Supabase Setup

1. Create a project at https://supabase.com
2. Go to SQL Editor → paste `SUPABASE_SCHEMA.sql` → Run
3. Copy your Project URL and service_role key

---

## Step 2: Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

### Backend .env
```
PORT=5000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=your-min-32-char-secret-key
OPENAI_API_KEY=sk-...
WHATSAPP_VERIFY_TOKEN=your-custom-token
ENABLE_REMINDERS=true
```

---

## Step 3: Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Frontend .env.local
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## Step 4: WhatsApp Business API Setup

1. Go to https://developers.facebook.com
2. Create App → Business → WhatsApp
3. Add a phone number (or use test number)
4. Copy your **Phone Number ID** and **Access Token**
5. In BarberBookAI Settings page, paste both values
6. Set up Webhook:
   - URL: `https://yourdomain.com/api/whatsapp/webhook/YOUR_BUSINESS_ID`
   - Verify Token: same as `WHATSAPP_VERIFY_TOKEN` in .env
   - Subscribe to: `messages`

**Note:** Webhook URL must be HTTPS. For local testing, use ngrok:
```bash
ngrok http 5000
# Use the ngrok URL as your webhook
```

---

## API Routes

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login

### Appointments
- `GET /api/appointments` — List (filters: date, status)
- `POST /api/appointments` — Create
- `PATCH /api/appointments/:id` — Update
- `DELETE /api/appointments/:id` — Cancel
- `GET /api/appointments/slots?date=&service_name=` — Available slots

### Customers
- `GET /api/customers` — List
- `GET /api/customers/:id` — Detail + history

### Services
- `GET /api/services` — List
- `POST /api/services` — Create
- `PATCH /api/services/:id` — Update
- `DELETE /api/services/:id` — Delete

### Dashboard
- `GET /api/dashboard/stats` — All stats

### WhatsApp
- `GET /api/whatsapp/webhook/:businessId` — Verification
- `POST /api/whatsapp/webhook/:businessId` — Message handler

---

## AI Conversation Examples

**Customer:** "Can I get a haircut tomorrow at 3pm?"
**AI:** Checks availability, books if slot is open, confirms with details.

**Customer:** "Move my appointment to Friday"
**AI:** Finds existing booking, checks Friday availability, reschedules.

**Customer:** "Cancel my appointment"
**AI:** Cancels upcoming booking, sends confirmation.

**Customer:** "What services do you offer?"
**AI:** Lists all services with prices from your settings.

---

## Production Deployment

### Backend (Railway / Render / Heroku)
```bash
# Set all environment variables in dashboard
# Start command: node src/index.js
```

### Frontend (Vercel)
```bash
vercel deploy
# Set NEXT_PUBLIC_API_URL to your backend URL
```

### For Reminders
The cron job runs inside the backend process when `ENABLE_REMINDERS=true`.
For production, consider a dedicated worker or Supabase Edge Functions.

---

## Multi-Tenant Architecture

Each business gets:
- Isolated data via `business_id` on every table
- Separate WhatsApp webhook URL (`/webhook/:businessId`)
- Own services, customers, appointments
- Own AI context (business hours, services)

---

## Security Checklist

- JWT auth on all dashboard endpoints ✅
- Rate limiting (100 req/15min general, 60 req/min WhatsApp) ✅
- Input validation with express-validator ✅
- bcrypt password hashing (12 rounds) ✅
- Helmet security headers ✅
- RLS enabled on all Supabase tables ✅
- Service key never exposed to frontend ✅
