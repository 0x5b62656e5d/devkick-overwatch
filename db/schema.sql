-- Overwatch backend schema.
-- Apply with: bun run db:migrate  (requires DATABASE_URL)
--
-- Multi-tenancy: every row in events/incidents is scoped by tenant_id.
-- All queries filter on tenant_id explicitly; row-level security policies
-- below provide defence-in-depth when the app connects as a non-owner role
-- (the table owner bypasses RLS unless FORCE ROW LEVEL SECURITY is set).
-- The app sets `app.tenant_id` via SET LOCAL inside each transaction.

create extension if not exists pgcrypto;

create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists api_keys (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  key_hash      text not null unique,          -- sha256 hex of the full key
  key_prefix    text not null,                 -- first chars, for display only
  scopes        text[] not null default '{ingest}',
  rate_limit_rpm int not null default 120 check (rate_limit_rpm > 0),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists api_keys_tenant_idx on api_keys(tenant_id);

-- Ingested events (browser errors, user reports). Duplicate handling:
-- rows are grouped by (tenant_id, fingerprint); repeats bump
-- `occurrences` and `last_seen_at` instead of inserting new rows.
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  kind          text not null check (kind in ('browser-error', 'user-report')),
  fingerprint   text not null,
  message       text not null,
  stack         text,
  url           text,
  release       text,
  environment   text,
  metadata      jsonb not null default '{}',
  occurred_at   timestamptz not null default now(),  -- client-reported time
  first_seen_at timestamptz not null default now(),  -- server-side
  last_seen_at  timestamptz not null default now(),  -- server-side
  occurrences   integer not null default 1 check (occurrences > 0),
  unique (tenant_id, fingerprint)
);

create index if not exists events_tenant_seen_idx on events(tenant_id, last_seen_at desc);
create index if not exists events_tenant_kind_idx on events(tenant_id, kind);

create table if not exists incidents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null,
  description text not null default '',
  status      text not null default 'open'
                check (status in ('open', 'acknowledged', 'resolved')),
  severity    smallint not null default 3 check (severity between 1 and 5),
  assignee    text,
  labels      text[] not null default '{}',
  source      text not null default 'manual',  -- 'manual' | 'detector' | ...
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists incidents_tenant_status_idx on incidents(tenant_id, status);
create index if not exists incidents_tenant_created_idx on incidents(tenant_id, created_at desc);

-- Events linked to an incident.
create table if not exists incident_events (
  incident_id uuid not null references incidents(id) on delete cascade,
  event_id    uuid not null references events(id) on delete cascade,
  linked_at   timestamptz not null default now(),
  primary key (incident_id, event_id)
);

create index if not exists incident_events_event_idx on incident_events(event_id);

-- Row-level security: rows are only visible when the transaction sets
-- `app.tenant_id` (done by db.ts's withTenant). Effective when the app
-- connects as a non-owner role; explicit tenant_id predicates are still
-- applied by every query regardless.

alter table events enable row level security;
alter table incidents enable row level security;
alter table incident_events enable row level security;
alter table api_keys enable row level security;
alter table tenants enable row level security;

drop policy if exists tenant_isolation_events on events;
create policy tenant_isolation_events on events
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists tenant_isolation_incidents on incidents;
create policy tenant_isolation_incidents on incidents
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

drop policy if exists tenant_isolation_incident_events on incident_events;
create policy tenant_isolation_incident_events on incident_events
  using (exists (
    select 1 from incidents i
    where i.id = incident_events.incident_id
      and i.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  ))
  with check (exists (
    select 1 from incidents i
    where i.id = incident_events.incident_id
      and i.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  ));

drop policy if exists tenant_isolation_api_keys on api_keys;
create policy tenant_isolation_api_keys on api_keys
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- Tenants see only their own row under RLS.
drop policy if exists tenant_isolation_tenants on tenants;
create policy tenant_isolation_tenants on tenants
  using (id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  with check (id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- Authentication happens before a tenant is known, so key lookup can't
-- run under tenant-scoped RLS. This SECURITY DEFINER function (owned by
-- the table owner, which bypasses RLS) resolves a key hash to its
-- tenant/scopes. It only returns a row for an exact hash match.
create or replace function lookup_api_key(p_hash text)
returns table(key_id uuid, tenant_id uuid, scopes text[], rate_limit_rpm int)
language sql stable security definer set search_path = public as $$
  select id, tenant_id, scopes, rate_limit_rpm
  from api_keys
  where key_hash = p_hash and revoked_at is null
$$;

-- Same reason: usage timestamps are recorded before/without a tenant
-- transaction, so they need owner privileges to pass RLS.
create or replace function touch_api_key(p_key_id uuid)
returns void
language sql security definer set search_path = public as $$
  update api_keys set last_used_at = now() where id = p_key_id
$$;

-- Optional: least-privilege app role. Uncomment after creating the role,
-- then point DATABASE_URL at it so RLS is enforced at the database level.
--
--   create role overwatch_app login password '...';
--   grant connect on database overwatch to overwatch_app;
--   grant usage on schema public to overwatch_app;
--   grant select, insert, update, delete on all tables in schema public to overwatch_app;
