import { create } from "zustand";
import { 
  CustomReminder, 
  NotificationPreferences, 
  ResolvedNotificationEvent 
} from "@/types/notification";
import { notificationSound } from "@/lib/notificationSound";

const NOTIFICATIONS_STORAGE_KEY = "spend_notifications_store_v1";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableBrowserPush: true,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  leadDaysBills: 5,
  leadDaysPlanned: 3,
  leadDaysLoans: 7,
  budgetThresholdPercent: 80,
  channelBills: true,
  channelPlanned: true,
  channelBudgets: true,
  channelLoans: true,
  channelReminders: true,
  channelSystem: true,
  groupingMode: "chronological",
};

const DEFAULT_CUSTOM_REMINDERS: CustomReminder[] = [
  {
    id: "cr-sample-1",
    title: "Review Credit Card Statement & Hidden Fees",
    notes: "Double check for recurring micro-subscriptions or unauthorized charges.",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    dueTime: "18:00",
    priority: "high",
    recurrence: "monthly",
    categoryIcon: "💳",
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cr-sample-2",
    title: "Transfer 15% to High-Yield Savings Account",
    notes: "Automate emergency fund balance growth before month-end discretionary spend.",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    dueTime: "10:00",
    priority: "normal",
    recurrence: "monthly",
    categoryIcon: "🏦",
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface NotificationStoreState {
  preferences: NotificationPreferences;
  customReminders: CustomReminder[];
  readIds: string[];
  dismissedIds: Record<string, number>; // id -> timestamp
  snoozedMap: Record<string, { until: string; reason?: string }>;
  history: ResolvedNotificationEvent[];

  // Reminder CRUD
  addCustomReminder: (data: Omit<CustomReminder, "id" | "isCompleted" | "createdAt" | "updatedAt">) => CustomReminder;
  updateCustomReminder: (id: string, updates: Partial<CustomReminder>) => void;
  toggleCustomReminder: (id: string) => void;
  deleteCustomReminder: (id: string) => void;

  // Notification State Actions
  markAsRead: (id: string) => void;
  markAllAsRead: (idsToMark?: string[]) => void;
  snoozeNotification: (id: string, options: { days?: number; hours?: number; customIso?: string }) => void;
  unsnoozeNotification: (id: string) => void;
  dismissNotification: (id: string, title?: string, type?: string) => void;
  restoreNotification: (id: string) => void;
  clearAllDismissed: () => void;

  // Preferences & History
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  logHistoryEvent: (event: Omit<ResolvedNotificationEvent, "id" | "timestamp">) => void;
  clearHistory: () => void;
}

function loadPersistedState() {
  if (typeof window === "undefined") {
    return {
      preferences: DEFAULT_PREFERENCES,
      customReminders: DEFAULT_CUSTOM_REMINDERS,
      readIds: [],
      dismissedIds: {},
      snoozedMap: {},
      history: [],
    };
  }

  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      return {
        preferences: DEFAULT_PREFERENCES,
        customReminders: DEFAULT_CUSTOM_REMINDERS,
        readIds: [],
        dismissedIds: {},
        snoozedMap: {},
        history: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
      customReminders: Array.isArray(parsed.customReminders) ? parsed.customReminders : DEFAULT_CUSTOM_REMINDERS,
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      dismissedIds: parsed.dismissedIds && typeof parsed.dismissedIds === "object" ? parsed.dismissedIds : {},
      snoozedMap: parsed.snoozedMap && typeof parsed.snoozedMap === "object" ? parsed.snoozedMap : {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (e) {
    console.error("Failed to parse notifications store:", e);
    return {
      preferences: DEFAULT_PREFERENCES,
      customReminders: DEFAULT_CUSTOM_REMINDERS,
      readIds: [],
      dismissedIds: {},
      snoozedMap: {},
      history: [],
    };
  }
}

function saveState(state: {
  preferences: NotificationPreferences;
  customReminders: CustomReminder[];
  readIds: string[];
  dismissedIds: Record<string, number>;
  snoozedMap: Record<string, { until: string; reason?: string }>;
  history: ResolvedNotificationEvent[];
}) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to persist notifications store:", e);
  }
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => {
  const initial = loadPersistedState();

  const sync = (updater: (prev: NotificationStoreState) => Partial<NotificationStoreState>) => {
    set((state) => {
      const updated = updater(state);
      const nextState = {
        ...state,
        ...updated,
      };
      saveState({
        preferences: nextState.preferences,
        customReminders: nextState.customReminders,
        readIds: nextState.readIds,
        dismissedIds: nextState.dismissedIds,
        snoozedMap: nextState.snoozedMap,
        history: nextState.history,
      });
      return nextState;
    });
  };

  return {
    ...initial,

    addCustomReminder: (data) => {
      const now = new Date().toISOString();
      const newReminder: CustomReminder = {
        ...data,
        id: `remind-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
      };

      if (get().preferences.soundEnabled) {
        notificationSound.playChime("pop");
      }

      sync((s) => ({
        customReminders: [newReminder, ...s.customReminders],
      }));

      return newReminder;
    },

    updateCustomReminder: (id, updates) => {
      sync((s) => ({
        customReminders: s.customReminders.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ),
      }));
    },

    toggleCustomReminder: (id) => {
      const reminder = get().customReminders.find((r) => r.id === id);
      const isNowCompleted = !reminder?.isCompleted;

      if (get().preferences.soundEnabled) {
        notificationSound.playChime(isNowCompleted ? "success" : "pop");
      }

      sync((s) => ({
        customReminders: s.customReminders.map((r) =>
          r.id === id
            ? {
                ...r,
                isCompleted: isNowCompleted,
                completedAt: isNowCompleted ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
            : r
        ),
      }));

      if (reminder && isNowCompleted) {
        get().logHistoryEvent({
          notificationId: `custom-remind-${id}`,
          title: reminder.title,
          type: "reminder",
          action: "completed",
        });
      }
    },

    deleteCustomReminder: (id) => {
      sync((s) => ({
        customReminders: s.customReminders.filter((r) => r.id !== id),
      }));
    },

    markAsRead: (id) => {
      if (get().readIds.includes(id)) return;
      sync((s) => ({
        readIds: [...s.readIds, id],
      }));
    },

    markAllAsRead: (idsToMark) => {
      if (get().preferences.soundEnabled) {
        notificationSound.playChime("pop");
      }
      sync((s) => {
        if (idsToMark && idsToMark.length > 0) {
          const combined = Array.from(new Set([...s.readIds, ...idsToMark]));
          return { readIds: combined };
        }
        return { readIds: s.readIds };
      });
    },

    snoozeNotification: (id, options) => {
      let snoozeTime: number;
      if (options.customIso) {
        snoozeTime = new Date(options.customIso).getTime();
      } else if (options.days) {
        snoozeTime = Date.now() + options.days * 86400000;
      } else if (options.hours) {
        snoozeTime = Date.now() + options.hours * 3600000;
      } else {
        // Default snooze 24 hours
        snoozeTime = Date.now() + 86400000;
      }

      if (get().preferences.soundEnabled) {
        notificationSound.playChime("snooze");
      }

      const iso = new Date(snoozeTime).toISOString();
      sync((s) => ({
        snoozedMap: {
          ...s.snoozedMap,
          [id]: { until: iso },
        },
      }));
    },

    unsnoozeNotification: (id) => {
      sync((s) => {
        const nextMap = { ...s.snoozedMap };
        delete nextMap[id];
        return { snoozedMap: nextMap };
      });
    },

    dismissNotification: (id, title, type) => {
      if (get().preferences.soundEnabled) {
        notificationSound.playChime("dismiss");
      }
      sync((s) => ({
        dismissedIds: {
          ...s.dismissedIds,
          [id]: Date.now(),
        },
      }));

      if (title) {
        get().logHistoryEvent({
          notificationId: id,
          title,
          type: (type as any) || "system",
          action: "dismissed",
        });
      }
    },

    restoreNotification: (id) => {
      sync((s) => {
        const nextDismissed = { ...s.dismissedIds };
        delete nextDismissed[id];
        return { dismissedIds: nextDismissed };
      });
    },

    clearAllDismissed: () => {
      sync(() => ({ dismissedIds: {} }));
    },

    updatePreferences: (updates) => {
      sync((s) => ({
        preferences: { ...s.preferences, ...updates },
      }));
    },

    logHistoryEvent: (event) => {
      const newEvent: ResolvedNotificationEvent = {
        ...event,
        id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      sync((s) => ({
        history: [newEvent, ...s.history.slice(0, 150)], // Keep last 150 events
      }));
    },

    clearHistory: () => {
      sync(() => ({ history: [] }));
    },
  };
});
