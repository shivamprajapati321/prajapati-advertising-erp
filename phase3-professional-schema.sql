-- PRAJAPATI ADVERTISING ERP PHASE 3 PROFESSIONAL SCHEMA
-- Goal: Lead → Quotation → Order → Invoice → Printing → Stitching → Execution → Reporting → Payment Close
-- Run in Supabase SQL Editor after backup. Prefix keeps old tables safe.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pa_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  can_see_finance BOOLEAN DEFAULT FALSE,
  can_approve_expense BOOLEAN DEFAULT FALSE
);

INSERT INTO pa_roles(id,name,can_see_finance,can_approve_expense) VALUES
('admin','Admin',true,true),('accountant','Accountant',true,true),('sales','Sales',false,false),
('operation','Operation Manager',false,false),('printing','Printing Operator',false,false),
('stitching','Stitching Manager',false,false),('execution','Execution Manager',false,false),('client','Client View',false,false)
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, can_see_finance=EXCLUDED.can_see_finance, can_approve_expense=EXCLUDED.can_approve_expense;

CREATE TABLE IF NOT EXISTS pa_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  role_id TEXT REFERENCES pa_roles(id),
  department TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  gst_number TEXT,
  client_type TEXT DEFAULT 'direct',
  portal_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES pa_clients(id),
  company_name TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  requirement TEXT,
  city TEXT,
  qty INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  sales_owner UUID REFERENCES pa_staff(id),
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES pa_leads(id),
  client_id UUID REFERENCES pa_clients(id),
  subtotal NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  valid_until DATE,
  created_by UUID REFERENCES pa_staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  quotation_id UUID REFERENCES pa_quotations(id),
  client_id UUID REFERENCES pa_clients(id),
  service_name TEXT NOT NULL,
  city TEXT,
  qty INTEGER DEFAULT 0,
  client_amount NUMERIC DEFAULT 0, -- FINANCE ONLY
  stage TEXT DEFAULT 'order_created',
  stage_index INTEGER DEFAULT 2,
  payment_status TEXT DEFAULT 'pending',
  sales_owner UUID REFERENCES pa_staff(id),
  operation_owner UUID REFERENCES pa_staff(id),
  deadline DATE,
  client_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  size TEXT,
  material TEXT,
  qty INTEGER DEFAULT 0,
  rate NUMERIC DEFAULT 0, -- FINANCE ONLY
  amount NUMERIC DEFAULT 0 -- FINANCE ONLY
);

CREATE TABLE IF NOT EXISTS pa_operation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES pa_staff(id),
  assigned_to UUID REFERENCES pa_staff(id),
  department TEXT NOT NULL, -- printing/stitching/execution/dispatch
  instructions TEXT,
  due_date DATE,
  status TEXT DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_printing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES pa_staff(id),
  artwork_status TEXT DEFAULT 'pending',
  material TEXT,
  qty INTEGER DEFAULT 0,
  completed_qty INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_stitching_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES pa_staff(id),
  master_name TEXT NOT NULL,
  qty INTEGER DEFAULT 0,
  completed_qty INTEGER DEFAULT 0,
  rate_per_pc NUMERIC DEFAULT 15, -- INTERNAL ONLY
  total_cost NUMERIC GENERATED ALWAYS AS (completed_qty * rate_per_pc) STORED,
  qc_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_execution_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES pa_staff(id),
  team_name TEXT NOT NULL,
  work_type TEXT,
  location TEXT,
  planned_qty INTEGER DEFAULT 0,
  completed_qty INTEGER DEFAULT 0,
  rate_per_work NUMERIC DEFAULT 0, -- INTERNAL ONLY
  total_cost NUMERIC GENERATED ALWAYS AS (completed_qty * rate_per_work) STORED,
  report_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_report_id UUID REFERENCES pa_execution_reports(id) ON DELETE CASCADE,
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  vehicle_number TEXT,
  photo_url TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES pa_staff(id)
);

CREATE TABLE IF NOT EXISTS pa_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  expense_date DATE DEFAULT CURRENT_DATE,
  team_name TEXT,
  work_type TEXT,
  location TEXT,
  category TEXT NOT NULL CHECK (category IN ('hotel','auto','food','bus','petrol','labour','material','other')),
  amount NUMERIC NOT NULL DEFAULT 0, -- INTERNAL ONLY
  bill_photo_url TEXT,
  status TEXT DEFAULT 'pending', -- pending/approved/rejected
  approved_by UUID REFERENCES pa_staff(id),
  paid_status TEXT DEFAULT 'unpaid', -- unpaid/paid
  paid_by UUID REFERENCES pa_staff(id),
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES pa_staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES pa_clients(id),
  subtotal NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'unpaid',
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES pa_invoices(id),
  payment_type TEXT NOT NULL, -- client_receipt/expense_payment/vendor_payment/team_payment
  amount NUMERIC NOT NULL DEFAULT 0, -- FINANCE ONLY
  mode TEXT,
  reference_no TEXT,
  paid_to TEXT,
  paid_by UUID REFERENCES pa_staff(id),
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'done',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pa_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES pa_orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES pa_staff(id),
  actor_name TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW pa_project_profitability AS
SELECT
  o.id AS order_id,
  o.order_no,
  o.client_amount,
  COALESCE((SELECT SUM(completed_qty * 35) FROM pa_printing_jobs p WHERE p.order_id=o.id),0) AS printing_cost,
  COALESCE((SELECT SUM(total_cost) FROM pa_stitching_jobs s WHERE s.order_id=o.id),0) AS stitching_cost,
  COALESCE((SELECT SUM(total_cost) FROM pa_execution_reports e WHERE e.order_id=o.id),0) AS execution_cost,
  COALESCE((SELECT SUM(amount) FROM pa_expenses ex WHERE ex.order_id=o.id),0) AS expense_cost,
  o.client_amount - (
    COALESCE((SELECT SUM(completed_qty * 35) FROM pa_printing_jobs p WHERE p.order_id=o.id),0) +
    COALESCE((SELECT SUM(total_cost) FROM pa_stitching_jobs s WHERE s.order_id=o.id),0) +
    COALESCE((SELECT SUM(total_cost) FROM pa_execution_reports e WHERE e.order_id=o.id),0) +
    COALESCE((SELECT SUM(amount) FROM pa_expenses ex WHERE ex.order_id=o.id),0)
  ) AS net_profit
FROM pa_orders o;

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_pa_orders_stage ON pa_orders(stage, stage_index);
CREATE INDEX IF NOT EXISTS idx_pa_expenses_order ON pa_expenses(order_id);
CREATE INDEX IF NOT EXISTS idx_pa_execution_order ON pa_execution_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_pa_activity_order ON pa_activity_logs(order_id, created_at DESC);

-- IMPORTANT: Enable RLS in production only after wiring real Supabase Auth user mapping.
-- Do not expose service_role key in frontend. Use anon key only.
