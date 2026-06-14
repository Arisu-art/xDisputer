import './globals.css';
import './workspace-light.css';
import './workspace-dashboard.css';
import './workspace-polish.css';
import './sidebar-visible.css';
import './output-review.css';
import './live-editor.css';
import './ordered-packet-content.css';
import './editor-pagination.css';
import './final-packets.css';
import './experience-upgrade.css';
import './attention-states.css';
import './source-normalization.css';
import './packet-ui.css';
import './template-flow.css';
import './templates-header-inline.css';
import './template-classification.css';
import './progressive-disclosure.css';
import './template-premium.css';
import './global-minimal-ui.css';
import './workflow-premium.css';
import './guided-source-flow.css';
import './output-guided-flow.css';
import './packet-editor-precision.css';
import './shared-transitions.css';
import './packet-editor-recovery.css';
import './packet-editor-focused.css';
import './packet-editor-consolidated.css';
import './neutral-workspace-system.css';
import './packet-editor-fullscreen.css';
import './evidence-command-header.css';
import './template-progressive-studio.css';
import './source-progressive-studio.css';
import './notepad-packet-review.css';
import './workflow-geometry-normalization.css';
import './client-operations.css';
import './client-saas-refresh.css';
import './minimal-report-ui.css';
import './account-entitlements.css';
import './table-flyout-cards.css';
import './output-limit-chip.css';
import './client-navigation-routes.css';
import './word-style-image-crop.css';
import './dashboard-settings-operations.css';
import './consolidated-dashboard-required-evidence.css';
import './redundancy-cleanup.css';
import './button-system-normalization.css';
import './affidavit-source-mapping.css';
import './ftc-source-mapping.css';
import './source-review-compact.css';
import './inactive-packet-position.css';
import './platform-quality-canvas.css';
import './execution-integrity.css';
import './complete-package-delivery.css';
import './evidence-files-restored-layout.css';
import './supporting-editor-balanced-stage.css';
import './supporting-slot-balance.css';
import './saas-auth-center.css';
import './saas-portal.css';
import './saas-public.css';
import './obsidian-console.css';
import './xdisputer-shell-compact.css';
import './workspace-account-controls.css';
import './admin-monitor.css';
import './control-dashboard-lists.css';
import './production-ui-lock.css';
import './professional-console-layout.css';
import './global-depth-system.css';
import './account-menu-system.css';
import './account-menu-ratio-system.css';
import ControlNavGlobalTelemetry from '../components/control/ControlNavGlobalTelemetry';

export const metadata = {
  title: 'xDisputer',
  description: 'Secure document operations SaaS'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ControlNavGlobalTelemetry />{children}</body>
    </html>
  );
}
