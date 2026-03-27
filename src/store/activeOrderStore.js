import { create } from 'zustand';

export const useActiveOrderStore = create((set) => ({
  activeOrder: null,                               // { id, ref, status } or full order object
  setActiveOrder: (order) => set({ activeOrder: order }),
  clearActiveOrder: () => set({ activeOrder: null }),
}));
