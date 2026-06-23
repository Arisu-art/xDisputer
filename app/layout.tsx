import { Suspense } from 'react';
import './root-css-workspace-foundation.css';
import './root-css-template-pipeline.css';
import './root-css-client-portal.css';
import './root-css-console-shell.css';
import './root-css-contracts.css';
import './account-menu-ratio-system.css';
import './final-console-account-rail.css';
import './client-account-popover-ratio.css';
import './account-popover-compact-retirement.css';
import './template-workspace-hubs.css';
import './client-template-runtime.css';
import './dynamic-template-intelligence.css';
import './final-responsive-integrity.css';
import './manager-owned-docx-studio.css';
import './account-bell-avatar-row.css';
import './ui-theme-contracts.css';
import './ui-layout-contracts.css';
import './console-sticky-compact-header.css';
import './console-navigation-polish.css';
import './account-record-density.css';
import './manager-payroll-modal.css';
import './output-activity-flow.css';
import './client-payroll-profile-flow.css';
import './output-activity-unread-badge.css';
import './access-state-lightweight.css';
import './workflow-header-slim.css';
import './supporting-documents-layout-polish.css';
import './supporting-documents-wide-stage.css';
import './console-debug-overlay.css';
import ControlNavGlobalTelemetry from '../components/control/ControlNavGlobalTelemetry';
import RenderDebuggerMount from '../components/console/RenderDebuggerMount';
import OutputActivityRealtimeRefreshMount from '../components/notifications/OutputActivityRealtimeRefreshMount';
import OutputActivityUnreadBadgeMount from '../components/notifications/OutputActivityUnreadBadgeMount';
import GlobalTopbarActionsMount from '../components/shell/GlobalTopbarActionsMount';
import ClientPayrollProfileSyncMount from '../components/client/ClientPayrollProfileSyncMount';
import QueryProvider from '../src/features/app-providers/QueryProvider';

export const metadata = {
  title: 'xDisputer',
  description: 'Secure document operations SaaS'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body data-theme-contract="xdisputer-unified" data-ui-scope="global" data-ui-quality="production" data-motion-contract="safe"><QueryProvider><ControlNavGlobalTelemetry /><GlobalTopbarActionsMount /><ClientPayrollProfileSyncMount /><OutputActivityRealtimeRefreshMount /><OutputActivityUnreadBadgeMount />{children}<Suspense fallback={null}><RenderDebuggerMount /></Suspense></QueryProvider></body></html>;
}
