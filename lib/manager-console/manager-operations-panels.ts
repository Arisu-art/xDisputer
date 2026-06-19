export type ManagerOperationsPanel = 'monitoring' | 'access' | 'reports' | 'payroll' | 'requests';

export const managerOperationsPanels: Array<{ id: ManagerOperationsPanel; label: string; href: string; purpose: string }> = [
  { id: 'monitoring', label: 'Monitoring', href: '/admin?panel=monitoring', purpose: 'Monitor outputs and operational status of assigned users.' },
  { id: 'access', label: 'Access control of user', href: '/admin?panel=access', purpose: 'Manage user account status, approval, and operational metadata.' },
  { id: 'reports', label: 'Report', href: '/admin?panel=reports', purpose: 'Generate a clean operational report across users and outputs.' },
  { id: 'payroll', label: 'Payroll', href: '/admin?panel=payroll', purpose: 'Compute payroll from rate, salary, and output count.' },
  { id: 'requests', label: 'Request', href: '/admin?panel=requests', purpose: 'Review pending confirmations and account requests.' }
];

export function normalizeManagerOperationsPanel(value: string | string[] | undefined): ManagerOperationsPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'access' || panel === 'clients') return 'access';
  if (panel === 'reports' || panel === 'report') return 'reports';
  if (panel === 'payroll') return 'payroll';
  if (panel === 'requests' || panel === 'request' || panel === 'intake' || panel === 'review') return 'requests';
  return 'monitoring';
}

export function managerOperationsNavItems(activePanel: ManagerOperationsPanel) {
  return [
    ...managerOperationsPanels.map((panel) => ({ href: panel.href, label: panel.label, active: panel.id === activePanel })),
    { href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }
  ];
}
