import { create } from "zustand";
import { WebhookInboxItem, WebhookLog } from "@/types/webhook";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";

interface InboxState {
  items: WebhookInboxItem[];
  logs: WebhookLog[];
  isLoading: boolean;
  isSendingTest: boolean;
  isOpen: boolean;
  lastFetchedAt: number | null;

  setIsOpen: (isOpen: boolean) => void;
  fetchInbox: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
  confirmItem: (item: WebhookInboxItem) => Promise<boolean>;
  dismissItem: (id: string) => Promise<boolean>;
  confirmAll: () => Promise<boolean>;
  simulateTestWebhook: () => Promise<boolean>;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  items: [],
  logs: [],
  isLoading: false,
  isSendingTest: false,
  isOpen: false,
  lastFetchedAt: null,

  setIsOpen: (isOpen) => set({ isOpen }),

  fetchInbox: async () => {
    try {
      const res = await fetch("/api/webhook/inbox");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        set({ items: data.items, lastFetchedAt: Date.now() });
      }
    } catch (err) {
      // Silently handle network pauses
    }
  },

  fetchLogs: async () => {
    try {
      const res = await fetch("/api/webhook/logs");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        set({ logs: data.logs });
      }
    } catch (err) {
      // Ignore
    }
  },

  clearLogs: async () => {
    try {
      await fetch("/api/webhook/logs/clear", { method: "POST" });
      set({ logs: [] });
      useUIStore.getState().showToast("Debug logs cleared");
    } catch (err) {
      // Ignore
    }
  },

  confirmItem: async (item: WebhookInboxItem) => {
    try {
      // 1. Add to main transactions
      const addTransaction = useAppStore.getState().addTransaction;
      addTransaction({
        type: item.type || "expense",
        amount: item.amount,
        categoryId: item.categoryId || "cat-other-expense",
        date: item.date || new Date().toISOString().slice(0, 10),
        note: item.note || "MacroDroid Payment",
      });

      // 2. Notify backend to clear from queue
      await fetch(`/api/webhook/inbox/${item.id}/confirm`, { method: "POST" });

      // 3. Update local state
      set((s) => ({ items: s.items.filter((i) => i.id !== item.id) }));
      useUIStore.getState().showToast(`Confirmed: ${item.note}`);
      return true;
    } catch (err) {
      console.error("Failed to confirm webhook item:", err);
      useUIStore.getState().showToast("Failed to confirm transaction", "error");
      return false;
    }
  },

  dismissItem: async (id: string) => {
    try {
      await fetch(`/api/webhook/inbox/${id}`, { method: "DELETE" });
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      useUIStore.getState().showToast("Dismissed from inbox");
      return true;
    } catch (err) {
      console.error("Failed to dismiss item:", err);
      return false;
    }
  },

  confirmAll: async () => {
    const { items } = get();
    if (items.length === 0) return true;

    try {
      for (const item of items) {
        useAppStore.getState().addTransaction({
          type: item.type || "expense",
          amount: item.amount,
          categoryId: item.categoryId || "cat-other-expense",
          date: item.date || new Date().toISOString().slice(0, 10),
          note: item.note || "MacroDroid Payment",
        });
      }

      await fetch("/api/webhook/inbox/confirm-all", { method: "POST" });
      set({ items: [] });
      useUIStore.getState().showToast(`Confirmed all ${items.length} incoming transactions!`);
      return true;
    } catch (err) {
      console.error("Failed to confirm all:", err);
      return false;
    }
  },

  simulateTestWebhook: async () => {
    set({ isSendingTest: true });
    try {
      const res = await fetch("/api/webhook/test", { method: "POST" });
      const data = await res.json();
      if (data.success && data.item) {
        set((s) => ({ items: [data.item, ...s.items] }));
        get().fetchLogs();
        useUIStore.getState().showToast("Simulated MacroDroid transaction received in Inbox!");
        return true;
      }
      return false;
    } catch (err) {
      useUIStore.getState().showToast("Could not send test transaction", "error");
      return false;
    } finally {
      set({ isSendingTest: false });
    }
  },
}));
