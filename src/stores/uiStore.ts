import { create } from "zustand";
import { Transaction } from "@/types/transaction";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "info" | "error";
  action?: ToastAction;
}

interface UIState {
  // Navigation & Modals
  isAddModalOpen: boolean;
  addModalInitialType: "expense" | "income";
  addModalPrefill: Partial<Transaction> | null;
  selectedMonth: string; // YYYY-MM
  activityDateFilter: string | null;
  focusedTransactionId: string | null;
  
  // User Profile & Account Modals
  userName: string;
  isProfileModalOpen: boolean;
  isHelpModalOpen: boolean;
  isLogoutModalOpen: boolean;

  // Feedback
  toast: ToastMessage | null;
  hasFirestorePermissionError: boolean;

  // Actions
  openAddModal: (type?: "expense" | "income", prefill?: Partial<Transaction> | null) => void;
  closeAddModal: () => void;
  setSelectedMonth: (monthKey: string) => void;
  setActivityDateFilter: (date: string | null) => void;
  setFocusedTransactionId: (id: string | null) => void;
  setUserName: (name: string) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  showToast: (
    message: string, 
    type?: "success" | "info" | "error", 
    action?: ToastAction, 
    duration?: number
  ) => void;
  hideToast: () => void;
  setFirestorePermissionError: (hasError: boolean) => void;
  dismissFirestorePermissionError: () => void;
}

export const useUIStore = create<UIState>((set) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const initialUserName = typeof window !== "undefined" ? localStorage.getItem("spend_user_name") || "Madhusudan" : "Madhusudan";

  return {
    isAddModalOpen: false,
    addModalInitialType: "expense",
    addModalPrefill: null,
    selectedMonth: currentMonth,
    activityDateFilter: null,
    focusedTransactionId: null,

    userName: initialUserName,
    isProfileModalOpen: false,
    isHelpModalOpen: false,
    isLogoutModalOpen: false,

    toast: null,
    hasFirestorePermissionError: false,

    openAddModal: (type = "expense", prefill = null) => {
      set({
        isAddModalOpen: true,
        addModalInitialType: type,
        addModalPrefill: prefill,
      });
    },

    closeAddModal: () => {
      set({
        isAddModalOpen: false,
        addModalPrefill: null,
      });
    },

    setSelectedMonth: (monthKey: string) => {
      set({ selectedMonth: monthKey });
    },

    setActivityDateFilter: (date: string | null) => {
      set({ activityDateFilter: date });
    },

    setFocusedTransactionId: (id: string | null) => {
      set({ focusedTransactionId: id });
    },

    setUserName: (name: string) => {
      set({ userName: name });
      try {
        localStorage.setItem("spend_user_name", name);
      } catch {}
    },

    openProfileModal: () => set({ isProfileModalOpen: true }),
    closeProfileModal: () => set({ isProfileModalOpen: false }),

    openHelpModal: () => set({ isHelpModalOpen: true }),
    closeHelpModal: () => set({ isHelpModalOpen: false }),

    openLogoutModal: () => set({ isLogoutModalOpen: true }),
    closeLogoutModal: () => set({ isLogoutModalOpen: false }),

    showToast: (
      message: string, 
      type: "success" | "info" | "error" = "success",
      action?: ToastAction,
      duration?: number
    ) => {
      const id = Date.now().toString();
      set({ toast: { id, message, type, action } });
      const timeoutMs = duration ?? (action ? 6000 : 3200);
      setTimeout(() => {
        set((state) => (state.toast?.id === id ? { toast: null } : state));
      }, timeoutMs);
    },

    hideToast: () => {
      set({ toast: null });
    },

    setFirestorePermissionError: (hasError: boolean) => {
      set({ hasFirestorePermissionError: hasError });
    },

    dismissFirestorePermissionError: () => {
      set({ hasFirestorePermissionError: false });
    },
  };
});
