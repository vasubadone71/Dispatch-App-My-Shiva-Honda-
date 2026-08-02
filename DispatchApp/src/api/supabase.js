/**
 * Supabase REST & RPC Integration Client
 * Production credentials are loaded from .env (EXPO_PUBLIC_ prefix).
 *
 * KEY FIX: Approval flow now uses POST (not GET).
 * PostgREST maps GET requests to STABLE/IMMUTABLE functions in read-only
 * transaction mode → INSERT/UPDATE inside the function will FAIL.
 * POST requests run in read-write mode → all writes succeed correctly.
 */

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://onnzkxtkjbqdogusarnn.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_9NV6D_gxJAw9gEYfvBlSoQ_dBPVcKGu';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — all standard RPC calls go through here
// ─────────────────────────────────────────────────────────────────────────────
const callRpc = async (functionName, params) => {
  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  console.log(`[Supabase] callRpc → ${functionName}`, params);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = {};
      try { errorJson = JSON.parse(errorText); } catch { errorJson = { message: errorText }; }
      console.error(`[Supabase] ${functionName} error ${response.status}:`, errorJson);
      return {
        success: false,
        error: errorJson.message || `Server error ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[Supabase] ${functionName} response:`, data);
    return data;
  } catch (error) {
    console.error(`[Supabase] RPC "${functionName}" network error:`, error);
    return {
      success: false,
      error: 'Network connection failed.',
      isNetworkError: true,
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION FLOW
// ─────────────────────────────────────────────────────────────────────────────

/** Activate a license code & bind the device hardware fingerprint */
export const activateLicenseOnline = async ({
  activationCode, deviceFingerprint, brand, model, androidId,
}) => {
  console.log('[Supabase] activateLicenseOnline →', activationCode);
  return await callRpc('activate_license', {
    p_activation_code:    activationCode,
    p_device_fingerprint: deviceFingerprint,
    p_device_brand:       brand,
    p_device_model:       model,
    p_android_id:         androidId,
  });
};

/** Submit a new dealer activation request to Supabase & dispatch Telegram alert */
export const requestActivationOnline = async ({
  dealerName, ownerName, mobile, city, deviceFingerprint, brand, model, androidId,
}) => {
  console.log('[Supabase] requestActivationOnline → dealer:', dealerName);
  return await callRpc('request_activation', {
    p_dealer_name:        dealerName,
    p_owner_name:         ownerName,
    p_mobile:             mobile,
    p_city:               city,
    p_device_fingerprint: deviceFingerprint,
    p_device_brand:       brand,
    p_device_model:       model,
    p_android_id:         androidId,
  });
};

/** Periodic 7-day online license verification */
export const verifyLicenseOnline = async ({ activationCode, deviceFingerprint }) => {
  console.log('[Supabase] verifyLicenseOnline →', activationCode);
  return await callRpc('verify_license', {
    p_activation_code:    activationCode,
    p_device_fingerprint: deviceFingerprint,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN APPROVAL — POST RPC (replaces broken GET-link system)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve a pending dealer activation via a proper HTTP POST request.
 *
 * WHY POST AND NOT GET:
 *   PostgREST executes GET requests inside a READ-ONLY PostgreSQL transaction.
 *   Any INSERT or UPDATE inside the RPC function will throw:
 *     "cannot execute INSERT in a read-only transaction"
 *   POST requests run in a full READ-WRITE transaction → all writes succeed.
 *
 * WHAT THIS DOES:
 *   1. Calls POST /rest/v1/rpc/approve_dealer_get with { p_pending_id }
 *   2. The RPC function on Supabase:
 *        a. Fetches the pending activation record
 *        b. Creates the dealer profile in public.dealers
 *        c. Generates a unique activation code (MSH-YYYY-XXXXXX)
 *        d. Inserts into public.licenses (1-year expiry)
 *        e. Pre-binds the device fingerprint in public.devices
 *        f. Updates pending_activations.status → 'APPROVED'
 *        g. Sends the generated code to the admin Telegram bot
 *   3. Returns { success, activation_code, dealer_name }
 *
 * @param {string} pendingId  UUID of the pending_activations row to approve
 * @returns {Promise<{success: boolean, activation_code?: string, dealer_name?: string, error?: string}>}
 */
export const approveDealerPost = async (pendingId) => {
  console.log('[Supabase] approveDealerPost → pendingId:', pendingId);

  if (!pendingId || typeof pendingId !== 'string' || pendingId.trim() === '') {
    console.error('[Supabase] approveDealerPost: pendingId is missing or invalid.');
    return { success: false, error: 'Pending activation ID is required.' };
  }

  const endpoint = `${SUPABASE_URL}/rest/v1/rpc/approve_dealer_get`;
  console.log('[Supabase] POST →', endpoint);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',                         // ← READ-WRITE transaction mode
      headers: {
        'Content-Type': 'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({ p_pending_id: pendingId.trim() }),
    });

    // Always read the raw text first for accurate error logging
    const rawText = await response.text();
    console.log('[Supabase] approve_dealer_get HTTP status:', response.status);
    console.log('[Supabase] approve_dealer_get raw body:', rawText);

    // Parse response body
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[Supabase] Failed to parse JSON. Raw response was:', rawText);
      return { success: false, error: 'Unexpected response format from server.' };
    }

    // HTTP-level failure
    if (!response.ok) {
      const errMsg = data?.message || data?.error || `HTTP ${response.status} error`;
      console.error('[Supabase] approveDealerPost HTTP error:', errMsg);
      return { success: false, error: errMsg };
    }

    // PostgREST may return the JSONB as an array wrapper — unwrap if needed
    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      const errMsg = result?.error || 'Approval was rejected by the server.';
      console.error('[Supabase] approveDealerPost RPC returned failure:', errMsg);
      return { success: false, error: errMsg };
    }

    console.log('[Supabase] ✅ Dealer approved successfully!');
    console.log('[Supabase]    Dealer Name    :', result.dealer_name);
    console.log('[Supabase]    Activation Code:', result.activation_code);
    console.log('[Supabase]    Device Bound   :', result.device_bound);

    return {
      success:         true,
      activation_code: result.activation_code,
      dealer_name:     result.dealer_name,
      device_bound:    result.device_bound,
      message:         result.message,
    };

  } catch (networkError) {
    console.error('[Supabase] approveDealerPost network/fetch error:', networkError);
    return {
      success: false,
      error: 'Network connection failed. Please check your internet and try again.',
      isNetworkError: true,
    };
  }
};
