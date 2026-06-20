export const notificationOwnershipContract = {
  ownerComponent: 'components/console/AccountMenu.tsx',
  ownerStyleHost: 'components/notifications/OwnedNotificationDock.tsx',
  ownerService: 'src/features/notifications/notification-api-service.ts',
  ownerWriteService: 'lib/notifications/notification-write-service.ts',
  pollIntervalMs: 120_000,
  maxVisibleItems: 8,
  readEndpoint: '/api/notifications/read'
} as const;
