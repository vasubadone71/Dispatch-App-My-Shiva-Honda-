/**
 * Telegram API Integration Service
 *
 * Dispatches license activation requests to the administrator's Telegram Bot.
 *
 * IMPORTANT DESIGN CHANGE:
 *   The old system embedded a GET link in the Telegram message so the admin could
 *   click it to approve. This is BROKEN because PostgREST maps GET requests to
 *   READ-ONLY transactions → INSERT/UPDATE inside the Supabase function FAIL.
 *
 *   NEW FLOW:
 *     1. This service sends a notification-only message (no GET link).
 *     2. Approval is performed via a proper POST request using approveDealerPost()
 *        from src/api/supabase.js (triggered from the Admin panel or bot webhook).
 *     3. On successful approval, Supabase itself sends the activation code back
 *        to this Telegram chat via its own http_post extension call.
 */

const BOT_TOKEN    = '8707079325:AAH2RhnsWPk69pTnzvfuzkzJsAps72lb1_8';
const ADMIN_CHAT_ID = '1107412891';

const TELEGRAM_ENDPOINT = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────
const sendTelegramMessage = async (text) => {
  console.log('[TelegramService] Sending message to admin chat:', ADMIN_CHAT_ID);
  try {
    const response = await fetch(TELEGRAM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    ADMIN_CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (response.ok && data.ok) {
      console.log('[TelegramService] ✅ Message delivered successfully.');
      return { success: true };
    } else {
      console.error('[TelegramService] API returned error:', data);
      return { success: false, error: data.description || 'Telegram API rejected the message.' };
    }
  } catch (error) {
    console.error('[TelegramService] Network error:', error);
    return { success: false, error: 'Network connection failed. Please check your internet.' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATION REQUEST NOTIFICATION (sent when dealer submits registration form)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a new activation request notification to the admin Telegram bot.
 *
 * NOTE: This message NO LONGER contains a GET approval link (those are broken).
 * Approval must be performed via POST request using approveDealerPost(pendingId)
 * from src/api/supabase.js.
 *
 * The pendingId is included in the message so the admin can identify and
 * trigger approval from an admin panel or bot command.
 */
export const sendActivationRequestToTelegram = async ({
  dealerName,
  ownerName,
  mobile,
  city,
  deviceBrand,
  deviceModel,
  androidId,
  deviceHash,
  pendingId,          // UUID from Supabase pending_activations — included for admin reference
}) => {
  const dateOptions  = { day: '2-digit', month: 'short', year: 'numeric' };
  const requestedAt  = new Date().toLocaleDateString('en-GB', dateOptions).replace(/ /g, '-');

  const messageText = [
    '🚨 *NEW APP ACTIVATION REQUEST*',
    '',
    `*Dealer:* ${dealerName}`,
    `*Owner:* ${ownerName}`,
    `*Mobile:* ${mobile}`,
    `*City:* ${city}`,
    '',
    `*Device:* ${deviceBrand} ${deviceModel}`,
    `*Android ID:* ${androidId || 'N/A'}`,
    `*Fingerprint:* \`${deviceHash}\``,
    '',
    `*Requested At:* ${requestedAt}`,
    pendingId ? `\n*Pending ID:* \`${pendingId}\`\n\n⚡ To approve, run POST to:\n\`/rest/v1/rpc/approve_dealer_get\`\nBody: \`{"p_pending_id":"${pendingId}"}\`` : '',
  ].filter(line => line !== undefined).join('\n').trim();

  console.log('[TelegramService] sendActivationRequestToTelegram — dealer:', dealerName, '| pendingId:', pendingId);
  return await sendTelegramMessage(messageText);
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL CONFIRMATION (sent after admin successfully triggers POST approval)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends an approval confirmation message to the admin bot.
 * Also includes the activation code so admin can share it with the dealer.
 *
 * NOTE: In most cases the Supabase RPC itself sends this message automatically
 * via its internal http_post call. This client-side version is a fallback.
 */
export const sendApprovalConfirmationToTelegram = async ({
  dealerName,
  ownerName,
  city,
  deviceBrand,
  deviceModel,
  activationCode,
}) => {
  const messageText = [
    '✅ *DEALER ACTIVATION APPROVED*',
    '',
    `*Dealer:* ${dealerName}`,
    `*Owner:* ${ownerName}`,
    `*City:* ${city}`,
    `*Device:* ${deviceBrand} ${deviceModel}`,
    '',
    '🔑 *Generated Activation Code:*',
    `\`${activationCode}\``,
    '',
    'Please share this code with the dealer to complete activation.',
  ].join('\n');

  console.log('[TelegramService] sendApprovalConfirmationToTelegram — code:', activationCode);
  return await sendTelegramMessage(messageText);
};
