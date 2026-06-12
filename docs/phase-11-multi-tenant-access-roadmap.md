# Phase 11 — Multi-Tenant Access Framework Roadmap

## Objective

Move xDisputer from a flat role model into a workspace-scoped access model that supports:

- Multiple clients
- Multiple managers
- Multiple master users
- Future organization/team isolation
- Client-manager assignment history
- Centralized access policy RPCs

## Non-negotiable rules

- Do not add quota enforcement.
- Do not add generation output limits.
- Do not break existing `profiles.manager_id` flows during transition.
- Do not remove current manager/client access controls until workspace-scoped reads are fully verified.
- All new authorization must happen through unique RPC names.
- Every client-manager assignment change must be ledgered.

---

## Phase 11A — Workspace + Membership Tables

### Status

- [x] Add `workspaces` table.
- [x] Add `workspace_members` table.
- [x] Add `workspace_invites` table.
- [x] Add `profiles.default_workspace_id`.
- [x] Add platform default workspace backfill.
- [x] Backfill existing profiles into platform workspace.
- [x] Add membership indexes.
- [x] Enable RLS on new workspace tables.
- [ ] Verify platform workspace exists in Supabase.
- [ ] Verify all existing profiles have `default_workspace_id`.
- [ ] Verify each existing profile has a `workspace_members` row.

### Purpose

Every account should operate inside a workspace. The initial migration creates a default `platform` workspace so existing accounts continue working without destructive changes.

---

## Phase 11B — Central Access Policy RPCs

### Status

- [x] Add `access_get_actor_context(workspace_id_input uuid)`.
- [x] Add `access_can_manage_account(target_profile_id_input uuid, workspace_id_input uuid)`.
- [x] Add `access_workspace_account_directory(...)`.
- [ ] Add UI helper for actor context.
- [ ] Add UI helper for workspace directory.
- [ ] Replace remaining flat directory reads with workspace directory RPC after verification.
- [ ] Add master-only workspace policy diagnostics page.

### Purpose

Access decisions should not be scattered through pages. Pages should ask one central policy layer:

```text
Who is this actor?
Which workspace are they acting in?
What can they do?
Can they manage this target?
```

---

## Phase 11C — Client Assignment Ledger

### Status

- [x] Add `client_manager_assignments` table.
- [x] Add `client_assignment_events` table.
- [x] Backfill existing `profiles.manager_id` into assignment records.
- [x] Add active primary assignment uniqueness constraint.
- [x] Add assignment indexes.
- [x] Add `access_workspace_assign_client(...)`.
- [x] Add `access_workspace_activate_client_assignment(...)`.
- [x] Add `access_workspace_revoke_client_assignment(...)`.
- [ ] Add manager/master UI for assignment timeline.
- [ ] Add transfer-client flow.
- [ ] Add wrong-invite recovery flow.
- [ ] Add manager offboarding workflow.

### Purpose

`profiles.manager_id` is only a fast pointer. The assignment ledger becomes the durable history:

```text
Client was assigned to Manager A
→ approved by Manager A
→ transferred to Manager B
→ revoked by Master C
```

---

## Deployment checklist

1. Run `supabase/migrations/20260612001000_phase_11_multi_tenant_access.sql` in Supabase SQL Editor.
2. Run local guard:

```bash
cd /workspaces/xDisputer
npm run xdisputer:guard
```

3. Deploy:

```bash
./scripts/safe-ship.sh "db: add multi-tenant access foundation"
```

4. Verify in Supabase:

```sql
select slug, name, status from public.workspaces;
select count(*) from public.profiles where default_workspace_id is null;
select workspace_role, membership_status, count(*) from public.workspace_members group by 1, 2 order by 1, 2;
select assignment_status, count(*) from public.client_manager_assignments group by 1 order by 1;
```

---

## Next phase after verification

Phase 11D should wire the UI to the workspace-scoped RPCs:

- `lib/saas/workspace-access.ts`
- `/master/workspaces`
- `/master/assignments`
- manager assignment timeline view
- transfer client flow
- workspace-scoped account directory replacement
