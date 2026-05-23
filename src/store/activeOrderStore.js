import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useActiveOrderStore = create(
  persist(
    (set) => ({
      activeOrder: null,
      // Cafe-side customer id, learned from /orders/active. Cached so we can
      // subscribe to the per-customer discovery channel even before an order
      // exists for the user.
      customerId: null,
      setActiveOrder:   (order)  => set({ activeOrder: order }),
      clearActiveOrder: ()       => set({ activeOrder: null }),
      setCustomerId:    (id)     => set({ customerId: id ?? null }),
      // Status-only update — preserves all other fields (pickupOtp, ref, etc.)
      updateOrderStatus: (status) =>
        set((s) => s.activeOrder
          ? { activeOrder: { ...s.activeOrder, status } }
          : s
        ),
    }),
    {
      // v2: status enum migrated from lowercase ('received'/'preparing'/'ready')
      // to the canonical backend enum (NEW/PREPARING/READY/...). Bumping the
      // storage key drops stale entries from old builds.
      name: 'bg-active-order-v2',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
