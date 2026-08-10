-- Harris Web Works — Freelance Dashboard
-- Schema: prospecting pipeline, call activity, clients, projects, intake, money.
--
-- Run this once in the Supabase SQL Editor for the Freelance_Dashboard project.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Mirrors the real cold-call flow: you dial (attempting), you reach a human
-- (contacted), they agree to a next conversation (interested), you send a price
-- or demo (quoted), it closes either way.
create type prospect_stage as enum (
  'new',
  'attempting',
  'contacted',
  'interested',
  'quoted',
  'won',
  'lost'
);

-- Why a prospect died. Previously buried in free-text notes, which made it
-- impossible to answer "how many numbers are dead?" or "how many already have
-- a site?" without reading all 83 rows.
create type lost_reason as enum (
  'not_interested',
  'not_icp',
  'has_website',
  'bad_number',
  'no_budget',
  'using_someone_else',
  'no_answer_exhausted',
  'other'
);

create type call_outcome as enum (
  'no_answer',
  'voicemail',
  'spoke',
  'gatekeeper',
  'callback_scheduled',
  'bad_number',
  'wrong_number',
  'not_interested',
  'texted',
  'emailed'
);

create type website_status as enum (
  'none',
  'social_only',
  'sitebuilder',
  'has_website',
  'unknown'
);

create type client_status as enum ('active', 'past', 'prospective');

create type project_type as enum (
  'website',
  'mobile_app',
  'crm_integration',
  'crm_build',
  'maintenance',
  'other'
);

create type project_status as enum (
  'intake',
  'design',
  'build',
  'review',
  'launched',
  'on_hold',
  'cancelled'
);

create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');

-- ---------------------------------------------------------------------------
-- Prospects — the pipeline
-- ---------------------------------------------------------------------------

create table prospects (
  id                uuid primary key default gen_random_uuid(),
  business_name     text not null,
  contact_name      text,
  phone             text,
  email             text,
  category          text,
  city              text,
  description       text,
  why_reliable      text,
  source            text,
  source_url        text,
  website_status    website_status not null default 'unknown',
  stage             prospect_stage not null default 'new',
  lost_reason       lost_reason,
  quoted_amount     numeric(10,2),
  next_action_at    date,
  last_contacted_at timestamptz,
  call_count        integer not null default 0,
  legacy_attempts   integer,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column prospects.call_count is
  'Denormalized count of rows in calls, maintained by trigger. Replaces "Called multiple times".';
comment on column prospects.legacy_attempts is
  'Attempts inferred from the old spreadsheet notes ("Called twice" -> 2). Historical only: '
  'the spreadsheet had no call dates, so these are NOT real rows in the calls table and are '
  'excluded from connect-rate math. Live metrics start from the first call logged in the app.';
comment on column prospects.next_action_at is
  'The single source of truth for "who do I call today". Replaces the Yes/No follow-up column.';

create index prospects_stage_idx on prospects (stage);
create index prospects_next_action_idx on prospects (next_action_at)
  where next_action_at is not null;
create index prospects_category_idx on prospects (category);

-- Free-text search across the fields you actually search by.
create index prospects_search_idx on prospects using gin (
  to_tsvector('english',
    coalesce(business_name, '') || ' ' ||
    coalesce(contact_name, '')  || ' ' ||
    coalesce(category, '')      || ' ' ||
    coalesce(notes, '')
  )
);

-- ---------------------------------------------------------------------------
-- Calls — one row per dial attempt
-- ---------------------------------------------------------------------------

create table calls (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references prospects (id) on delete cascade,
  called_at      timestamptz not null default now(),
  outcome        call_outcome not null,
  notes          text,
  duration_mins  integer,
  created_at     timestamptz not null default now()
);

create index calls_prospect_idx on calls (prospect_id, called_at desc);
create index calls_called_at_idx on calls (called_at desc);

-- ---------------------------------------------------------------------------
-- Clients — a prospect that closed, or someone who came in directly
-- ---------------------------------------------------------------------------

create table clients (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid references prospects (id) on delete set null,
  business_name text not null,
  contact_name  text,
  phone         text,
  email         text,
  city          text,
  status        client_status not null default 'active',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index clients_status_idx on clients (status);

-- ---------------------------------------------------------------------------
-- Projects — the actual build, plus where everything lives
-- ---------------------------------------------------------------------------

create table projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients (id) on delete cascade,
  name         text not null,
  type         project_type not null default 'website',
  status       project_status not null default 'intake',
  price        numeric(10,2),
  started_on   date,
  launched_on  date,

  -- Your standard stack, from the intake form. Kept per-project because the
  -- client owns these accounts and you may need them years later.
  live_url          text,
  repo_url          text,
  domain            text,
  domain_registrar  text default 'NameCheap',
  hosting           text default 'Cloudflare',
  form_endpoint     text default 'FormBackend',

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_client_idx on projects (client_id);
create index projects_status_idx on projects (status);

-- ---------------------------------------------------------------------------
-- Intake forms — the Word doc questionnaire, as a shareable link
-- ---------------------------------------------------------------------------

create table intake_forms (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients (id) on delete set null,
  project_id uuid references projects (id) on delete set null,

  -- Random URL-safe token. The public form lives at /intake/<token>.
  -- Derived from gen_random_uuid() rather than pgcrypto's gen_random_bytes so
  -- this carries no extension dependency: 32 hex chars, 122 bits of entropy.
  token text not null unique
    default replace(gen_random_uuid()::text, '-', ''),

  -- Answers, mapping 1:1 to the questions in Client Website Intake Form.docx
  business_name      text,
  what_business_does text,
  best_contact       text,
  service_area       text,
  pages_wanted       text[],
  reference_sites    text,
  has_content        text,
  special_requests   text,
  anything_else      text,

  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

create index intake_forms_token_idx on intake_forms (token);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------

create table invoices (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  amount      numeric(10,2) not null,
  status      invoice_status not null default 'draft',
  description text,
  issued_on   date,
  due_on      date,
  paid_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index invoices_project_idx on invoices (project_id);
create index invoices_status_idx on invoices (status);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
-- Pinned empty so the function can't be hijacked by a caller's search_path.
-- Supabase's security advisor flags mutable search_path on SECURITY DEFINER-ish
-- functions; references below are schema-qualified to match.
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prospects_touch before update on prospects
  for each row execute function touch_updated_at();
create trigger clients_touch before update on clients
  for each row execute function touch_updated_at();
create trigger projects_touch before update on projects
  for each row execute function touch_updated_at();
create trigger invoices_touch before update on invoices
  for each row execute function touch_updated_at();

-- Logging a call updates the prospect's rollup fields, so the pipeline list
-- never has to aggregate the calls table to show "last contacted".
create or replace function sync_prospect_after_call()
returns trigger
language plpgsql
-- Pinned empty so the function can't be hijacked by a caller's search_path.
-- Supabase's security advisor flags mutable search_path on SECURITY DEFINER-ish
-- functions; references below are schema-qualified to match.
set search_path = ''
as $$
begin
  update public.prospects p
  set
    call_count        = (select count(*) from public.calls c where c.prospect_id = p.id),
    last_contacted_at = (select max(c.called_at) from public.calls c where c.prospect_id = p.id)
  where p.id = coalesce(new.prospect_id, old.prospect_id);

  return coalesce(new, old);
end;
$$;

create trigger calls_sync_prospect
  after insert or update or delete on calls
  for each row execute function sync_prospect_after_call();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- This is a single-operator tool. Any signed-in user gets full access; the
-- anon key gets nothing. The public intake form deliberately does NOT rely on
-- anon policies — it writes through a server route using the service role key,
-- so a leaked anon key can't enumerate or modify intake records.
-- ---------------------------------------------------------------------------

alter table prospects    enable row level security;
alter table calls        enable row level security;
alter table clients      enable row level security;
alter table projects     enable row level security;
alter table intake_forms enable row level security;
alter table invoices     enable row level security;

create policy "authenticated full access" on prospects
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on calls
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on clients
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on projects
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on intake_forms
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on invoices
  for all to authenticated using (true) with check (true);
