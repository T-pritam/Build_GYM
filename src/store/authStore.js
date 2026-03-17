import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'bg_access_token',
  REFRESH_TOKEN: 'bg_refresh_token',
  USER_DATA: 'bg_user_data',
};

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true until initialize() runs

  /**
   * Restore persisted session from SecureStore.
   * Called once on app launch (SplashScreen or App.js).
   */
  initialize: async () => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(KEYS.USER_DATA),
      ]);

      const user = userStr ? JSON.parse(userStr) : null;

      if (accessToken && refreshToken && user) {
        set({ accessToken, refreshToken, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.warn('authStore.initialize error:', err);
      set({ isLoading: false });
    }
  },

  /**
   * Persist full auth session (called after OTP verify).
   */
  setAuth: async (user, accessToken, refreshToken) => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
        SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user)),
      ]);
      set({ user, accessToken, refreshToken, isAuthenticated: true });
    } catch (err) {
      console.warn('authStore.setAuth error:', err);
    }
  },

  /**
   * Persist only the new access + refresh tokens (called after token refresh).
   */
  setTokens: async (accessToken, refreshToken) => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
      ]);
      set({ accessToken, refreshToken });
    } catch (err) {
      console.warn('authStore.setTokens error:', err);
    }
  },

  /**
   * Update user's onboardingCompleted flag in-memory + storage.
   */
  markOnboardingComplete: async () => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, onboardingCompleted: true };
    try {
      await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(updatedUser));
    } catch (_) {}
    set({ user: updatedUser });
  },

  /**
   * Clear all auth state and SecureStore keys. Navigates to Login via listener.
   */
  logout: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(KEYS.USER_DATA),
      ]);
    } catch (_) {}
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
