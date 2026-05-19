/**
 * cartStore.js — Persisted cart using Zustand v5 + AsyncStorage.
 *
 * Items now use INR (`price`) instead of coins. Modifiers/addons follow the
 * cafe backend shape: `[{ name, price }]`. Items carry availability state so
 * the UI can react to Supabase realtime menu:availability events.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useCartStore = create(
  persist(
    (set, get) => ({
      // Each item:
      //   { id, menuItemId, name, category, imageUrl, price, protein, calories,
      //     isAvailable, qty, variationId, variationName, modifiers: [{name, price}],
      //     specialInstructions }
      items: [],

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

      markUnavailable: (id) =>
        set((s) => ({
          items: s.items.map((i) => i.id === id ? { ...i, isAvailable: false } : i),
        })),

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

const lineTotal = (i) => {
  const mods = Array.isArray(i.modifiers) ? i.modifiers.reduce((m, x) => m + (Number(x.price) || 0), 0) : 0;
  return ((Number(i.price) || 0) + mods) * (i.qty || 0);
};

// Derived helpers — call these outside the store
export const cartTotal = (items) => items.reduce((s, i) => s + lineTotal(i), 0);
export const cartQty   = (items) => items.reduce((s, i) => s + i.qty, 0);
export const hasUnavailableItems = (items) => items.some((i) => !i.isAvailable);
