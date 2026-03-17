import { create } from 'zustand';
import { getUnreadCount } from '../services/announcementService';

export const useAnnouncementStore = create((set) => ({
  unreadCount: 0,

  /** Fetch fresh count from backend — call on app foreground / focus. */
  refreshUnreadCount: async () => {
    try {
      const count = await getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // Silently fail — badge is best-effort
    }
  },

  /** Decrement locally after a single announcement is read. */
  markOneRead: () =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),

  /** Reset to zero (e.g. after mark-all-read). */
  clearUnread: () => set({ unreadCount: 0 }),
}));
