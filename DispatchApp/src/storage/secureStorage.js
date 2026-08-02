/**
 * Secure Storage Layer
 * All license/activation data stored in hardware-backed expo-secure-store.
 * Business data (dispatches, masters) stays in AsyncStorage — untouched.
 */
import * as SecureStore from 'expo-secure-store';

export const KEYS = {
  ACTIVATION_STATUS: 'msh_dms_v2_status',
  ACTIVATION_CODE:   'msh_dms_v2_code',
  DEVICE_HASH:       'msh_dms_v2_device_hash',
  AUTH_TOKEN:        'msh_dms_v2_auth_token',
  LAST_VERIFICATION: 'msh_dms_v2_last_verify',
  DEALER_PROFILE:    'msh_dms_v2_dealer_profile',
};

// ─── Primitives ──────────────────────────────────────────────────────────────

export const setSecureValue = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, String(value ?? ''));
    return true;
  } catch (err) {
    console.error(`[SecureStorage] set "${key}" failed:`, err);
    return false;
  }
};

export const getSecureValue = async (key) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.error(`[SecureStorage] get "${key}" failed:`, err);
    return null;
  }
};

export const deleteSecureValue = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch {
    return false;
  }
};

// ─── Profile API ─────────────────────────────────────────────────────────────

/**
 * Atomically save the complete activation profile.
 */
export const saveSecureProfile = async ({
  activationStatus,
  activationCode,
  deviceHash,
  authToken,
  dealerProfile,
}) => {
  try {
    await Promise.all([
      setSecureValue(KEYS.ACTIVATION_STATUS, activationStatus),
      setSecureValue(KEYS.ACTIVATION_CODE,   activationCode),
      setSecureValue(KEYS.DEVICE_HASH,       deviceHash),
      setSecureValue(KEYS.AUTH_TOKEN,        authToken || ''),
      setSecureValue(KEYS.LAST_VERIFICATION, String(Date.now())),
      dealerProfile
        ? setSecureValue(KEYS.DEALER_PROFILE, JSON.stringify(dealerProfile))
        : Promise.resolve(),
    ]);
    return true;
  } catch (err) {
    console.error('[SecureStorage] saveSecureProfile failed:', err);
    return false;
  }
};

/**
 * Read back the complete activation profile from secure storage.
 */
export const getSecureProfile = async () => {
  try {
    const [status, code, deviceHash, authToken, lastVerifyStr, profileStr] =
      await Promise.all([
        getSecureValue(KEYS.ACTIVATION_STATUS),
        getSecureValue(KEYS.ACTIVATION_CODE),
        getSecureValue(KEYS.DEVICE_HASH),
        getSecureValue(KEYS.AUTH_TOKEN),
        getSecureValue(KEYS.LAST_VERIFICATION),
        getSecureValue(KEYS.DEALER_PROFILE),
      ]);

    let dealerProfile = null;
    try { if (profileStr) dealerProfile = JSON.parse(profileStr); } catch { /* ignore */ }

    return {
      activationStatus: status || 'UNLICENSED',
      activationCode:   code,
      deviceHash,
      authToken,
      lastVerification: lastVerifyStr ? parseInt(lastVerifyStr, 10) : 0,
      dealerProfile,
    };
  } catch (err) {
    console.error('[SecureStorage] getSecureProfile failed:', err);
    return {
      activationStatus: 'UNLICENSED',
      activationCode:   null,
      deviceHash:       null,
      authToken:        null,
      lastVerification: 0,
      dealerProfile:    null,
    };
  }
};

/**
 * Wipe all license keys. Business data (AsyncStorage) is NOT touched.
 */
export const clearSecureProfile = async () => {
  try {
    await Promise.all(Object.values(KEYS).map(deleteSecureValue));
    return true;
  } catch (err) {
    console.error('[SecureStorage] clearSecureProfile failed:', err);
    return false;
  }
};
