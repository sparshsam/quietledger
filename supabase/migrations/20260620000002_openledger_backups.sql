-- OpenLedger v0.3.0 — Cloud Backup Table
create table if not exists openledger_backups (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  backup_version  integer not null default 1,
  payload_json    jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table openledger_backups enable row level security;

drop policy if exists "Users can view own backups" on openledger_backups;
drop policy if exists "Users can insert own backups" on openledger_backups;
drop policy if exists "Users can delete own backups" on openledger_backups;

create policy "Users can view own backups"
  on openledger_backups for select
  using (auth.uid() = user_id);

create policy "Users can insert own backups"
  on openledger_backups for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own backups"
  on openledger_backups for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_openledger_backups_user_id on openledger_backups(user_id);
create index if not exists idx_openledger_backups_created_at on openledger_backups(created_at);

-- Updated at trigger
drop trigger if exists set_updated_at on openledger_backups;
create trigger set_updated_at before update on openledger_backups
  for each row execute function openledger_set_updated_at();
