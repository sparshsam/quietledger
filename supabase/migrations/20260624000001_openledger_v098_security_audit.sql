-- OpenLedger v0.9.8 — Security Audit
-- Fixes deprecated auth.role() in storage bucket policies for openledger-receipts.
-- Replaces auth.role() = 'authenticated' with auth.uid() IS NOT NULL.
-- The folder-path check (storage.foldername(name)[1] = auth.uid()::text) already
-- provides cross-user isolation; this change removes the deprecated function call.

-- ============================================================
-- 1. DROP existing storage policies for openledger-receipts
-- ============================================================
drop policy if exists "Users can view own receipts" on storage.objects;
drop policy if exists "Users can upload own receipts" on storage.objects;
drop policy if exists "Users can delete own receipts" on storage.objects;

-- ============================================================
-- 2. RECREATE with auth.uid() IS NOT NULL (modern replacement)
-- ============================================================

-- SELECT — users can view their own receipts
create policy "Users can view own receipts"
  on storage.objects for select
  using (
    bucket_id = 'openledger-receipts'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT — users can upload receipts to their own folder
create policy "Users can upload own receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'openledger-receipts'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — users can delete their own receipts
create policy "Users can delete own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'openledger-receipts'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
