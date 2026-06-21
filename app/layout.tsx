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
import './console-debug-overlay.css';
import ControlNavGlobalTelemetry from '../components/control/ControlNavGlobalTelemetry';
import RenderDebuggerMount from '../components/console/RenderDebuggerMount';
import GlobalTopbarActionsMount from '../components/shell/GlobalTopbarActionsMount';
import QueryProvider from '../src/features/app-providers/QueryProvider';

export const metadata = {
  title: 'xDisputer',
  description: 'Secure document operations SaaS'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body data-theme-contract="xdisputer-unified" data-ui-scope="global" data-ui-quality="production" data-motion-contract="safe"><QueryProvider><ControlNavGlobalTelemetry /><GlobalTopbarActionsMount />{children}<Suspense fallback={null}><RenderDebuggerMount /></Suspense></QueryProvider></body></html>;
}
