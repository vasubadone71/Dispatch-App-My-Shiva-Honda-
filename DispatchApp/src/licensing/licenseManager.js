/**
 * licenseManager.js — SIMPLE OFFLINE Device-Lock Activation
 *
 * HOW IT WORKS:
 * 1. On first launch, app shows a Device ID (16 hex chars from device fingerprint hash).
 * 2. User sends Device ID to admin manually.
 * 3. Admin manually generates activation code using: MSH-{first 4 digits of Device ID}
 * 4. App validates locally: enteredCode === validActivationCode
 * 5. On success, activation is saved permanently in expo-secure-store.
 * 6. On every boot: stored device hash is compared to current device — blocks APK sharing.
 */
import { getSecureProfile, saveSecureProfile, clearSecureProfile } from '../storage/secureStorage';
import { getDeviceFingerprintData, isAuthorizedDevice } from '../security/deviceVerification';

// ─── License status constants ─────────────────────────────────────────────────
export const LICENSE_STATUS = {
  LOADING:             'LOADING',
  UNLICENSED:          'UNLICENSED',
  PENDING_CODE:        'PENDING_CODE',
  VALID:               'VALID',
  UNAUTHORIZED_DEVICE: 'UNAUTHORIZED_DEVICE',
};

// ─── Device ID helpers ────────────────────────────────────────────────────────

/**
 * Derives the 16-char displayable Device ID from the device fingerprint hash.
 */
export const getShortDeviceId = (deviceHash) => {
  if (!deviceHash) return 'UNKNOWN_DEVICE';
  return deviceHash.substring(0, 16).toLowerCase();
};

/**
 * Generates the expected activation code for a given Device ID.
 * Admin manually creates this by taking the first 4 characters.
 * @param {string} shortDeviceId - The ID shown to user (e.g., "20afee4b7b097fe6")
 * @returns {string} e.g., "MSH-20AF"
 */
export const generateActivationCode = (shortDeviceId) => {
  if (!shortDeviceId || shortDeviceId.length < 4) return '';
  const first4 = shortDeviceId.substring(0, 4).toUpperCase();
  return `MSH-${first4}`;
};

/**
 * Validates an entered activation code against the current device.
 * Fully offline. Case-insensitive — MSH-20af, MSH-20AF, msh-20af all valid.
 */
const validateActivationCode = (enteredCode, shortDeviceId) => {
  if (!enteredCode || !shortDeviceId) return false;
  const expected = generateActivationCode(shortDeviceId);
  // Normalize BOTH sides to uppercase so case never causes a mismatch
  return enteredCode.trim().toUpperCase() === expected.toUpperCase();
};

/**
 * Helper: also export for UI display so the screen can show the expected code format.
 */
export const getExpectedCode = (shortDeviceId) => {
  return generateActivationCode(shortDeviceId);
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called on every app boot.
 * Reads secure store → checks device fingerprint → returns license status.
 */
export const checkLicenseState = async () => {
  try {
    const profile = await getSecureProfile();
    const status  = profile.activationStatus;

    if (!status || status === 'UNLICENSED') {
      return { status: LICENSE_STATUS.UNLICENSED, profile: null };
    }

    if (status === 'ACTIVATED') {
      const deviceData = await getDeviceFingerprintData();
      if (!isAuthorizedDevice(profile.deviceHash, deviceData.deviceHash)) {
        return {
          status: LICENSE_STATUS.UNAUTHORIZED_DEVICE,
          error:  'This device is not authorized. The license is bound to a different physical device.',
          profile: profile.dealerProfile,
        };
      }
      return { status: LICENSE_STATUS.VALID, profile: profile.dealerProfile };
    }

    return { status: LICENSE_STATUS.UNLICENSED, profile: null };
  } catch (err) {
    console.error('[LicenseManager] checkLicenseState error:', err);
    return { status: LICENSE_STATUS.UNLICENSED, profile: null };
  }
};

/**
 * Validates the activation code OFFLINE and permanently activates this device.
 */
export const submitActivationCode = async (activationCode) => {
  const code = (activationCode || '').trim().toUpperCase();
  if (!code) return { success: false, error: 'Please enter the activation code.' };

  try {
    const deviceData   = await getDeviceFingerprintData();
    const shortId      = getShortDeviceId(deviceData.deviceHash);
    const isValid      = validateActivationCode(code, shortId);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid activation code. Please check the code and try again.\n\nMake sure you entered the code for Device ID: ' + shortId,
      };
    }

    // Code is valid — permanently store activation in secure storage
    const dealerProfile = {
      name:      'My Shiva Honda',
      owner:     'Authorized Dealer',
      activatedAt: new Date().toISOString(),
      deviceId:  shortId,
    };

    await saveSecureProfile({
      activationStatus: 'ACTIVATED',
      activationCode:   code,
      deviceHash:       deviceData.deviceHash,
      authToken:        '',
      dealerProfile,
    });

    return { success: true, profile: dealerProfile };
  } catch (err) {
    console.error('[LicenseManager] submitActivationCode error:', err);
    return { success: false, error: 'Unexpected error. Please restart the app and try again.' };
  }
};

/** Clears all license data from secure storage. Business data is NOT touched. */
export const resetActivation = async () => clearSecureProfile();
