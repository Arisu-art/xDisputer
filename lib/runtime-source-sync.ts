export const XDISPUTER_RUNTIME_SYNC = {
  marker: 'xdisputer-runtime-20260624-template-minimal-ui-v2',
  terminologyContract: 'platform-client-role-displays-as-disputer-letter-subject-stays-client',
  stickyHeaderProfile: 'zero-lag-border-only',
  expectedPullBranch: 'main',
  changedAreas: [
    'master-account-directory-disputer-ui',
    'manager-access-disputer-ui',
    'output-activity-disputer-vs-letter-client-ui',
    'access-audit-disputer-ui',
    'sticky-header-zero-lag-css',
    'supporting-documents-runtime-wide-fix',
    'supporting-documents-conflict-css-neutralized',
    'manager-template-registration-console',
    'template-library-round-only-ui',
    'template-studio-collapsed-advanced-analysis'
  ],
  verifyPaths: [
    'app/master/accounts/page.tsx',
    'app/master/MasterAccountTableV2.tsx',
    'app/admin/access/page.tsx',
    'app/admin/output-activity-v2/page.tsx',
    'components/AccessAuditView.tsx',
    'app/sticky-header-visibility.css',
    'app/supporting-documents-runtime-wide-fix.css',
    'app/word-style-image-crop.css',
    'app/supporting-editor-balanced-stage.css',
    'app/supporting-slot-balance.css',
    'app/evidence-files-restored-layout.css',
    'components/templates/workspace/TemplateRegistrationConsole.tsx',
    'components/templates/workspace/TemplateRoundOnlyLibrary.tsx',
    'components/templates/workspace/TemplateLibraryHub.tsx',
    'components/templates/workspace/TemplateStudioHub.tsx',
    'app/api/template-registration/route.ts',
    'lib/templates/workspace/template-registration-service.ts'
  ]
} as const;
