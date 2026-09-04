/**
 * gateUnlockService.js
 *
 * One implementation of "open the gym gate over BLE", shared by the check-in
 * modal (PresenceScreen) and the access screen (AccessScreen).
 *
 * Two reader modes exist in the field:
 *   · Active  — the app connects and transmits; autoUnlock() resolves.
 *   · Passive — the reader picks the credential up on its own and grants access
 *               without the app ever completing a connection. autoUnlock() then
 *               rejects with NO_READERS_FOUND even though the door opened, so we
 *               reconcile against the AxTraxPro event log before deciding.
 *
 * Never throws — always resolves to a verdict the caller can render.
 */

import { autoUnlock } from './bleService';
import { fetchMyGateEvents } from './accessService';

/** AxTraxPro event type for "Access Granted". Denied events use other codes. */
export const EVENT_TYPE_GRANTED = 17;

/** How far back a reader event may be and still count as "this tap". */
const PASSIVE_WINDOW_MS = 10000;

/**
 * Attempt a gate unlock.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.timeoutSeconds=10] - BLE scan window
 * @returns {Promise<{
 *   granted: boolean,
 *   passive: boolean,          // granted via the event log, not an active transmit
 *   code: string|null,         // BLE error code when not granted
 *   reader: string|null,       // reader name/address on an active unlock
 *   events: Array|null,        // events fetched during reconciliation, if any
 *   reason: string|null,       // human-readable denial reason
 * }>}
 */
export async function unlockGate({ timeoutSeconds = 10 } = {}) {
  const tappedAt = Date.now();

  try {
    const reader = await autoUnlock(timeoutSeconds);
    return { granted: true, passive: false, code: null, reader, events: null, reason: null };
  } catch (err) {
    const code = err?.code ?? err?.message ?? 'UNKNOWN';

    // Device-state problems: the user has to fix something before we retry.
    // Deliberately NOT reconciled against the event log — nothing was sent.
    if (code === 'BT_NOT_ENABLED' || code === 'PERMISSION_DENIED') {
      return { granted: false, passive: false, code, reader: null, events: null, reason: null };
    }

    // Passive-reader reconciliation: did AxTraxPro record a grant for us just now?
    try {
      const events = await fetchMyGateEvents(5);
      const passiveGranted = (events ?? []).some((e) => {
        const eventMs = new Date(e.dtEventReal).getTime();
        return e.iEventType === EVENT_TYPE_GRANTED && eventMs >= tappedAt - PASSIVE_WINDOW_MS;
      });

      return passiveGranted
        ? { granted: true, passive: true, code: null, reader: null, events, reason: null }
        : {
            granted: false,
            passive: false,
            code,
            reader: null,
            events,
            reason: 'BLE authentication failed',
          };
    } catch {
      // AxTraxPro unreachable (or disabled → 503). We cannot prove a grant.
      return {
        granted: false,
        passive: false,
        code,
        reader: null,
        events: null,
        reason: 'BLE authentication failed',
      };
    }
  }
}
