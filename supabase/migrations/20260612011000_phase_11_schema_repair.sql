-- Phase 11 schema repair
-- Fixes partially-created Phase 11 tables where CREATE TABLE IF NOT EXISTS skipped missing columns.
-- Run before re-running the main Phase 11 migration if Supabase reports a missing column such as workspace_status.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid()
);

alter table public.workspaces add column if not exists name text;
alter table public.workspaces add column if not exists slug text;
alter table public.workspaces add column if not exists workspace_status text not null default 'active';
alter table public.workspaces add column if not exists created_by uuid null;
alter table public.workspaces add column if not exists metadata_json jsonb not null default '{}'::jsonb;
alter table public.workspaces add column if not exists created_at timestamptz not null default now();
alter table public.workspaces add column if not exists updated_at timestamptz not null default now();

update public.workspaces set name = coalesce(nullif(trim(name), ''), 'xDisputer Default Workspace');
update public.workspaces set slug = coalesce(nullif(trim(slug), ''), 'default-' || id::text) where slug is null or trim(slug) = '';
update public.workspaces set workspace_status = 'active' where workspace_status is null;

alter table public.workspaces alter column name set not null;
alter table public.workspaces alter column slug set not null;

create unique index if not exists workspaces_slug_uidx on public.workspaces(slug);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid()
);

alter table public.workspace_members add column if not exists workspace_id uuid;
alter table public.workspace_members add column if not exists profile_id uuid;
alter table public.workspace_members add column if not exists member_role text not null default 'client';
alter table public.workspace_members add column if not exists member_scope text not null default 'workspace';
alter table public.workspace_members add column if not exists membership_status text not null default 'active';
alter table public.workspace_members add column if not exists is_primary boolean not null default true;
alter table public.workspace_members add column if not exists created_by uuid null;
alter table public.workspace_members add column if not exists joined_at timestamptz null;
alter table public.workspace_members add column if not exists created_at timestamptz not null default now();
alter table public.workspace_members add column if not exists updated_at timestamptz not null default now();

create unique index if not exists workspace_members_workspace_profile_uidx on public.workspace_members(workspace_id, profile_id);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid()
);

alter table public.workspace_invites add column if not exists workspace_id uuid;
alter table public.workspace_invites add column if not exists created_by uuid null;
alter table public.workspace_invites add column if not exists invite_code text;
alter table public.workspace_invites add column if not exists invite_role text not null default 'client';
alter table public.workspace_invites add column if not exists invite_status text not null default 'active';
alter table public.workspace_invites add column if not exists expires_at timestamptz null;
alter table public.workspace_invites add column if not exists used_by uuid null;
alter table public.workspace_invites add column if not exists used_at timestamptz null;
alter table public.workspace_invites add column if not exists metadata_json jsonb not null default '{}'::jsonb;
alter table public.workspace_invites add column if not exists created_at timestamptz not null default now();
alter table public.workspace_invites add column if not exists updated_at timestamptz not null default now();

create unique index if not exists workspace_invites_invite_code_uidx on public.workspace_invites(invite_code) where invite_code is not null;

create table if not exists public.client_manager_assignments (
  id uuid primary key default gen_random_uuid()
);

alter table public.client_manager_assignments add column if not exists workspace_id uuid;
alter table public.client_manager_assignments add column if not exists client_id uuid;
alter table public.client_manager_assignments add column if not exists manager_id uuid;
alter table public.client_manager_assignments add column if not exists assignment_role text not null default 'primary';
alter table public.client_manager_assignments add column if not exists assignment_status text not null default 'pending';
alter table public.client_manager_assignments add column if not exists requested_by uuid null;
alter table public.client_manager_assignments add column if not exists assigned_by uuid null;
alter table public.client_manager_assignments add column if not exists approved_by uuid null;
alter table public.client_manager_assignments add column if not exists revoked_by uuid null;
alter table public.client_manager_assignments add column if not exists created_at timestamptz not null default now();
alter table public.client_manager_assignments add column if not exists approved_at timestamptz null;
alter table public.client_manager_assignments add column if not exists revoked_at timestamptz null;
alter table public.client_manager_assignments add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists public.client_assignment_events (
  id uuid primary key default gen_random_uuid()
);

alter table public.client_assignment_events add column if not exists assignment_id uuid null;
alter table public.client_assignment_events add column if not exists workspace_id uuid;
alter table public.client_assignment_events add column if not exists client_id uuid;
alter table public.client_assignment_events add column if not exists manager_id uuid null;
alter table public.client_assignment_events add column if not exists actor_id uuid null;
alter table public.client_assignment_events add column if not exists event_type text not null default 'assignment_event';
alter table public.client_assignment_events add column if not exists from_status text null;
alter table public.client_assignment_events add column if not exists to_status text null;
alter table public.client_assignment_events add column if not exists metadata_json jsonb not null default '{}'::jsonb;
alter table public.client_assignment_events add column if not exists created_at timestamptz not null default now();

create index if not exists workspaces_status_idx on public.workspaces(workspace_status, created_at desc);
create index if not exists workspace_members_profile_idx on public.workspace_members(profile_id, membership_status, created_at desc);
create index if not exists workspace_members_workspace_role_idx on public.workspace_members(workspace_id, member_role, membership_status, created_at desc);
create index if not exists workspace_invites_workspace_status_idx on public.workspace_invites(workspace_id, invite_status, created_at desc);
create index if not exists client_assignments_workspace_client_idx on public.client_manager_assignments(workspace_id, client_id, assignment_status, created_at desc);
create index if not exists client_assignments_workspace_manager_idx on public.client_manager_assignments(workspace_id, manager_id, assignment_status, created_at desc);
create index if not exists client_assignment_events_workspace_idx on public.client_assignment_events(workspace_id, created_at desc);

create unique index if not exists client_assignments_one_active_primary_idx
on public.client_manager_assignments(workspace_id, client_id)
where assignment_status = 'active' and assignment_role = 'primary';

notify pgrst, 'reload schema';
