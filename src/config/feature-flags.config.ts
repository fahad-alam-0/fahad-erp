/**
 * Runtime Feature Flags
 * 
 * Used only for true runtime feature toggles (e.g. experimental hardware features).
 * Core business rules (like Technician Profit Sharing) and future architecture (like Multi-Store)
 * are handled at the domain/architecture level, not via optional feature flags.
 */
export const featureFlags = {
  enableBarCodeScanning: true,
  enableOfflineNotifications: true,
} as const;
