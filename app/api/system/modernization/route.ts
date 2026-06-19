import { jsonOk } from '../../../../src/server/http/api-response';

export const dynamic = 'force-dynamic';

const coded = [
  'docs/modernization-implementation-tracker.md',
  'docs/modernization-boundary-contract.md',
  'src/features/README.md',
  'src/server/README.md',
  'src/server/contracts/service-result.ts',
  'src/server/http/api-response.ts',
  'scripts/modernization-boundary-guard.mjs'
] as const;

const deferred = [
  'Tailwind v4 package installation',
  'shadcn/ui primitives',
  'Zod package installation',
  'TanStack Query installation',
  'large component split',
  'root CSS reduction'
] as const;

export function GET() {
  return jsonOk({
    layer: 'modernization-boundary',
    status: 'phase-1-coded',
    coded,
    deferred,
    nextAction: 'repair package-lock, then add Zod and convert one API route to service-layer boundaries'
  });
}
