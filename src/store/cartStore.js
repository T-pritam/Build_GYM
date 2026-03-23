/**
 * cartStore.js — Persisted cart using Zustand v5 + AsyncStorage.
 * Items carry availability state so the UI can react to real-time socket events.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // { id, name, category, imageUrl, priceCoins, protein, calories, isAvailable, qty }

      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          if (existing) {
            return { items: s.items.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) };
          }
          return { items: [...s.items, { ...item, qty: 1 }] };
        }),

      removeItem: (id) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === id);
          if (existing?.qty === 1) return { items: s.items.filter((i) => i.id !== id) };
          return { items: s.items.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i) };
        }),

      clearCart: () => set({ items: [] }),

      /** Called when socket fires menu:item_updated — marks item unavailable in cart */
      markUnavailable: (id) =>
        set((s) => ({
          items: s.items.map((i) => i.id === id ? { ...i, isAvailable: false } : i),
        })),

      /** Called when socket fires menu:item_updated and item becomes available again */
      markAvailable: (id) =>
        set((s) => ({
          items: s.items.map((i) => i.id === id ? { ...i, isAvailable: true } : i),
        })),
    }),
    {
      name: 'bg-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Derived helpers — call these outside the store
export const cartTotal = (items) => items.reduce((s, i) => s + i.priceCoins * i.qty, 0);
export const cartQty   = (items) => items.reduce((s, i) => s + i.qty, 0);
export const hasUnavailableItems = (items) => items.some((i) => !i.isAvailable);
