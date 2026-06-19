export const outputActivityContract = {
  owner: 'src/features/manager-output-activity',
  table: 'public.manager_disputer_output_approvals',
  managerPage: 'app/admin/output-activity-v2/page.tsx',
  decisionRoute: 'app/api/manager-output-decision/route.ts',
  generationRoute: 'app/api/generation-runs/route.ts',
  defaultRateAmount: 0,
  sourceGenerated: 'generation_success',
  status: {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    paid: 'paid'
  }
} as const;

export type OutputActivityStatus = keyof typeof outputActivityContract.status;

export function outputActivityStatusLabel(value: string | null | undefined) {
  if (value === outputActivityContract.status.approved) return 'Confirmed';
  if (value === outputActivityContract.status.rejected) return 'Returned';
  if (value === outputActivityContract.status.paid) return 'Paid';
  return 'Pending manager confirmation';
}

export function outputActivityPayAmount(outputCount: number, rateAmount: number) {
  const count = Number.isFinite(outputCount) ? Math.max(0, outputCount) : 0;
  const rate = Number.isFinite(rateAmount) ? Math.max(0, rateAmount) : 0;
  return count * rate;
}
