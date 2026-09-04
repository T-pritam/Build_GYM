import api from './apiService';

/**
 * GET /api/axtrax/my/events?limit=
 * Returns the caller's own gate events from AxTraxPro.
 * @param {number} limit - max events to return (default 20)
 * @returns {Promise<Array>}
 */
export async function fetchMyGateEvents(limit = 20) {
  const { data } = await api.get('/axtrax/my/events', { params: { limit } });
  return data.data ?? [];
}

/**
 * GET /api/axtrax/status?credential=
 * How the check-in dial should behave, decided by the backend so the flow can
 * be steered without shipping a new build.
 *
 *   ble_required  — only check in after the reader grants access
 *   ble_optional  — try the reader, still check in if it is unreachable
 *   presence_only — skip BLE entirely (also returned when AxTraxPro is off)
 *
 * Passing this phone's credential also asks "is THIS the registered device?".
 * Without it the gate simply never opens and the member has no way to know why.
 * `device.blockedReason` is one of:
 *   DEVICE_MISMATCH          — the account is registered to another phone
 *   CLAIMED_BY_OTHER_ACCOUNT — this phone belongs to a different account
 *   REGISTRATION_FAILED      — the last registration attempt errored
 *   INVALID_CREDENTIAL       — this device reported an unusable id
 *
 * Never throws — an unreachable/erroring backend degrades to presence_only.
 * @returns {Promise<{ enabled: boolean, mode: string, device: object }>}
 */
export async function fetchGateStatus(credential) {
  try {
    const { data } = await api.get('/axtrax/status', {
      params: credential ? { credential } : undefined,
    });
    return {
      enabled: !!data?.data?.enabled,
      mode:    data?.data?.mode ?? 'presence_only',
      device:  data?.data?.device ?? { registered: false, matchesThisDevice: null, blockedReason: null },
    };
  } catch {
    return {
      enabled: false,
      mode: 'presence_only',
      device: { registered: false, matchesThisDevice: null, blockedReason: null },
    };
  }
}
