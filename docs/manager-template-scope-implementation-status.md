# Manager Template Scope Implementation Status

## Goal

Manager-owned templates are the default templates for every client assigned to that manager. Clients should use those manager defaults for all rounds and dynamic template outputs.

## Coded in this batch

1. `lib/manager-template-scope.ts`
   - Resolves whether the requester is a manager/master or an assigned client.
   - For managers: template manager is the current user.
   - For clients: template manager is the assigned manager from `profiles.manager_id` or `manager_client_assignments`.
   - Exposes `assertCanManageManagerTemplates` so client template mutation can be blocked by API code.

2. `supabase/migrations/20260614101000_manager_template_scope.sql`
   - Adds `manager_client_assignments`.
   - Adds manager ownership fields on `template_assets`:
     - `manager_user_id`
     - `uploaded_by_user_id`
     - `template_scope`
   - Adds manager-scoped active-slot uniqueness.
   - Adds manager resolution RPC.
   - Adds manager-scoped activation RPC.

3. `lib/supabase/template-registry.ts`
   - Template storage paths now support manager-scoped paths.
   - Active-template listing can be filtered by manager user id.

4. `lib/user-facing-error.ts`
   - Adds `MANAGER_TEMPLATE` error category.
   - Explains manager assignment missing, client upload blocked, and manager template missing cases in user-friendly language.

5. `scripts/manager-template-scope-guard.mjs`
   - Guards the manager template scope helper, schema migration, and storage helper.

## Important implementation note

The connector blocked the larger API route and RLS rewrites in this batch. Do not treat manager-only upload as complete until the next API wiring step is merged.

## Still pending before production promotion

1. Patch `/api/template-assets`:
   - Resolve manager template scope for GET.
   - Require manager/master for POST and DELETE.
   - Insert `manager_user_id`, `uploaded_by_user_id`, and `template_scope`.
   - Activate with `app_activate_manager_template_asset_v1`.

2. Patch `/api/template-assets/file`:
   - Clients must resolve templates from assigned manager scope.
   - Missing manager template should return `MANAGER_TEMPLATE` error payload.

3. Patch `/api/template-assets/manifest`:
   - Manifest should expose manager template scope and manager template provenance.

4. Add final DB RLS policies:
   - Managers can mutate their own templates.
   - Assigned clients can read active manager templates.
   - Clients cannot insert, update, delete, or activate templates.

## Required production behavior

- Manager uploads default templates.
- All assigned clients use those manager defaults.
- Clients cannot upload templates.
- Client output consistency is controlled by the manager's active template versions and hashes.
