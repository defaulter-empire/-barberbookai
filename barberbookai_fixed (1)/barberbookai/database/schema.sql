-- ============================================================
-- BarberBookAI - Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BUSINESSES (Multi-tenant core)
-- ============================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL, -- references auth.users
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',
  opening_time TIME NOT NULL DEFAULT '09:00',
  closing_time TIME NOT NULL DEFAULT '18:00',
  working_days INTEGER[] DEFAULT '{1,2,3,4,5,6}', -- 0=Sun,1=Mon...6=Sat
  whatsapp_phone_number_id VARCHAR(255),
  whatsapp_access_token TEXT,
  whatsapp_verify_token VARCHAR(255) DEFAULT uuid_generate_v4()::text,
  ai_persona_name VARCHAR(100) DEFAULT 'Alex',
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'trial', -- trial, starter, pro
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  service VARCHAR(255) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
  notes TEXT,
  booked_via VARCHAR(50) DEFAULT 'whatsapp', -- whatsapp, dashboard, manual
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS (WhatsApp thread tracking)
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, resolved
  context JSONB DEFAULT '{}', -- AI context/state
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, customer_phone)
);

-- ============================================================
-- MESSAGES (WhatsApp message log)
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL, -- inbound, outbound
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  wa_message_id VARCHAR(255), -- WhatsApp message ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (Dashboard access)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner', -- owner, staff, admin
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_appointments_business_date ON appointments(business_id, appointment_date);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_status ON appointments(business_id, status);
CREATE INDEX idx_appointments_reminders ON appointments(appointment_date, status, reminder_24h_sent, reminder_1h_sent);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(business_id, phone);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_business ON conversations(business_id, customer_phone);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update customer stats when appointment completed
CREATE OR REPLACE FUNCTION update_customer_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE customers 
    SET 
      total_visits = total_visits + 1,
      total_spent = total_spent + NEW.price,
      last_visit_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_appointment_completion 
AFTER UPDATE ON appointments 
FOR EACH ROW EXECUTE FUNCTION update_customer_on_completion();

-- ============================================================
-- SEED: Default services for a barbershop
-- (Replace business_id after creating your first business)
-- ============================================================
-- INSERT INTO services (business_id, name, description, price, duration_minutes) VALUES
-- ('YOUR_BUSINESS_ID', 'Haircut', 'Classic men''s haircut with styling', 25.00, 30),
-- ('YOUR_BUSINESS_ID', 'Haircut & Beard Trim', 'Full haircut plus beard shaping and trim', 35.00, 45),
-- ('YOUR_BUSINESS_ID', 'Beard Trim', 'Beard shaping, trim and line-up', 15.00, 20),
-- ('YOUR_BUSINESS_ID', 'Hot Towel Shave', 'Traditional straight razor shave with hot towel', 30.00, 30),
-- ('YOUR_BUSINESS_ID', 'Kids Haircut', 'Haircut for children under 12', 18.00, 25),
-- ('YOUR_BUSINESS_ID', 'Hair Wash & Style', 'Shampoo, conditioning and professional styling', 20.00, 25);

-- ============================================================
-- ROW LEVEL SECURITY (Recommended for Supabase)
-- ============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are enforced via JWT claims in the backend
-- The backend uses a service role key that bypasses RLS
-- Frontend never touches DB directly
