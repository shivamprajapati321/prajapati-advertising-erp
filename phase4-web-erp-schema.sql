-- PRAJAPATI ADVERTISING ERP - PHASE 4 WEB CORE
-- Run this in Supabase SQL Editor. Safe to run multiple times.

create table if not exists phase4_orders (
  id uuid primary key default gen_random_uuid(),
  project_code text unique not null,
  client_name text not null,
  client_phone text,
  city text,
  service_type text default 'Auto Rickshaw Hood Branding',
  quantity integer default 0,
  order_amount numeric default 0,
  status text default 'order_created',
  payment_status text default 'pending',
  printing_progress integer default 0,
  stitching_progress integer default 0,
  execution_progress integer default 0,
  created_by text,
  assigned_operation text,
  client_visible boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists phase4_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references phase4_orders(id) on delete cascade,
  task_type text not null check (task_type in ('printing','stitching','dispatch','execution','reporting')),
  assigned_to text,
  master_name text,
  location text,
  quantity integer default 0,
  rate numeric default 0,
  amount numeric generated always as (quantity * rate) stored,
  status text default 'pending',
  progress integer default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists phase4_expenses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references phase4_orders(id) on delete cascade,
  expense_date date default current_date,
  work_type text,
  team_name text,
  location text,
  category text not null,
  amount numeric not null default 0,
  description text,
  bill_url text,
  approval_status text default 'pending',
  payment_status text default 'unpaid',
  submitted_by text,
  approved_by text,
  paid_by text,
  created_at timestamptz default now()
);

create table if not exists phase4_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references phase4_orders(id) on delete cascade,
  payment_type text not null check (payment_type in ('client_receipt','team_payment','vendor_payment','expense_payment')),
  amount numeric not null default 0,
  mode text,
  reference_no text,
  paid_to_or_from text,
  notes text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists phase4_activity_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references phase4_orders(id) on delete cascade,
  actor text,
  action text not null,
  details text,
  created_at timestamptz default now()
);

create or replace view phase4_project_profitability as
select
  o.id,
  o.project_code,
  o.client_name,
  o.city,
  o.quantity,
  o.order_amount as client_revenue,
  coalesce((select sum(amount) from phase4_tasks t where t.order_id=o.id),0) as work_cost,
  coalesce((select sum(amount) from phase4_expenses e where e.order_id=o.id),0) as expenses,
  coalesce((select sum(amount) from phase4_payments p where p.order_id=o.id and p.payment_type='client_receipt'),0) as received,
  (o.order_amount - coalesce((select sum(amount) from phase4_tasks t where t.order_id=o.id),0) - coalesce((select sum(amount) from phase4_expenses e where e.order_id=o.id),0)) as estimated_profit
from phase4_orders o;

alter table phase4_orders enable row level security;
alter table phase4_tasks enable row level security;
alter table phase4_expenses enable row level security;
alter table phase4_payments enable row level security;
alter table phase4_activity_logs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname='phase4_demo_orders_all') then
    create policy phase4_demo_orders_all on phase4_orders for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='phase4_demo_tasks_all') then
    create policy phase4_demo_tasks_all on phase4_tasks for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='phase4_demo_expenses_all') then
    create policy phase4_demo_expenses_all on phase4_expenses for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='phase4_demo_payments_all') then
    create policy phase4_demo_payments_all on phase4_payments for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='phase4_demo_activity_all') then
    create policy phase4_demo_activity_all on phase4_activity_logs for all using (true) with check (true);
  end if;
end $$;

create index if not exists idx_phase4_orders_project_code on phase4_orders(project_code);
create index if not exists idx_phase4_tasks_order_id on phase4_tasks(order_id);
create index if not exists idx_phase4_expenses_order_id on phase4_expenses(order_id);
create index if not exists idx_phase4_payments_order_id on phase4_payments(order_id);

insert into phase4_orders(project_code, client_name, client_phone, city, service_type, quantity, order_amount, status, payment_status, printing_progress, stitching_progress, execution_progress, created_by, assigned_operation)
values
('PA-2026-0001','Demo Client - Society Tea','9876543210','Pune','Auto Rickshaw Hood Branding',200,119800,'printing','advance_received',60,20,0,'Sales','Ravi Kumar'),
('PA-2026-0002','Demo Client - Coaching Institute','9876500000','Nagpur','Back Panel Branding',500,74500,'execution','pending',100,100,35,'Sales','Ravi Kumar')
on conflict(project_code) do nothing;
