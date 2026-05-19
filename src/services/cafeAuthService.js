/**
 * cafeAuthService.js
 *
 * Bridges the gym customer into the Cafe backend: signs phone+timestamp
 * with the shared GYM_BRIDGE_SECRET, posts to POST /auth/gym-bridge, and
 * stores the returned cafe access+refresh tokens in SecureStore.
 *
 * ensureCafeAuth() lazily bridges before the first cafe API request.
 */

import axios from 'axios';
import { sha256 } from 'js-sha256';
import { CAFE_API_URL, GYM_BRIDGE_SECRET } from '@env';
import { useAuthStore } from '../store/authStore';
import {
  setCafeTokens,
  getCafeAccessToken,
  _setBridgeRunner,
} from './cafeApiService';

function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  return s.startsWith('+91') ? s : `+91${s.replace(/\D/g, '')}`;
}

function signPayload(phone, timestamp) {
  return sha256.hmac(GYM_BRIDGE_SECRET, `${phone}.${timestamp}`);
}

/**
 * Perform a fresh bridge handshake. Returns { accessToken, refreshToken, user }.
 */
export async function bridgeLogin() {
  const { user } = useAuthStore.getState();
  const phoneRaw = user?.phone || user?.mobile || user?.phoneNumber;
  if (!phoneRaw) {
    throw new Error('No phone on gym user — cannot bridge to cafe');
  }
  const phone = normalizePhone(phoneRaw);
  const timestamp = Date.now();
  const signature = signPayload(phone, timestamp);

  const { data } = await axios.post(`${CAFE_API_URL}/auth/gym-bridge`, {
    phone,
    name: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
    email: user?.email || undefined,
    timestamp,
    signature,
  }, { timeout: 15000 });

  await setCafeTokens(data.accessToken, data.refreshToken);
  return data;
}

/**
 * Returns a valid cafe access token, bridging if missing or if `force` is set.
 */
export async function ensureCafeAuth({ force = false } = {}) {
  if (!force) {
    const existing = await getCafeAccessToken();
    if (existing) return { accessToken: existing };
  }
  return bridgeLogin();
}

// Allow cafeApiService's 401 interceptor to retry via bridge without circular import
_setBridgeRunner(ensureCafeAuth);
