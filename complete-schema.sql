-- ════════════════════════════════════════
-- PRAJAPATI ERP — Complete Schema Update
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════

-- 1. Add client_type to clients
ALTER TABLE prajapati_clients 
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS portal_phone TEXT,
  ADD COLUMN IF NOT EXISTS portal_active BOOLEAN DEFAULT true;
-- client_type: 'direct' = Prajapati branding, 'agency' = Clean/no branding

-- 2. LEADS TABLE
CREATE TABLE IF NOT EXISTS prajapati_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number TEXT UNIQUE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'manual', -- manual/indiamart/website/referral/walkin
  city TEXT,
  industry TEXT,
  media_interest TEXT, -- Hood/Back Panel/Flex/etc
  estimated_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'new', -- new/contacted/qualified/proposal/negotiation/won/lost
  assigned_to TEXT,
  follow_up_date DATE,
  notes TEXT,
  indiamart_query_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SALES TARGETS
CREATE TABLE IF NOT EXISTS prajapati_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_period TEXT NOT NULL, -- YYYY-MM or YYYY-Q1/Q2/Q3/Q4
  period_type TEXT DEFAULT 'monthly', -- monthly/quarterly/yearly
  staff_id UUID REFERENCES prajapati_staff(id),
  staff_name TEXT,
  target_revenue NUMERIC DEFAULT 0,
  target_invoices INTEGER DEFAULT 0,
  target_clients INTEGER DEFAULT 0,
  achieved_revenue NUMERIC DEFAULT 0,
  achieved_invoices INTEGER DEFAULT 0,
  achieved_clients INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMUNICATION / FOLLOW-UPS
CREATE TABLE IF NOT EXISTS prajapati_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT, -- lead/client/quotation
  entity_id UUID,
  entity_name TEXT,
  follow_up_type TEXT DEFAULT 'call', -- call/whatsapp/email/visit/meeting
  due_date DATE NOT NULL,
  due_time TIME,
  notes TEXT,
  outcome TEXT,
  status TEXT DEFAULT 'pending', -- pending/done/rescheduled
  assigned_to TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENT PORTAL SESSIONS
CREATE TABLE IF NOT EXISTS prajapati_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES prajapati_clients(id),
  client_name TEXT,
  phone TEXT,
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lead number sequence
CREATE SEQUENCE IF NOT EXISTS lead_seq START 1;
CREATE OR REPLACE FUNCTION next_lead_number()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'LEAD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('lead_seq')::TEXT, 4, '0');
$$;

-- 7. Disable RLS on all new tables
ALTER TABLE prajapati_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE prajapati_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE prajapati_followups DISABLE ROW LEVEL SECURITY;
ALTER TABLE prajapati_portal_sessions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON prajapati_leads TO anon;
GRANT ALL ON prajapati_targets TO anon;
GRANT ALL ON prajapati_followups TO anon;
GRANT ALL ON prajapati_portal_sessions TO anon;
GRANT EXECUTE ON FUNCTION next_lead_number() TO anon;

SELECT 'Complete schema ready!' as status;
