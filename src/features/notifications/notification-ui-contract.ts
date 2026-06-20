export const notificationUiContract = {
  owner: 'src/features/notifications',
  canvas: 'docs/notification-ui-fbis-canvas.md',
  service: 'lib/notifications/notification-service.ts',
  writeService: 'lib/notifications/notification-write-service.ts',
  dock: 'components/notifications/NotificationDock.tsx',
  shellOwner: 'components/console/AccountMenu.tsx',
  guard: 'scripts/notification-ui-schema-guard.mjs',
  behavior: {
    directAudience: 'recipient_user_id',
    optionalRoleAudience: 'recipient_role',
    missingRoleColumnFallback: 'direct-notifications-only',
    popoverLayout: 'absolute-contained-no-content-push'
  }
} as const;
