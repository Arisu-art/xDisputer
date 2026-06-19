export type ClientDashboardSurface = {
  primaryTitle: string;
  primarySubtitle: string;
  entitlementSurface: 'dashboard-command-card';
  headerEntitlementSurface: 'hidden';
  accountSurface: 'canonical-account-dock';
};

export const clientDashboardSurface: ClientDashboardSurface = {
  primaryTitle: 'Continue active packet',
  primarySubtitle: 'Resume the active packet workflow from the dashboard command card.',
  entitlementSurface: 'dashboard-command-card',
  headerEntitlementSurface: 'hidden',
  accountSurface: 'canonical-account-dock'
};

export function explainClientDashboardSurface() {
  return 'The dashboard command card is the only output-limit surface; the top header is a compact route header; account actions live in the canonical account dock.';
}
