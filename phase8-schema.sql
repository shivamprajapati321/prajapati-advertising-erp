create table if not exists enterprise_kpis (
  id uuid primary key default gen_random_uuid(),
  project_name text,
  total_revenue numeric,
  total_expense numeric,
  profit numeric,
  created_at timestamp default now()
);