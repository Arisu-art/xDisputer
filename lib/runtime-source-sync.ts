export const XDISPUTER_RUNTIME_SYNC = {
  marker: 'xdisputer-runtime-20260624-disputer-terminology-wide-support-v3',
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
    'supporting-documents-conflict-css-neutralized'
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
    'app/evidence-files-restored-layout.css'
  ]
} as const;
