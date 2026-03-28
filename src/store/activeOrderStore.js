import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useActiveOrderStore = create(
  persist(
    (set) => ({
      activeOrder: null,
      setActiveOrder:   (order)  => set({ activeOrder: order }),
      clearActiveOrder: ()       => set({ activeOrder: null }),
      // Status-only update — preserves pickupOtp and all other fields
      updateOrderStatus: (status) =>
        set((s) => s.activeOrder
          ? { activeOrder: { ...s.activeOrder, status } }
          : s
        ),
    }),
    {
      name: 'bg-active-order',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
