-- Phase 7 Production Control Schema for Prajapati Advertising ERP
create table if not exists project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  document_type text not null,
  title text not null,
  file_url text,
  visible_to_client boolean default false,
  uploaded_by text,
  created_at timestamptz default now()
);
create table if not exists project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  risk_level text check (risk_level in ('low','medium','high','critical')) default 'medium',
  issue text not null,
  action_required text,
  status text check (status in ('open','in_progress','closed')) default 'open',
  owner_role text,
  due_date date,
  created_at timestamptz default now()
);
create table if not exists project_closure_checklist (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  checklist_item text not null,
  is_completed boolean default false,
  completed_by text,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists client_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  client_name text,
  share_token text unique not null,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists management_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  reviewed_by text,
  review_note text,
  decision text check (decision in ('continue','hold','escalate','close')) default 'continue',
  created_at timestamptz default now()
);
create index if not exists idx_project_documents_project_id on project_documents(project_id);
create index if not exists idx_project_risks_project_id on project_risks(project_id);
create index if not exists idx_project_closure_project_id on project_closure_checklist(project_id);
create index if not exists idx_client_share_links_token on client_share_links(share_token);
