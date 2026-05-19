-- PRAJAPATI ADVERTISING ERP PHASE 6 COMMAND CENTER SCHEMA
-- Run in Supabase SQL Editor. Safe CREATE IF NOT EXISTS statements.

create table if not exists erp_approval_requests (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  approval_type text not null check (approval_type in ('expense','production','payment','report','invoice','custom')),
  title text not null,
  requested_by uuid,
  requested_role text,
  amount numeric(12,2) default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists erp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text,
  actor_id uuid,
  actor_role text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz default now()
);

create table if not exists erp_notification_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  trigger_event text not null,
  channel text not null check (channel in ('dashboard','whatsapp','email','sms')),
  target_role text,
  template text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists erp_documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  document_type text not null check (document_type in ('quotation','invoice','execution_report','expense_voucher','receipt','client_progress','other')),
  document_number text,
  file_url text,
  generated_by uuid,
  visibility text default 'internal' check (visibility in ('internal','client','finance_only')),
  created_at timestamptz default now()
);

create table if not exists erp_project_financial_summary (
  id uuid primary key default gen_random_uuid(),
  project_id text unique not null,
  client_revenue numeric(12,2) default 0,
  printing_cost numeric(12,2) default 0,
  stitching_cost numeric(12,2) default 0,
  execution_cost numeric(12,2) default 0,
  travel_cost numeric(12,2) default 0,
  hotel_cost numeric(12,2) default 0,
  food_cost numeric(12,2) default 0,
  other_cost numeric(12,2) default 0,
  net_profit numeric(12,2) generated always as (client_revenue - printing_cost - stitching_cost - execution_cost - travel_cost - hotel_cost - food_cost - other_cost) stored,
  updated_at timestamptz default now()
);

insert into erp_notification_rules (rule_name, trigger_event, channel, target_role, template)
values
('Printing Assignment Alert','printing_assigned','dashboard','printing','New printing job assigned for {{project_id}}'),
('Stitching Completion Alert','stitching_completed','dashboard','operation','Stitching completed for {{project_id}}'),
('Expense Approval Alert','expense_submitted','dashboard','accountant','Expense pending approval for {{project_id}}'),
('Client Progress Alert','execution_completed','whatsapp','client','Execution completed. Report will be shared soon.'),
('Invoice Overdue Alert','invoice_overdue','dashboard','sales','Invoice overdue for {{project_id}}')
on conflict do nothing;

alter table erp_approval_requests enable row level security;
alter table erp_audit_logs enable row level security;
alter table erp_notification_rules enable row level security;
alter table erp_documents enable row level security;
alter table erp_project_financial_summary enable row level security;
