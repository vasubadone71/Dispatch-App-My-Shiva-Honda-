/**
 * licenseService.js — Backward-compatible re-export shim.
 * All logic lives in licenseManager.js (offline-first, no Supabase).
 */
export {
  LICENSE_STATUS,
  GRACE_PERIOD_MS,
  EMERGENCY_PERIOD_MS,
  submitActivationRequest,
  submitActivationCode,
  checkLicenseState,
  resetActivation,
  getShortDeviceId,
  generateActivationCode,
} from './licenseManager';
