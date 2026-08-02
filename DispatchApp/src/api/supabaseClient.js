/**
 * Supabase JS Client
 * Uses @supabase/supabase-js for full typed integration.
 * Credentials loaded from .env (EXPO_PUBLIC_ prefix exposes them in Expo).
 */
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://onnzkxtkjbqdogusarnn.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_9NV6D_gxJAw9gEYfvBlSoQ_dBPVcKGu';

/**
 * Expo SecureStore adapter so Supabase sessions are stored in hardware-backed storage
 * instead of localStorage (which doesn't exist in React Native).
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('[SupabaseClient] SecureStore setItem failed:', err);
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─────────────────────────────────────────────────────────────
// ACTIVATION APIS
// ─────────────────────────────────────────────────────────────

/**
 * Activate a license code and bind device fingerprint in Supabase.
 */
export const activateLicense = async ({
  activationCode,
  deviceFingerprint,
  brand,
  model,
  androidId,
}) => {
  const { data, error } = await supabase.rpc('activate_license', {
    p_activation_code: activationCode,
    p_device_fingerprint: deviceFingerprint,
    p_device_brand: brand,
    p_device_model: model,
    p_android_id: androidId,
  });

  if (error) {
    console.error('[SupabaseClient] activate_license RPC error:', error);
    return { success: false, error: error.message || 'Activation failed. Check your code.' };
  }

  return data;
};

/**
 * Verify existing license every 7 days online.
 */
export const verifyLicense = async ({ activationCode, deviceFingerprint }) => {
  const { data, error } = await supabase.rpc('verify_license', {
    p_activation_code: activationCode,
    p_device_fingerprint: deviceFingerprint,
  });

  if (error) {
    console.error('[SupabaseClient] verify_license RPC error:', error);
    return {
      success: false,
      error: error.message,
      isNetworkError: error.message?.includes('network') || error.message?.includes('fetch'),
    };
  }

  return data;
};

// ─────────────────────────────────────────────────────────────
// ADMIN CONTROL APIS (for future web panel)
// ─────────────────────────────────────────────────────────────

/** Insert a new dealer */
export const createDealer = async ({ name, ownerName, mobile, city }) => {
  const { data, error } = await supabase
    .from('dealers')
    .insert([{ name, owner_name: ownerName, mobile, city }])
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, dealer: data };
};

/** Create a new license key for a dealer */
export const createLicense = async ({ dealerId, activationCode, expiresAt, maxDevices = 1 }) => {
  const { data, error } = await supabase
    .from('licenses')
    .insert([{
      dealer_id: dealerId,
      activation_code: activationCode,
      expires_at: expiresAt,
      max_devices: maxDevices,
    }])
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, license: data };
};

/** Deactivate a dealer */
export const deactivateDealer = async (dealerId) => {
  const { error } = await supabase
    .from('dealers')
    .update({ is_active: false })
    .eq('id', dealerId);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Block a specific device */
export const blockDevice = async (deviceId) => {
  const { error } = await supabase
    .from('devices')
    .update({ is_active: false })
    .eq('id', deviceId);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Reset device bindings for a license */
export const resetDeviceBindings = async (licenseId) => {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('license_id', licenseId);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Extend license expiry date */
export const extendLicenseExpiry = async (licenseId, newExpiresAt) => {
  const { error } = await supabase
    .from('licenses')
    .update({ expires_at: newExpiresAt })
    .eq('id', licenseId);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

/** Get all verification logs */
export const getVerificationLogs = async (deviceId) => {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')
    .eq('device_id', deviceId)
    .order('verified_at', { ascending: false })
    .limit(50);
  if (error) return { success: false, error: error.message };
  return { success: true, logs: data };
};
