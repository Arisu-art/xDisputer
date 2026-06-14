# Manager Template Scope Implementation Status

## Goal

Manager-owned templates are the default templates for every client assigned to that manager. Clients use those manager defaults for all rounds and dynamic template outputs. Clients do not upload, replace, remove, or override templates.

## Roadmap status

| Phase | Status | Notes |
|---|---|---|
| 0. Role and scope helper | Coded | `resolveManagerTemplateScope` resolves manager self, master self, or assigned manager. |
| 1. Assignment schema | Coded | `manager_client_assignments` plus backfill from `profiles.manager_id`. |
| 2. Manager-scoped template assets | Coded | `manager_user_id`, `uploaded_by_user_id`, `template_scope`, manager active-slot uniqueness. |
| 3. Upload/delete/activation restriction | Coded in API and SQL metadata layer | `/api/template-assets` blocks clients and writes manager metadata. SQL Editor safe script covers public-table RLS. |
| 4. Template file and manifest resolution | Coded | `/api/template-assets/file` and `/api/template-assets/manifest` resolve assigned-manager templates. |
| 5. Client read-only template UI | Coded through UI wiring | Client template controls show manager-controlled/read-only state and use manager defaults. |
| 6. Manager template control UI | Coded through existing template workspace | Managers keep upload/replace/remove controls; labels now identify manager default templates. |
| 7. Error flyout expansion | Coded | `MANAGER_TEMPLATE` category covers assignment missing, upload locked, and missing manager templates. |
| 8. Generation manifest proof | Coded | Manifest v1.2.0 records manager template provenance, asset ids, hashes, manager ids. |
| 9. Regression guards | Partially coded | Existing manager scope guard covers API/storage. Complete UI guard creation was blocked by connector safety. Local safety runs UI/storage wiring before checks. |

## Coded files

- `lib/manager-template-scope.ts`
- `lib/manager-template-ui.ts`
- `lib/supabase/template-registry.ts`
- `lib/supabase/template-storage-service.ts`
- `lib/user-facing-error.ts`
- `lib/generation-manifest.ts`
- `app/api/template-assets/route.ts`
- `app/api/template-assets/file/route.ts`
- `app/api/template-assets/manifest/route.ts`
- `components/TemplateProgressiveWorkspace.tsx`
- `scripts/apply-manager-template-storage-wiring.mjs`
- `scripts/apply-manager-template-ui-wiring.mjs`
- `scripts/phase14-local-safety-check.mjs`
- `scripts/manager-template-scope-guard.mjs`
- `supabase/migrations/20260614101000_manager_template_scope.sql`
- `supabase/sql/manager_template_public_schema_only.sql`

## Database status

Run `supabase/sql/manager_template_public_schema_only.sql` in Supabase SQL Editor. Do not run `storage.objects` policy SQL in SQL Editor because hosted Supabase owns that table.

## Storage status

Template storage is now routed through `lib/supabase/template-storage-service.ts`. It uses `SUPABASE_SERVICE_ROLE_KEY` on the server when available, which avoids relying on direct client ownership of `storage.objects` policies.

## Still not fully coded

1. A dedicated manager template library page with version-history table and affected-client counts is not yet built as a separate page. The existing Templates workspace is currently the manager control UI.
2. A complete standalone UI regression guard file was attempted but blocked by connector safety. Local safety still applies UI/storage wiring before typecheck/build.
3. Storage bucket policies are not applied by SQL Editor. The recommended production path is server-side service-role storage operations.

## Production behavior expected

- Manager uploads default templates.
- All assigned clients use those manager defaults.
- Clients cannot upload templates through the API.
- Client UI shows manager-controlled template state.
- Generation uses manager template assets and records manager provenance in `generation-manifest.json`.
