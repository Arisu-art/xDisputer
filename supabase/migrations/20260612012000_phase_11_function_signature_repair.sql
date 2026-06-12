-- Phase 11 function signature repair
-- Use this when Supabase reports: cannot change return type of existing function.
-- It drops only Phase 11 RPC wrappers with table return types, then the full Phase 11 SQL can recreate them.
-- This does not delete workspace, membership, assignment, profile, or generation data.

drop function if exists public.access_get_actor_context(uuid);
drop function if exists public.access_workspace_account_directory(uuid, text, text, integer, integer);

notify pgrst, 'reload schema';
