import { useMemo, useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useInboxStore } from "@/stores/inboxStore";
import { useUIStore } from "@/stores/uiStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { computeAllNotifications } from "@/lib/notificationEngine";
import { NotificationItem, CustomReminder } from "@/types/notification";
import { generateIcsCalendar, downloadIcsFile } from "@/utils/calendarExport";
import { notificationSound } from "@/lib/notificationSound";

export function useNotificationCenter() {
  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const plannedExpenses = useAppStore((s) => s.plannedExpenses || []);
  const categoryBudgets = useAppStore((s) => s.categoryBudgets || []);
  const loans = useAppStore((s) => s.loans || []);
  const transactions = useAppStore((s) => s.transactions || []);
  const categories = useAppStore((s) => s.categories || []);
  const settings = useAppStore((s) => s.settings);

  const logRecurringAsTransaction = useAppStore((s) => s.logRecurringAsTransaction);
  const markPlannedExpenseAsPaid = useAppStore((s) => s.markPlannedExpenseAsPaid);
  const showToast = useUIStore((s) => s.showToast);

  const inboxItems = useInboxStore((s) => s.items || []);

  const preferences = useNotificationStore((s) => s.preferences);
  const customReminders = useNotificationStore((s) => s.customReminders || []);
  const readIds = useNotificationStore((s) => s.readIds || []);
  const dismissedIds = useNotificationStore((s) => s.dismissedIds || {});
  const snoozedMap = useNotificationStore((s) => s.snoozedMap || {});
  const history = useNotificationStore((s) => s.history || []);

  const markAsReadAction = useNotificationStore((s) => s.markAsRead);
  const markAllAsReadAction = useNotificationStore((s) => s.markAllAsRead);
  const snoozeAction = useNotificationStore((s) => s.snoozeNotification);
  const unsnoozeAction = useNotificationStore((s) => s.unsnoozeNotification);
  const dismissAction = useNotificationStore((s) => s.dismissNotification);
  const restoreAction = useNotificationStore((s) => s.restoreNotification);
  const updatePreferences = useNotificationStore((s) => s.updatePreferences);
  const logHistoryEvent = useNotificationStore((s) => s.logHistoryEvent);
  const addCustomReminder = useNotificationStore((s) => s.addCustomReminder);
  const updateCustomReminder = useNotificationStore((s) => s.updateCustomReminder);
  const toggleCustomReminder = useNotificationStore((s) => s.toggleCustomReminder);
  const deleteCustomReminder = useNotificationStore((s) => s.deleteCustomReminder);

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default";
  });

  // Track browser permission status if it changes
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  // Compute active and snoozed notifications
  const { activeList, snoozedList, urgentCount, unreadCount } = useMemo(() => {
    return computeAllNotifications({
      recurringExpenses,
      plannedExpenses,
      categoryBudgets,
      loans,
      transactions,
      categories,
      settings,
      customReminders,
      inboxItemsCount: inboxItems.length,
      preferences,
      readIds: readSet,
      dismissedIds,
      snoozedMap,
    });
  }, [
    recurringExpenses,
    plannedExpenses,
    categoryBudgets,
    loans,
    transactions,
    categories,
    settings,
    customReminders,
    inboxItems.length,
    preferences,
    readSet,
    dismissedIds,
    snoozedMap,
  ]);

  // Groupings
  const overdueList = useMemo(() => activeList.filter((n) => n.bucket === "overdue"), [activeList]);
  const todayList = useMemo(() => activeList.filter((n) => n.bucket === "today"), [activeList]);
  const tomorrowList = useMemo(() => activeList.filter((n) => n.bucket === "tomorrow"), [activeList]);
  const thisWeekList = useMemo(() => activeList.filter((n) => n.bucket === "this_week"), [activeList]);
  const upcomingList = useMemo(() => activeList.filter((n) => n.bucket === "upcoming"), [activeList]);

  // Mark all active as read
  const markAllAsRead = useCallback(() => {
    const ids = activeList.map((n) => n.id);
    markAllAsReadAction(ids);
    showToast("All notifications marked as read");
  }, [activeList, markAllAsReadAction, showToast]);

  // Pay bill or plan directly
  const markPaid = useCallback((item: NotificationItem, customDate?: string) => {
    if (preferences.soundEnabled) {
      notificationSound.playChime("success");
    }

    if (item.actionType === "pay_bill" && item.originalId) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dateToUse = customDate || item.dateStr || todayStr;
      logRecurringAsTransaction(item.originalId, dateToUse);
      logHistoryEvent({
        notificationId: item.id,
        title: item.title,
        type: "bill",
        action: "paid",
        amount: item.amount,
      });
      showToast(`Payment logged for "${item.title}"`);
    } else if (item.actionType === "pay_plan" && item.originalId) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dateToUse = customDate || item.dateStr || todayStr;
      markPlannedExpenseAsPaid(item.originalId, dateToUse);
      logHistoryEvent({
        notificationId: item.id,
        title: item.title,
        type: "planned",
        action: "paid",
        amount: item.amount,
      });
      showToast(`Marked "${item.title}" as paid`);
    } else if (item.actionType === "complete_reminder" && item.originalId) {
      toggleCustomReminder(item.originalId);
      showToast(`Completed reminder: "${item.title}"`);
    }
  }, [preferences.soundEnabled, logRecurringAsTransaction, markPlannedExpenseAsPaid, toggleCustomReminder, logHistoryEvent, showToast]);

  // Snooze helper
  const snooze = useCallback((id: string, options: { days?: number; hours?: number; customIso?: string }) => {
    snoozeAction(id, options);
    const label = options.days === 1 
      ? "Snoozed until tomorrow" 
      : options.days 
      ? `Snoozed for ${options.days} days` 
      : "Snoozed";
    showToast(label);
  }, [snoozeAction, showToast]);

  // Dismiss helper
  const dismiss = useCallback((item: NotificationItem) => {
    dismissAction(item.id, item.title, item.type);
    showToast(`Dismissed: "${item.title}"`);
  }, [dismissAction, showToast]);

  // Restore helper
  const restore = useCallback((id: string) => {
    restoreAction(id);
    showToast("Notification restored to active list");
  }, [restoreAction, showToast]);

  // Request browser push notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Browser push notifications are not supported on this browser", "error");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "granted") {
        if (preferences.soundEnabled) {
          notificationSound.playChime("success");
        }
        showToast("System alerts enabled! You will receive timely reminders.");
        new Notification("Spend Alerts Activated", {
          body: "Push alerts enabled for bills, upcoming planned expenses, and budget thresholds.",
          icon: "/favicon.svg",
        });
      } else {
        showToast("Notification permission was denied in your browser settings", "error");
      }
    } catch (e) {
      console.error(e);
    }
  }, [preferences.soundEnabled, showToast]);

  // Export calendar .ics
  const exportIcs = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const icsString = generateIcsCalendar(plannedExpenses, recurringExpenses, settings.currency);
    downloadIcsFile(icsString, `spend-reminders-${todayStr}.ics`);
    showToast("Calendar (.ics) exported! Open in Apple Calendar, Google Calendar, or Outlook.");
  }, [plannedExpenses, recurringExpenses, settings.currency, showToast]);

  return {
    allNotifications: activeList,
    snoozedNotifications: snoozedList,
    overdueList,
    todayList,
    tomorrowList,
    thisWeekList,
    upcomingList,
    urgentCount,
    unreadCount,
    totalCount: activeList.length,
    snoozedCount: snoozedList.length,
    history,
    preferences,
    customReminders,
    browserPermission,
    markAsRead: markAsReadAction,
    markAllAsRead,
    snooze,
    unsnooze: unsnoozeAction,
    dismiss,
    restore,
    markPaid,
    updatePreferences,
    addCustomReminder,
    updateCustomReminder,
    toggleCustomReminder,
    deleteCustomReminder,
    requestBrowserPermission,
    exportIcs,
  };
}
