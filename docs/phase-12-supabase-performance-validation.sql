-- Phase 12 — Supabase performance validation
-- Run this in Supabase SQL Editor after applying:
--   supabase/migrations/20260612021000_phase_12_instant_reload_performance.sql
--
-- Replace the email below if validating as a different master/manager account.

-- ============================================================
-- 1. Confirm required Phase 11/12 RPCs exist
-- ============================================================

select
  p.proname as function_name,
  p.oid::regprocedure::text as signature
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'access_workspace_account_summary_v1',
    'access_workspace_account_directory_v1',
    'access_workspace_attention_queue_v1',
    'access_workspace_master_control_v1',
    'access_workspace_manager_control_v1'
  )
order by function_name, signature;

-- Expected: all five function names should appear.

-- ============================================================
-- 2. Confirm Phase 12 indexes exist
-- ============================================================

select
  schemaname,
  tablename,
  indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_workspace_members_workspace_role_status_profile',
    'idx_workspace_members_profile_workspace',
    'idx_client_manager_assignments_primary_client_active',
    'idx_client_manager_assignments_primary_manager_active',
    'idx_profiles_role_status_updated',
    'idx_profiles_manager_status_updated',
    'idx_template_assets_owner_round_active_slot',
    'idx_generation_runs_owner_created'
  )
order by tablename, indexname;

-- Expected: all eight index names should appear.

-- ============================================================
-- 3. Simulate master auth context
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where lower(email) = lower('mycoquibuyen2002@gmail.com')
    limit 1
  ),
  false
);

-- Confirm auth.uid() is now visible to SECURITY DEFINER RPCs.
select auth.uid() as simulated_auth_uid;

-- ============================================================
-- 4. Measure summary RPC
-- ============================================================

explain (analyze, buffers)
select *
from public.access_workspace_account_summary_v1(null::uuid);

-- Expected: fast execution. On a small database, total runtime should usually be low.
-- Watch for avoidable sequential scans as profile/member counts grow.

-- ============================================================
-- 5. Measure compact attention queue RPC
-- ============================================================

explain (analyze, buffers)
select *
from public.access_workspace_attention_queue_v1(null::uuid, 5);

-- Expected: returns only the top attention rows needed by `/master` and dashboards.

-- ============================================================
-- 6. Measure paginated directory RPCs used by dashboards
-- ============================================================

explain (analyze, buffers)
select *
from public.access_workspace_account_directory_v1(
  null::uuid,
  'pending',
  null,
  1,
  5
);

explain (analyze, buffers)
select *
from public.access_workspace_account_directory_v1(
  null::uuid,
  'active',
  null,
  1,
  5
);

explain (analyze, buffers)
select *
from public.access_workspace_account_directory_v1(
  null::uuid,
  'blocked',
  null,
  1,
  5
);

-- ============================================================
-- 7. Smoke-test direct outputs
-- ============================================================

select *
from public.access_workspace_account_summary_v1(null::uuid);

select *
from public.access_workspace_attention_queue_v1(null::uuid, 5);

select *
from public.access_workspace_account_directory_v1(null::uuid, 'pending', null, 1, 5);

-- If any RPC fails with a schema cache message, run this and retry:
notify pgrst, 'reload schema';
