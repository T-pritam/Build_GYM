/**
 * apiService.js
 *
 * Central Axios instance for all authenticated API calls.
 *
 * Interceptor behaviour:
 *  · Request  → attach `Authorization: Bearer <accessToken>` from Zustand store
 *  · Response → on 401:
 *      1. Try to refresh access + refresh tokens via POST /api/auth/refresh
 *      2. Retry original request with new access token
 *      3. If refresh itself fails (expired / revoked) → call logout() and reject
 *
 * Any part of the app that needs an authenticated request should import
 * this instance instead of plain `axios`.
 */

import axios from 'axios';
import { BASE_API_URL } from '@env';
import { useAuthStore } from '../store/authStore';
import { navigationRef } from '../navigation/navigationRef';

// ─── Base instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ─────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Token-refresh queue ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = []; // { resolve, reject }[]

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Membership frozen (paused) → drop the user onto the hard-lock screen no
    // matter which screen they're on. The backend blocks every non-recovery
    // endpoint with this code, so a mid-session pause locks the app immediately.
    if (error.response?.status === 403 && error.response?.data?.code === 'MEMBERSHIP_FROZEN') {
      // Lazy require to avoid the apiService → membershipStore → membershipService cycle.
      const { useMembershipStore } = require('../store/membershipStore');
      useMembershipStore.getState().refresh(); // loads frozen status + currentPause for the lock screen
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
      return Promise.reject(error);
    }

    // Only intercept 401 errors and prevent infinite retry loops
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    if (!refreshToken) {
      // No refresh token at all — force logout
      processQueue(error, null);
      isRefreshing = false;
      await logout();
      return Promise.reject(error);
    }

    try {
      // Use plain axios to avoid intercepting the refresh call itself
      const { data } = await axios.post(`${BASE_API_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken: newAccess, refreshToken: newRefresh } = data.data;

      await setTokens(newAccess, newRefresh);

      processQueue(null, newAccess);
      isRefreshing = false;

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh token is expired or invalid → logout
      processQueue(refreshError, null);
      isRefreshing = false;
      await logout();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
