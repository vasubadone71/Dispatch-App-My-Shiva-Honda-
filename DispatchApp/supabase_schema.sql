-- =============================================================================
-- MY SHIVA HONDA DMS — SUPABASE DATABASE SCHEMA (v3 - Automatic Activation)
-- Badone Motors Private Limited · Biaora, Rajgarh, Madhya Pradesh
-- Run this entire script in Supabase Dashboard → SQL Editor
-- =============================================================================

-- Enable required HTTP extension for direct Telegram bot integration from database
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dealers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_name  TEXT,
  mobile      TEXT UNIQUE, -- Handlers mobile as a unique lookup
  city        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.licenses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id         UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  activation_code   TEXT UNIQUE NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  max_devices       INTEGER NOT NULL DEFAULT 1,
  expires_at        TIMESTAMPTZ NOT NULL,
  is_used           BOOLEAN NOT NULL DEFAULT false, -- Tracks if code has been successfully verified/activated
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.devices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id          UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_fingerprint  TEXT NOT NULL,
  device_brand        TEXT,
  device_model        TEXT,
  android_id          TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  activated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(license_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.pending_activations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_name         TEXT NOT NULL,
  owner_name          TEXT NOT NULL,
  mobile              TEXT NOT NULL,
  city                TEXT NOT NULL,
  device_fingerprint  TEXT NOT NULL,
  device_brand        TEXT,
  device_model        TEXT,
  android_id          TEXT,
  status              TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  activation_code     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_code     TEXT,
  device_fingerprint  TEXT,
  status              TEXT NOT NULL,        -- 'SUCCESS' or 'FAILED'
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.dealers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- ─── Policies ────────────────────────────────────────────────────────────────

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous insert for pending_activations" ON public.pending_activations;
DROP POLICY IF EXISTS "Allow anonymous select for pending_activations" ON public.pending_activations;

-- Pending Activations (App requires ability to insert a new request, and check its approval status)
CREATE POLICY "Allow anonymous insert for pending_activations"
  ON public.pending_activations FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select for pending_activations"
  ON public.pending_activations FOR SELECT TO anon USING (true);

-- Allow anonymous selects/RPC reads for device license verification
CREATE POLICY "Allow read access to licenses for verification"
  ON public.licenses FOR SELECT TO anon USING (true);

CREATE POLICY "Allow read access to devices for verification"
  ON public.devices FOR SELECT TO anon USING (true);

-- ─── Indices ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_licenses_code ON public.licenses(activation_code);
CREATE INDEX IF NOT EXISTS idx_devices_fp    ON public.devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_lic   ON public.devices(license_id);
CREATE INDEX IF NOT EXISTS idx_pending_fp    ON public.pending_activations(device_fingerprint);


-- =============================================================================
-- RPC: request_activation
-- Called when a dealer requests activation. Saves data and dispatches Telegram.
-- =============================================================================

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

  -- 2. Construct Telegram notification text (NO GET link — GET runs in read-only mode and breaks INSERTs).
  --    Admin must approve via POST /rest/v1/rpc/approve_dealer_get with body {"p_pending_id": "<UUID>"}
  v_msg := E'🚨 *NEW APP ACTIVATION REQUEST*\n\n' ||
           E'*Dealer:* ' || p_dealer_name || E'\n' ||
           E'*Owner:* ' || p_owner_name || E'\n' ||
           E'*Mobile:* ' || p_mobile || E'\n' ||
           E'*City:* ' || p_city || E'\n' ||
           E'*Device:* ' || p_device_brand || E' ' || p_device_model || E'\n' ||
           E'*Android ID:* ' || COALESCE(p_android_id, 'N/A') || E'\n' ||
           E'*Fingerprint:* `' || p_device_fingerprint || E'`\n\n' ||
           E'*Pending ID:* `' || v_id::text || E'`\n\n' ||
           E'⚡ *To Approve — send POST request:*\n' ||
           E'Endpoint: `/rest/v1/rpc/approve_dealer_get`\n' ||
           E'Body: `{"p_pending_id":"' || v_id::text || E'"}`';

  -- 4. Dispatch Telegram bot message securely from database
  BEGIN
    PERFORM extensions.http_post(
      'https://api.telegram.org/bot8707079325:AAH2RhnsWPk69pTnzvfuzkzJsAps72lb1_8/sendMessage',
      jsonb_build_object(
        'chat_id', '1107412891',
        'text', v_msg,
        'parse_mode', 'Markdown',
        'disable_web_page_preview', true
      )::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore failure to avoid rolling back transaction
    RAISE WARNING 'Telegram registration dispatch failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object('success', true, 'pending_id', v_id);
END;
$$;


-- =============================================================================
-- RPC: approve_dealer_get (GET-friendly STABLE wrapper)
-- Automatically generates license and binds device on click.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_dealer_get(p_pending_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
      'error', 'Activation request not found.'
    );
  END IF;

  -- 2. Prevent duplicate processing
  IF v_pending.status = 'APPROVED' THEN
    SELECT l.activation_code INTO v_code
    FROM public.licenses l
    JOIN public.dealers d ON l.dealer_id = d.id
    WHERE d.mobile = v_pending.mobile LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Request was already approved previously.',
      'activation_code', COALESCE(v_code, 'Activated'),
      'dealer_name', v_pending.dealer_name
    );
  END IF;

  -- 3. Create or fetch dealer profile
  SELECT * INTO v_dealer FROM public.dealers WHERE mobile = v_pending.mobile LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.dealers (name, owner_name, mobile, city, is_active)
    VALUES (v_pending.dealer_name, v_pending.owner_name, v_pending.mobile, v_pending.city, true)
    RETURNING * INTO v_dealer;
  END IF;

  -- 4. Generate unique, random, human-friendly activation code
  -- Format: MSH-YYYY-XXXX (where XXXX is a unique random string)
  LOOP
    v_code := 'MSH-' || to_char(now(), 'YYYY') || '-' || upper(substring(md5(random()::text) from 1 for 6));
    PERFORM 1 FROM public.licenses WHERE activation_code = v_code;
    EXIT WHEN NOT FOUND;
  END LOOP;

  -- 5. Save into Supabase licenses table (max_devices = 1, expires 1 year)
  INSERT INTO public.licenses (dealer_id, activation_code, is_active, max_devices, expires_at, is_used)
  VALUES (v_dealer.id, v_code, true, 1, now() + interval '1 year', false)
  RETURNING * INTO v_license;

  -- 6. Pre-bind code to the device fingerprint immediately (strict binding!)
  INSERT INTO public.devices(license_id, device_fingerprint, device_brand, device_model, android_id, is_active)
  VALUES (v_license.id, v_pending.device_fingerprint, v_pending.device_brand, v_pending.device_model, v_pending.android_id, true)
  RETURNING * INTO v_device;

  -- 7. Update pending request status
  UPDATE public.pending_activations
  SET status = 'APPROVED', activation_code = v_code
  WHERE id = p_pending_id;

  -- 8. Send Telegram message with generated activation code to the admin bot
  BEGIN
    PERFORM extensions.http_post(
      'https://api.telegram.org/bot8707079325:AAH2RhnsWPk69pTnzvfuzkzJsAps72lb1_8/sendMessage',
      jsonb_build_object(
        'chat_id', '1107412891',
        'text', E'✅ *DEALER ACTIVATION APPROVED*\n\n' ||
                E'*Dealer:* ' || v_pending.dealer_name || E'\n' ||
                E'*Owner:* ' || v_pending.owner_name || E'\n' ||
                E'*City:* ' || v_pending.city || E'\n' ||
                E'*Device:* ' || v_pending.device_brand || E' ' || v_pending.device_model || E'\n\n' ||
                E'🔑 *Generated Activation Code:*\n`' || v_code || E'`\n\n' ||
                E'Please share this code with the dealer to complete activation.',
        'parse_mode', 'Markdown'
      )::text,
      'application/json'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Telegram approval notification failed: %', SQLERRM;
  END;

  -- Return successful JSON response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Dealer approved successfully! Activation code has been generated and dispatched.',
    'activation_code', v_code,
    'dealer_name', v_pending.dealer_name,
    'device_bound', v_pending.device_fingerprint
  );
END;
$$;

-- NOTE: Do NOT mark approve_dealer_get as STABLE.
-- STABLE functions are executed in READ-ONLY transaction mode by PostgREST.
-- This causes: "cannot execute INSERT in a read-only transaction"
-- The function must remain VOLATILE (default) so POST calls get full read-write access.


-- =============================================================================
-- RPC: activate_license
-- Called when dealer enters their code for the first time.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.activate_license(
  p_activation_code    TEXT,
  p_device_fingerprint TEXT,
  p_device_brand       TEXT DEFAULT NULL,
  p_device_model       TEXT DEFAULT NULL,
  p_android_id         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_license  RECORD;
  v_dealer   RECORD;
  v_device   RECORD;
  v_count    INTEGER;
BEGIN
  -- 1. Find license
  SELECT * INTO v_license FROM public.licenses WHERE activation_code = p_activation_code;
  IF NOT FOUND THEN
    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status, error_message)
    VALUES(p_activation_code, p_device_fingerprint, 'FAILED', 'Code not found');
    RETURN jsonb_build_object('success', false, 'error', 'Invalid activation code. Please check and try again.');
  END IF;

  -- 2. License active?
  IF NOT v_license.is_active THEN
    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status, error_message)
    VALUES(p_activation_code, p_device_fingerprint, 'FAILED', 'License deactivated');
    RETURN jsonb_build_object('success', false, 'error', 'This license has been deactivated by the administrator.');
  END IF;

  -- 3. Expiry check
  IF v_license.expires_at < now() THEN
    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status, error_message)
    VALUES(p_activation_code, p_device_fingerprint, 'FAILED', 'License expired');
    RETURN jsonb_build_object('success', false, 'error',
      'License expired on ' || to_char(v_license.expires_at, 'DD-Mon-YYYY') || '. Contact Badone Motors to renew.');
  END IF;

  -- 4. Get dealer
  IF v_license.dealer_id IS NOT NULL THEN
    SELECT * INTO v_dealer FROM public.dealers WHERE id = v_license.dealer_id;
    IF FOUND AND NOT v_dealer.is_active THEN
      RETURN jsonb_build_object('success', false, 'error', 'Dealer account deactivated. Contact support.');
    END IF;
  END IF;

  -- 5. Already bound to this device?
  SELECT * INTO v_device FROM public.devices
  WHERE license_id = v_license.id AND device_fingerprint = p_device_fingerprint;

  IF FOUND THEN
    IF NOT v_device.is_active THEN
      RETURN jsonb_build_object('success', false, 'error', 'This device has been blacklisted.');
    END IF;
    
    -- Mark license as used since validation was successful!
    UPDATE public.licenses SET is_used = true WHERE id = v_license.id;

    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status)
    VALUES(p_activation_code, p_device_fingerprint, 'SUCCESS');
    
    RETURN jsonb_build_object(
      'success',          true,
      'dealer_name',      COALESCE(v_dealer.name,       'My Shiva Honda'),
      'dealer_owner',     COALESCE(v_dealer.owner_name, 'Authorized Dealer'),
      'dealer_location',  COALESCE(v_dealer.city,       'Biaora'),
      'expires_at',       v_license.expires_at,
      'device_id',        v_device.id
    );
  END IF;

  -- 6. Strict binding & reuse protection check
  -- If license has already been used on a different device fingerprint, reject immediately!
  IF v_license.is_used OR EXISTS (
    SELECT 1 FROM public.devices 
    WHERE license_id = v_license.id AND device_fingerprint != p_device_fingerprint AND is_active = true
  ) THEN
    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status, error_message)
    VALUES(p_activation_code, p_device_fingerprint, 'FAILED', 'Code already used on another device');
    RETURN jsonb_build_object('success', false, 'error', 'This activation code is permanently bound to another device and cannot be reused.');
  END IF;

  -- 7. Device limit check
  SELECT count(*) INTO v_count FROM public.devices WHERE license_id = v_license.id AND is_active = true;
  IF v_count >= v_license.max_devices THEN
    INSERT INTO public.activation_logs(activation_code, device_fingerprint, status, error_message)
    VALUES(p_activation_code, p_device_fingerprint, 'FAILED', 'Device limit reached');
    RETURN jsonb_build_object('success', false, 'error',
      'Device limit reached (' || v_count || '/' || v_license.max_devices || '). Contact administrator to reset.');
  END IF;

  -- 8. Bind new device
  INSERT INTO public.devices(license_id, device_fingerprint, device_brand, device_model, android_id)
  VALUES(v_license.id, p_device_fingerprint, p_device_brand, p_device_model, p_android_id)
  RETURNING id INTO v_device;

  -- Mark license as used upon successful binding!
  UPDATE public.licenses SET is_used = true WHERE id = v_license.id;

  INSERT INTO public.activation_logs(activation_code, device_fingerprint, status)
  VALUES(p_activation_code, p_device_fingerprint, 'SUCCESS');

  RETURN jsonb_build_object(
    'success',          true,
    'dealer_name',      COALESCE(v_dealer.name,       'My Shiva Honda'),
    'dealer_owner',     COALESCE(v_dealer.owner_name, 'Authorized Dealer'),
    'dealer_location',  COALESCE(v_dealer.city,       'Biaora'),
    'expires_at',       v_license.expires_at,
    'device_id',        v_device.id
  );
END;
$$;


-- =============================================================================
-- RPC: verify_license
-- Called every 7 days for periodic online verification.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_license(
  p_activation_code    TEXT,
  p_device_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_license RECORD;
  v_dealer  RECORD;
  v_device  RECORD;
BEGIN
  -- 1. Find license
  SELECT * INTO v_license FROM public.licenses WHERE activation_code = p_activation_code;
  IF NOT FOUND OR NOT v_license.is_active THEN
    RETURN jsonb_build_object('success', false, 'code', 'LICENSE_INACTIVE',
      'error', 'License has been deactivated.');
  END IF;

  -- 2. Expiry check
  IF v_license.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'code', 'LICENSE_EXPIRED',
      'error', 'License subscription has expired.');
  END IF;

  -- 3. Dealer active check
  IF v_license.dealer_id IS NOT NULL THEN
    SELECT * INTO v_dealer FROM public.dealers WHERE id = v_license.dealer_id;
    IF FOUND AND NOT v_dealer.is_active THEN
      RETURN jsonb_build_object('success', false, 'code', 'DEALER_DEACTIVATED',
        'error', 'Dealer account has been deactivated.');
    END IF;
  END IF;

  -- 4. Device active check
  SELECT * INTO v_device FROM public.devices
  WHERE license_id = v_license.id AND device_fingerprint = p_device_fingerprint;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'DEVICE_NOT_BOUND',
      'error', 'Device fingerprint not bound to this license.');
  END IF;

  IF NOT v_device.is_active THEN
    RETURN jsonb_build_object('success', false, 'code', 'DEVICE_BLOCKED',
      'error', 'This device has been blocked by administrator.');
  END IF;

  -- 5. Set license as used on successful verification
  UPDATE public.licenses SET is_used = true WHERE id = v_license.id;

  INSERT INTO public.verification_logs(device_id, status) VALUES(v_device.id, 'SUCCESS');

  RETURN jsonb_build_object(
    'success',          true,
    'dealer_name',      COALESCE(v_dealer.name,    'My Shiva Honda'),
    'dealer_location',  COALESCE(v_dealer.city,    'Biaora'),
    'expires_at',       v_license.expires_at
  );
END;
$$;


-- =============================================================================
-- SEED: Insert your first dealer and license
-- =============================================================================

-- Step 1: Create default dealer
INSERT INTO public.dealers(name, owner_name, mobile, city)
VALUES('My Shiva Honda', 'Badone Motors Admin', '9876543210', 'Biaora')
ON CONFLICT (mobile) DO UPDATE 
SET name = EXCLUDED.name, owner_name = EXCLUDED.owner_name, city = EXCLUDED.city;

-- Step 2: Create default license key (1-year validity)
INSERT INTO public.licenses(dealer_id, activation_code, expires_at, max_devices, is_used)
VALUES(
  (SELECT id FROM public.dealers WHERE mobile = '9876543210' LIMIT 1),
  'MSH-2026-BIAORA-001',
  '2027-05-20 00:00:00+00',
  1,
  false
)
ON CONFLICT (activation_code) DO NOTHING;
