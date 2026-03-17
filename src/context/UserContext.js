/**
 * UserContext — persisted session store for the member app.
 * Backed by AsyncStorage so the user stays logged in across app launches.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWallet, fetchTrainerForMember } from '../services/api';
import { registerForPushNotificationsAsync, saveFCMToken } from '../services/notificationService';

const UserContext = createContext(null);

const SESSION_KEY = '@bg_session_v1';

export function UserProvider({ children }) {
  const [userId, setUserId]   = useState(null);
  const [user, setUser]       = useState(null);     // user_profiles row
  const [wallet, setWallet]   = useState(null);     // { balance, totalEarned, totalSpent }
  const [trainer, setTrainer] = useState(null);     // assigned trainer info
  const [isReady, setIsReady] = useState(false);    // true once AsyncStorage read completes

  useEffect(() => { boot(); }, []);

  async function boot() {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (raw) {
        const { userId: uid, user: u } = JSON.parse(raw);
        if (uid) {
          setUserId(uid);
          setUser(u);
          loadExtras(uid);
          // Re-link FCM token in background on every boot
          registerForPushNotificationsAsync()
            .then(token => { if (token) saveFCMToken(token, null, uid); })
            .catch(() => {});
        }
      }
    } catch {}
    setIsReady(true);
  }

  function loadExtras(uid) {
    fetchWallet(uid)
      .then(d => setWallet(d?.wallet ?? null))
      .catch(() => {});
    fetchTrainerForMember(uid)
      .then(d => setTrainer(d ?? null))
      .catch(() => {});
  }

  async function signIn(uid, userData) {
    setUserId(uid);
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: uid, user: userData }));
    loadExtras(uid);
    // Link FCM token to this user after login
    registerForPushNotificationsAsync()
      .then(token => { if (token) saveFCMToken(token, null, uid); })
      .catch(() => {});
  }

  async function signOut() {
    setUserId(null);
    setUser(null);
    setWallet(null);
    setTrainer(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  const refreshWallet = useCallback(async () => {
    if (!userId) return;
    try {
      const d = await fetchWallet(userId);
      setWallet(d?.wallet ?? null);
    } catch {}
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, user, wallet, trainer, isReady, signIn, signOut, refreshWallet }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
