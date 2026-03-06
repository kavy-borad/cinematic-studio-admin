import { create } from 'zustand';
import { getUnreadQuotationCount, getUnreadQuotations } from '@/lib/api';

interface NotificationState {
    unreadCount: number;
    notifications: any[];
    fetchUnreadCount: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    setUnreadCount: (count: number) => void;
    removeNotification: (id: number) => void;
    clearAll: () => void;
}

let hasFetched = false;

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    notifications: [],

    fetchUnreadCount: async () => {
        try {
            const res = await getUnreadQuotationCount();
            if (res.success) set({ unreadCount: res.data.unreadCount });
        } catch (e) { /* ignore */ }
    },

    fetchNotifications: async () => {
        try {
            const res = await getUnreadQuotations();
            if (res.success) set({ notifications: res.data });
        } catch (e) { /* ignore */ }
    },

    setUnreadCount: (count) => set({ unreadCount: count }),

    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, state.unreadCount - 1),
    })),

    clearAll: () => set({ unreadCount: 0, notifications: [] }),
}));

// Fetch once on app load
export function initNotifications() {
    if (hasFetched) return;
    hasFetched = true;
    useNotificationStore.getState().fetchUnreadCount();
}
