/**
 * cafeApiService.js
 *
 * Axios instance pointed at the **standalone Cafe backend** (separate from
 * the gym backend). Uses its own access/refresh tokens stored in SecureStore
 * under `bg_cafe_*` keys. On 401, refreshes via the cafe backend's
 * /auth/refresh; if refresh fails it falls back to re-running the gym→cafe
 * bridge handshake via ensureCafeAuth().
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { CAFE_API_URL } from '@env';

export const CAFE_TOKEN_KEYS = {
  ACCESS: 'bg_cafe_access_token',
  REFRESH: 'bg_cafe_refresh_token',
};

let inMemoryAccess = null;
let inMemoryRefresh = null;
let bridgeFn = null; // injected by cafeAuthService to avoid circular import

export const _setBridgeRunner = (fn) => { bridgeFn = fn; };

export const getCafeAccessToken = async () => {
  if (inMemoryAccess) return inMemoryAccess;
  inMemoryAccess = await SecureStore.getItemAsync(CAFE_TOKEN_KEYS.ACCESS);
  return inMemoryAccess;
};

export const getCafeRefreshToken = async () => {
  if (inMemoryRefresh) return inMemoryRefresh;
  inMemoryRefresh = await SecureStore.getItemAsync(CAFE_TOKEN_KEYS.REFRESH);
  return inMemoryRefresh;
};

export const setCafeTokens = async (access, refresh) => {
  inMemoryAccess = access ?? null;
  inMemoryRefresh = refresh ?? null;
  if (access)  await SecureStore.setItemAsync(CAFE_TOKEN_KEYS.ACCESS, access);
  else         await SecureStore.deleteItemAsync(CAFE_TOKEN_KEYS.ACCESS);
  if (refresh) await SecureStore.setItemAsync(CAFE_TOKEN_KEYS.REFRESH, refresh);
  else         await SecureStore.deleteItemAsync(CAFE_TOKEN_KEYS.REFRESH);
};

export const clearCafeTokens = () => setCafeTokens(null, null);

const cafeApi = axios.create({
  baseURL: CAFE_API_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

cafeApi.interceptors.request.use(async (config) => {
  const token = await getCafeAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue = [];
const flushQueue = (err, token = null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

cafeApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject }))
        .then((tok) => {
          original.headers.Authorization = `Bearer ${tok}`;
          return cafeApi(original);
        });
    }

    original._retry = true;
    isRefreshing = true;
    try {
      const refresh = await getCafeRefreshToken();
      let newAccess = null;
      if (refresh) {
        try {
          const { data } = await axios.post(`${CAFE_API_URL}/auth/refresh`, { refreshToken: refresh });
          await setCafeTokens(data.accessToken, data.refreshToken ?? refresh);
          newAccess = data.accessToken;
        } catch (_) {
          // refresh failed — fall through to bridge
        }
      }
      if (!newAccess && bridgeFn) {
        const bridged = await bridgeFn({ force: true });
        newAccess = bridged?.accessToken ?? null;
      }
      if (!newAccess) throw error;
      flushQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return cafeApi(original);
    } catch (err) {
      flushQueue(err);
      await clearCafeTokens();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default cafeApi;
