-- OpenLedger v0.9.0 — Supabase Readiness
-- Creates devices, sync_events, receipts tables.
-- Fixes RLS: adds WITH CHECK to UPDATE policies, replaces deprecated auth.role().
-- All tables use openledger_ prefix for shared-project isolation.
-- Auth remains optional; all user_id columns scope rows to auth.uid().

-- ============================================================
-- 1. DEVICES — multi-device sync registry
-- ============================================================
create table if not exists openledger_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  device_name   text not null,
  device_type   text,
  device_id     text not null,
  last_sync_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table openledger_devices enable row level security;

create policy "Users can view own devices"
  on openledger_devices for select
  using (auth.uid() = user_id);

create policy "Users can insert own devices"
  on openledger_devices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own devices"
  on openledger_devices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own devices"
  on openledger_devices for delete
  using (auth.uid() = user_id);

create index if not exists idx_openledger_devices_user_id on openledger_devices(user_id);
create index if not exists idx_openledger_devices_device_id on openledger_devices(device_id);

-- ============================================================
-- 2. SYNC EVENTS — sync operation history
-- ============================================================
create table if not exists openledger_sync_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  device_id       uuid references openledger_devices(id) on delete set null,
  sync_type       text not null default 'full',
  status          text not null default 'pending',
  started_at      timestamptz,
  completed_at    timestamptz,
  error_message   text,
  records_synced  integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table openledger_sync_events enable row level security;

create policy "Users can view own sync events"
  on openledger_sync_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own sync events"
  on openledger_sync_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sync events"
  on openledger_sync_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sync events"
  on openledger_sync_events for delete
  using (auth.uid() = user_id);

create index if not exists idx_openledger_sync_events_user_id on openledger_sync_events(user_id);
create index if not exists idx_openledger_sync_events_status on openledger_sync_events(status);
create index if not exists idx_openledger_sync_events_created_at on openledger_sync_events(created_at);

-- ============================================================
-- 3. RECEIPTS — receipt/image attachment metadata
-- ============================================================
create table if not exists openledger_receipts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  transaction_id   uuid references openledger_transactions(id) on delete cascade,
  file_name        text not null,
  file_size        integer,
  mime_type        text,
  storage_url      text not null,
  created_at       timestamptz not null default now()
);

alter table openledger_receipts enable row level security;

create policy "Users can view own receipts"
  on openledger_receipts for select
  using (auth.uid() = user_id);

create policy "Users can insert own receipts"
  on openledger_receipts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own receipts"
  on openledger_receipts for delete
  using (auth.uid() = user_id);

create index if not exists idx_openledger_receipts_user_id on openledger_receipts(user_id);
create index if not exists idx_openledger_receipts_transaction_id on openledger_receipts(transaction_id);

-- ============================================================
-- 4. FIX RLS: Add WITH CHECK to existing UPDATE policies
--    Without WITH CHECK, a user could reassign user_id to another user
--    during an update. WITH CHECK validates the row state after the update.
-- ============================================================

drop policy if exists "Users can update own accounts" on openledger_accounts;
create policy "Users can update own accounts"
  on openledger_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on openledger_transactions;
create policy "Users can update own transactions"
  on openledger_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own budgets" on openledger_budgets;
create policy "Users can update own budgets"
  on openledger_budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on openledger_goals;
create policy "Users can update own goals"
  on openledger_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 5. FIX RLS: Replace deprecated auth.role() with TO clause
--    auth.role() is deprecated and breaks silently when anonymous
--    sign-ins are enabled. The TO authenticated clause is the
--    correct replacement.
-- ============================================================

drop policy if exists "Authenticated users can insert categories" on openledger_categories;
create policy "Authenticated users can insert categories"
  on openledger_categories for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update categories" on openledger_categories;
create policy "Authenticated users can update categories"
  on openledger_categories for update
  to authenticated
  using (true);

-- ============================================================
-- 6. INDEX — categorize new tables for advisory queries
-- ============================================================
comment on table openledger_devices is 'OpenLedger: multi-device sync registry';
comment on table openledger_sync_events is 'OpenLedger: sync operation history';
comment on table openledger_receipts is 'OpenLedger: receipt/image attachment metadata';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
