-- =============================================================================
-- MY SHIVA HONDA DMS — SQL PATCH: Fix Approval Flow (GET → POST)
-- Badone Motors Private Limited · Biaora, Madhya Pradesh
--
-- PROBLEM FIXED:
--   The old approve_dealer_get function was marked STABLE.
--   STABLE functions are executed in READ-ONLY transaction mode by PostgREST.
--   This caused: "cannot execute INSERT in a read-only transaction"
--   SELECT worked but INSERT (licenses, devices) and UPDATE (pending_activations) failed.
--
-- SOLUTION:
--   1. Recreate request_activation — removes GET approval link from Telegram message,
--      replaces it with the pending_id UUID so admin can use POST for approval.
--   2. Recreate approve_dealer_get — removes STABLE keyword so it runs in
--      full READ-WRITE transaction mode when called via HTTP POST.
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard/project/onnzkxtkjbqdogusarnn
--   2. Click SQL Editor → New Query
--   3. Paste this entire file → Click Run
--
-- HOW APPROVAL NOW WORKS (after this patch):
--   - Dealer submits form in app
--   - request_activation RPC inserts to pending_activations, sends Telegram message
--     with the pending_id UUID (no GET link)
--   - Admin sees Telegram message, sends POST to /rest/v1/rpc/approve_dealer_get
--     with body: {"p_pending_id": "<UUID>"}
--   - approve_dealer_get runs in read-write mode → creates dealer, generates code,
--     inserts license, binds device, updates status, sends Telegram with code
-- =============================================================================


-- =============================================================================
-- PATCH 1: Fix request_activation — remove GET link, include pending_id in message
-- =============================================================================

-- Drop first to allow return type / signature changes
DROP FUNCTION IF EXISTS public.request_activation(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.request_activation(
  p_dealer_name        TEXT,
  p_owner_name         TEXT,
  p_mobile             TEXT,
  p_city               TEXT,
  p_device_fingerprint TEXT,
  p_device_brand       TEXT,
  p_device_model       TEXT,
  p_android_id         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id  UUID;
  v_msg TEXT;
BEGIN
  -- 1. Insert registration request
  INSERT INTO public.pending_activations (
    dealer_name, owner_name, mobile, city,
    device_fingerprint, device_brand, device_model, android_id
  )
  VALUES (
    p_dealer_name, p_owner_name, p_mobile, p_city,
    p_device_fingerprint, p_device_brand, p_device_model, p_android_id
  )
  RETURNING id INTO v_id;

  -- 2. Build Telegram notification (NO GET link — GET is read-only and breaks INSERTs)
  --    Admin must approve via POST request to /rest/v1/rpc/approve_dealer_get
  v_msg := E'🚨 *NEW APP ACTIVATION REQUEST*\n\n' ||
           E'*Dealer:* ' || p_dealer_name || E'\n' ||
           E'*Owner:* '  || p_owner_name  || E'\n' ||
           E'*Mobile:* ' || p_mobile      || E'\n' ||
           E'*City:* '   || p_city        || E'\n' ||
           E'*Device:* ' || p_device_brand || E' ' || p_device_model || E'\n' ||
           E'*Android ID:* ' || COALESCE(p_android_id, 'N/A') || E'\n' ||
           E'*Fingerprint:* `' || p_device_fingerprint || E'`\n\n' ||
           E'*Pending ID:* `' || v_id::text || E'`\n\n' ||
           E'⚡ *To Approve — send POST request:*\n' ||
           E'Endpoint: `/rest/v1/rpc/approve_dealer_get`\n' ||
           E'Body: `{"p_pending_id":"' || v_id::text || E'"}`';

  -- 3. Dispatch Telegram notification from database
  BEGIN
    PERFORM extensions.http_post(
      'https://api.telegram.org/bot8707079325:AAH2RhnsWPk69pTnzvfuzkzJsAps72lb1_8/sendMessage',
      jsonb_build_object(
        'chat_id',                  '1107412891',
        'text',                     v_msg,
        'parse_mode',               'Markdown',
        'disable_web_page_preview', true
      )::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Telegram registration dispatch failed: %', SQLERRM;
  END;

  -- 4. Return success with pending_id so the client can pass it along if needed
  RETURN jsonb_build_object(
    'success',    true,
    'pending_id', v_id
  );
END;
$$;


-- =============================================================================
-- PATCH 2: Fix approve_dealer_get — remove STABLE so it runs in read-write mode
--
-- CRITICAL: Do NOT add "ALTER FUNCTION ... STABLE" after this block.
-- VOLATILE is the PostgreSQL default and is required for write operations.
-- =============================================================================

-- Drop first to allow return type / signature changes
-- This also removes the old STABLE volatility marker
DROP FUNCTION IF EXISTS public.approve_dealer_get(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.approve_dealer_get(p_pending_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- No STABLE keyword here — function must be VOLATILE (default) for writes to work
AS $$
DECLARE
  v_pending RECORD;
  v_dealer  RECORD;
  v_license RECORD;
  v_code    TEXT;
  v_device  RECORD;
BEGIN
  -- 1. Fetch pending registration
  SELECT * INTO v_pending FROM public.pending_activations WHERE id = p_pending_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Activation request not found.'
    );
  END IF;

  -- 2. Prevent duplicate processing
  IF v_pending.status = 'APPROVED' THEN
    SELECT l.activation_code INTO v_code
    FROM public.licenses l
    JOIN public.dealers d ON l.dealer_id = d.id
    WHERE d.mobile = v_pending.mobile
    LIMIT 1;

    RETURN jsonb_build_object(
      'success',         true,
      'message',         'Request was already approved previously.',
      'activation_code', COALESCE(v_code, 'Already activated'),
      'dealer_name',     v_pending.dealer_name
    );
  END IF;

  -- 3. Create dealer profile if it does not already exist
  SELECT * INTO v_dealer FROM public.dealers WHERE mobile = v_pending.mobile LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.dealers (name, owner_name, mobile, city, is_active)
    VALUES (v_pending.dealer_name, v_pending.owner_name, v_pending.mobile, v_pending.city, true)
    RETURNING * INTO v_dealer;
  END IF;

  -- 4. Generate unique, human-friendly activation code (MSH-YYYY-XXXXXX)
  LOOP
    v_code := 'MSH-' || to_char(now(), 'YYYY') || '-' || upper(substring(md5(random()::text) FROM 1 FOR 6));
    PERFORM 1 FROM public.licenses WHERE activation_code = v_code;
    EXIT WHEN NOT FOUND;  -- guaranteed unique
  END LOOP;

  -- 5. Insert into licenses table (1-year validity, 1 device max)
  INSERT INTO public.licenses (dealer_id, activation_code, is_active, max_devices, expires_at, is_used)
  VALUES (v_dealer.id, v_code, true, 1, now() + interval '1 year', false)
  RETURNING * INTO v_license;

  -- 6. Pre-bind device fingerprint to this license
  INSERT INTO public.devices (license_id, device_fingerprint, device_brand, device_model, android_id, is_active)
  VALUES (v_license.id, v_pending.device_fingerprint, v_pending.device_brand, v_pending.device_model, v_pending.android_id, true)
  RETURNING * INTO v_device;

  -- 7. Mark pending request as APPROVED and store the generated code
  UPDATE public.pending_activations
  SET status = 'APPROVED', activation_code = v_code
  WHERE id = p_pending_id;

  -- 8. Notify admin via Telegram with the generated activation code
  BEGIN
    PERFORM extensions.http_post(
      'https://api.telegram.org/bot8707079325:AAH2RhnsWPk69pTnzvfuzkzJsAps72lb1_8/sendMessage',
      jsonb_build_object(
        'chat_id',    '1107412891',
        'text',       E'✅ *DEALER ACTIVATION APPROVED*\n\n' ||
                      E'*Dealer:* '  || v_pending.dealer_name  || E'\n' ||
                      E'*Owner:* '   || v_pending.owner_name   || E'\n' ||
                      E'*City:* '    || v_pending.city          || E'\n' ||
                      E'*Device:* '  || v_pending.device_brand || E' ' || v_pending.device_model || E'\n\n' ||
                      E'🔑 *Generated Activation Code:*\n`' || v_code || E'`\n\n' ||
                      E'Please share this code with the dealer to complete activation.',
        'parse_mode', 'Markdown'
      )::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Telegram approval notification failed: %', SQLERRM;
  END;

  -- 9. Return success response
  RETURN jsonb_build_object(
    'success',         true,
    'message',         'Dealer approved successfully! Activation code generated and dispatched.',
    'activation_code', v_code,
    'dealer_name',     v_pending.dealer_name,
    'device_bound',    v_pending.device_fingerprint
  );
END;
$$;

-- Verify the function is VOLATILE (NOT stable/immutable) — this confirms write access works
-- You can run this SELECT to double-check after applying the patch:
-- SELECT proname, provolatile FROM pg_proc WHERE proname = 'approve_dealer_get';
-- provolatile should be 'v' (VOLATILE), NOT 's' (STABLE) or 'i' (IMMUTABLE)

SELECT 'Patch applied successfully. approve_dealer_get is now VOLATILE (read-write mode).' AS status;
