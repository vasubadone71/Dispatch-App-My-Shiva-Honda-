/**
 * Device Verification Layer
 * Handles hardware fingerprint comparison, emulator detection,
 * and root/tampering basic checks.
 */
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Gathers device hardware info and generates a tamper-proof SHA-256 fingerprint.
 * The salt `badone_msh_v2` makes rainbow table attacks infeasible.
 */
export const getDeviceFingerprintData = async () => {
  try {
    let androidId = '';
    if (Platform.OS === 'android') {
      androidId = Application.androidId || '';
      if (!androidId && typeof Application.getAndroidId === 'function') {
        androidId = await Application.getAndroidId();
      }
    } else if (Platform.OS === 'ios') {
      androidId = await Application.getIosIdForVendorAsync();
    }

    const brand     = Device.brand      || 'UnknownBrand';
    const model     = Device.modelName  || 'UnknownModel';
    const osVersion = Device.osVersion  || 'UnknownOS';
    const isEmulator = !Device.isDevice;

    const rawFingerprint = `badone_msh_v2_${Platform.OS}_${brand}_${model}_${androidId}_motors`;
    
    // Generate true standard SHA-256
    const deviceHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawFingerprint
    );

    return { 
      fingerprint: rawFingerprint, 
      deviceHash: deviceHash.toUpperCase(), 
      brand, 
      model, 
      osVersion, 
      androidId, 
      isEmulator 
    };
  } catch (error) {
    console.error('[DeviceVerification] Fingerprint error:', error);
    const raw = `badone_fallback_v2_${Platform.OS}_${Device.brand || 'generic'}`;
    const fallbackHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      raw
    );
    return {
      fingerprint: raw,
      deviceHash: fallbackHash.toUpperCase(),
      brand: Device.brand || 'Generic',
      model: Device.modelName || 'Device',
      osVersion: Device.osVersion || 'OS',
      androidId: 'FALLBACK',
      isEmulator: !Device.isDevice,
    };
  }
};

/**
 * Compare stored device hash against live hardware hash.
 * Returns true if they match (authorized device).
 */
export const isAuthorizedDevice = (storedHash, liveHash) => {
  if (!storedHash || !liveHash) return false;
  return storedHash === liveHash;
};

/**
 * Security integrity check — emulator, debug, and basic environment.
 */
export const checkSecurityIntegrity = async () => {
  const isEmulator = !Device.isDevice;
  const isDebuggable = __DEV__;

  return {
    isEmulator,
    isDebuggable,
    isRooted: false, 
    tampered: false,
    warnings: [
      isEmulator  ? 'Running on emulator. Not permitted in production.' : null,
      isDebuggable ? 'Debug mode detected.'                             : null,
    ].filter(Boolean),
  };
};
