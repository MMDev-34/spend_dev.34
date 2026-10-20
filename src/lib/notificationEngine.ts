import { NotificationItem, NotificationPreferences, ChronologicalBucket, NotificationSeverity, CustomReminder } from "@/types/notification";
import { RecurringExpense, PlannedExpense, CategoryBudget } from "@/types/plan";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Loan } from "@/types/loan";
import { Settings } from "@/types/settings";
import { calculateCategoryBudgetProgress } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";

export interface ComputeNotificationParams {
  recurringExpenses: RecurringExpense[];
  plannedExpenses: PlannedExpense[];
  categoryBudgets: CategoryBudget[];
  loans: Loan[];
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  customReminders: CustomReminder[];
  inboxItemsCount: number;
  preferences: NotificationPreferences;
  readIds: Set<string>;
  dismissedIds: Record<string, number>;
  snoozedMap: Record<string, { until: string; reason?: string }>;
}

export function computeAllNotifications(params: ComputeNotificationParams): {
  activeList: NotificationItem[];
  snoozedList: NotificationItem[];
  urgentCount: number;
  unreadCount: number;
} {
  const {
    recurringExpenses,
    plannedExpenses,
    categoryBudgets,
    loans,
    transactions,
    categories,
    settings,
    customReminders,
    inboxItemsCount,
    preferences,
    readIds,
    dismissedIds,
    snoozedMap,
  } = params;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayDateOnly = new Date(currentYear, now.getMonth(), now.getDate());
  const todayStr = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  const currentMonthKey = todayStr.slice(0, 7);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const items: NotificationItem[] = [];

  const getBucket = (diffDays: number): ChronologicalBucket => {
    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "tomorrow";
    if (diffDays <= 7) return "this_week";
    return "upcoming";
  };

  // Helper to determine whether an item is dismissed
  const isDismissed = (id: string): boolean => {
    return Boolean(dismissedIds[id]);
  };

  // Helper to check snooze status
  const getSnoozeStatus = (id: string): { isSnoozed: boolean; until?: string } => {
    const entry = snoozedMap[id];
    if (!entry) return { isSnoozed: false };
    const snoozeTime = new Date(entry.until).getTime();
    if (isNaN(snoozeTime) || snoozeTime <= Date.now()) {
      return { isSnoozed: false };
    }
    return { isSnoozed: true, until: entry.until };
  };

  // 1. RECURRING BILLS & SUBSCRIPTIONS
  if (preferences.channelBills) {
    recurringExpenses
      .filter((r) => !r.isPaused)
      .forEach((r) => {
        // Calculate relevant due dates
        if (r.frequency === "monthly") {
          const dueDayVal = Math.max(1, Math.min(31, r.dueDay || 1));
          const dueDayStr = dueDayVal.toString().padStart(2, "0");
          const monthStr = currentMonth.toString().padStart(2, "0");
          const thisMonthDateStr = `${currentYear}-${monthStr}-${dueDayStr}`;
          const thisMonthBillDate = new Date(currentYear, currentMonth - 1, dueDayVal);

          const isPaidThisMonth = r.paidDates?.includes(currentMonthKey) || r.paidDates?.includes(thisMonthDateStr);

          let targetBillDate: Date;
          let targetDateStr: string;
          let isOverdueCycle = false;

          if (!isPaidThisMonth) {
            targetBillDate = thisMonthBillDate;
            targetDateStr = thisMonthDateStr;
            if (thisMonthBillDate.getTime() < todayDateOnly.getTime()) {
              isOverdueCycle = true;
            }
          } else {
            // Already paid this month! Check next month cycle if lead days reach it
            const nextMonthDate = new Date(currentYear, currentMonth, dueDayVal);
            const nextYear = nextMonthDate.getFullYear();
            const nextMonth = (nextMonthDate.getMonth() + 1).toString().padStart(2, "0");
            const nextDay = nextMonthDate.getDate().toString().padStart(2, "0");
            targetBillDate = nextMonthDate;
            targetDateStr = `${nextYear}-${nextMonth}-${nextDay}`;
          }

          const diffTime = targetBillDate.getTime() - todayDateOnly.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // Check lead days filter
          const allowedLeadDays = r.reminderDaysBefore !== undefined && r.reminderDaysBefore !== null
            ? (r.reminderDaysBefore === -1 ? 0 : r.reminderDaysBefore)
            : preferences.leadDaysBills;

          // If user set no reminder (-1), only show if due today or overdue
          if (r.reminderDaysBefore === -1 && diffDays > 0) return;

          // Only show if within allowed window or overdue
          if (diffDays <= allowedLeadDays || isOverdueCycle) {
            const notifId = `bill-${r.id}-${targetDateStr}`;
            if (isDismissed(notifId)) return;

            const { isSnoozed, until } = getSnoozeStatus(notifId);
            const cat = categoryMap.get(r.categoryId);

            let severity: NotificationSeverity = "info";
            if (diffDays < 0) severity = "urgent";
            else if (diffDays === 0) severity = "urgent";
            else if (diffDays <= 2) severity = "high";
            else if (diffDays <= 5) severity = "warning";

            const description = diffDays < 0
              ? `Payment overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`
              : diffDays === 0
              ? "Due today — tap Mark Paid when settled"
              : diffDays === 1
              ? "Due tomorrow"
              : `Due in ${diffDays} days (${targetDateStr})`;

            items.push({
              id: notifId,
              type: "bill",
              title: r.title,
              description,
              detailedMessage: r.notes || undefined,
              amount: r.amount,
              dateStr: targetDateStr,
              severity,
              bucket: getBucket(diffDays),
              daysRemaining: diffDays,
              categoryIcon: cat?.icon || "🧾",
              categoryName: cat?.name || "Bills & Subscriptions",
              originalId: r.id,
              actionType: "pay_bill",
              isRead: readIds.has(notifId),
              isSnoozed,
              snoozedUntil: until,
              createdAt: r.createdAt || new Date().toISOString(),
            });
          }
        } else if (r.frequency === "yearly" && r.dueMonth) {
          // Yearly bill
          const dueDayVal = Math.max(1, Math.min(31, r.dueDay || 1));
          let billYear = currentYear;
          let yearlyDate = new Date(billYear, r.dueMonth - 1, dueDayVal);
          if (yearlyDate.getTime() < todayDateOnly.getTime() - 1000 * 60 * 60 * 24 * 30) {
            // overdue by over a month, point to next year
            billYear = currentYear + 1;
            yearlyDate = new Date(billYear, r.dueMonth - 1, dueDayVal);
          }
          const diffDays = Math.round((yearlyDate.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));
          const leadDays = r.reminderDaysBefore ?? preferences.leadDaysBills;
          if (diffDays <= Math.max(leadDays, 14)) {
            const dateStr = `${billYear}-${r.dueMonth.toString().padStart(2, "0")}-${dueDayVal.toString().padStart(2, "0")}`;
            const notifId = `bill-yearly-${r.id}-${dateStr}`;
            if (!isDismissed(notifId)) {
              const { isSnoozed, until } = getSnoozeStatus(notifId);
              const cat = categoryMap.get(r.categoryId);
              items.push({
                id: notifId,
                type: "bill",
                title: `${r.title} (Annual)`,
                description: diffDays < 0 ? `Annual renewal overdue by ${Math.abs(diffDays)} days` : diffDays === 0 ? "Annual renewal due today" : `Annual renewal in ${diffDays} days`,
                amount: r.amount,
                dateStr,
                severity: diffDays <= 1 ? "urgent" : diffDays <= 5 ? "high" : "warning",
                bucket: getBucket(diffDays),
                daysRemaining: diffDays,
                categoryIcon: cat?.icon || "📅",
                categoryName: cat?.name || "Annual Bills",
                originalId: r.id,
                actionType: "pay_bill",
                isRead: readIds.has(notifId),
                isSnoozed,
                snoozedUntil: until,
                createdAt: r.createdAt || new Date().toISOString(),
              });
            }
          }
        }
      });
  }

  // 2. PLANNED EXPENSES
  if (preferences.channelPlanned) {
    plannedExpenses
      .filter((p) => !p.isPaid && p.targetDate)
      .forEach((p) => {
        const parts = p.targetDate.split("-").map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return;
        const planDate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(planDate.getTime())) return;

        const diffTime = planDate.getTime() - todayDateOnly.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const allowedLeadDays = p.reminderDaysBefore !== undefined && p.reminderDaysBefore !== null
          ? (p.reminderDaysBefore === -1 ? 0 : p.reminderDaysBefore)
          : preferences.leadDaysPlanned;

        if (p.reminderDaysBefore === -1 && diffDays > 0) return;

        if (diffDays <= allowedLeadDays || diffDays < 0) {
          const notifId = `plan-${p.id}`;
          if (isDismissed(notifId)) return;

          const { isSnoozed, until } = getSnoozeStatus(notifId);
          const cat = categoryMap.get(p.categoryId);

          let severity: NotificationSeverity = "info";
          if (diffDays < 0) severity = "urgent";
          else if (diffDays === 0) severity = "urgent";
          else if (diffDays <= 2) severity = "high";
          else if (diffDays <= 5) severity = "warning";

          const description = diffDays < 0
            ? `Target date elapsed (${p.targetDate})`
            : diffDays === 0
            ? "Scheduled for execution today"
            : diffDays === 1
            ? "Scheduled for tomorrow"
            : `Scheduled in ${diffDays} days (${p.targetDate})`;

          items.push({
            id: notifId,
            type: "planned",
            title: p.title,
            description,
            detailedMessage: p.notes || undefined,
            amount: p.amount,
            dateStr: p.targetDate,
            severity,
            bucket: getBucket(diffDays),
            daysRemaining: diffDays,
            categoryIcon: cat?.icon || "🎯",
            categoryName: cat?.name || "Planned Expense",
            originalId: p.id,
            actionType: "pay_plan",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: p.createdAt || new Date().toISOString(),
          });
        }
      });
  }

  // 3. CATEGORY BUDGETS & OVERALL BUDGET ALERTS
  if (preferences.channelBudgets) {
    categoryBudgets.forEach((budget) => {
      const progress = calculateCategoryBudgetProgress(budget, transactions, settings.weekStartsOn);
      const cat = categoryMap.get(budget.categoryId);
      const catName = cat?.name || "Category";

      if (progress.percentage >= 100) {
        const notifId = `budget-exceeded-${budget.id}-${currentMonthKey}`;
        if (!isDismissed(notifId)) {
          const { isSnoozed, until } = getSnoozeStatus(notifId);
          const overAmount = Math.max(0, progress.spent - budget.amount);
          items.push({
            id: notifId,
            type: "budget",
            title: `${catName} Budget Exceeded`,
            description: `Over by ${formatMoney(overAmount, settings.currency, settings.numberFormat)} (${Math.round(progress.percentage)}% spent of ${formatMoney(budget.amount, settings.currency, settings.numberFormat)})`,
            amount: overAmount,
            severity: progress.percentage >= 120 ? "urgent" : "high",
            bucket: "today",
            daysRemaining: 0,
            categoryIcon: "🚨",
            categoryName: catName,
            originalId: budget.id,
            actionType: "view_budget",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (progress.percentage >= (preferences.budgetThresholdPercent || 80)) {
        const notifId = `budget-warning-${budget.id}-${currentMonthKey}`;
        if (!isDismissed(notifId)) {
          const { isSnoozed, until } = getSnoozeStatus(notifId);
          items.push({
            id: notifId,
            type: "budget",
            title: `${catName} at ${Math.round(progress.percentage)}%`,
            description: `${formatMoney(progress.remaining, settings.currency, settings.numberFormat)} remaining in ${budget.duration} limit`,
            amount: progress.remaining,
            severity: "warning",
            bucket: "this_week",
            daysRemaining: 3,
            categoryIcon: "⚠️",
            categoryName: catName,
            originalId: budget.id,
            actionType: "view_budget",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // Overall Monthly Budget Check
    if (settings.overallMonthlyBudget && settings.overallMonthlyBudget > 0) {
      const monthExpenses = transactions
        .filter((t) => t.type === "expense" && t.date.startsWith(currentMonthKey))
        .reduce((sum, t) => sum + t.amount, 0);

      const overallPercent = (monthExpenses / settings.overallMonthlyBudget) * 100;
      if (overallPercent >= 100) {
        const notifId = `overall-budget-exceeded-${currentMonthKey}`;
        if (!isDismissed(notifId)) {
          const { isSnoozed, until } = getSnoozeStatus(notifId);
          items.push({
            id: notifId,
            type: "budget",
            title: "Total Monthly Budget Exceeded",
            description: `Total expenses reached ${formatMoney(monthExpenses, settings.currency, settings.numberFormat)} (${Math.round(overallPercent)}% of total target)`,
            amount: monthExpenses - settings.overallMonthlyBudget,
            severity: "urgent",
            bucket: "today",
            daysRemaining: 0,
            categoryIcon: "🔥",
            categoryName: "Overall Budget",
            actionType: "view_budget",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (overallPercent >= 85) {
        const notifId = `overall-budget-warning-${currentMonthKey}`;
        if (!isDismissed(notifId)) {
          const { isSnoozed, until } = getSnoozeStatus(notifId);
          items.push({
            id: notifId,
            type: "budget",
            title: `Monthly Spending at ${Math.round(overallPercent)}%`,
            description: `${formatMoney(settings.overallMonthlyBudget - monthExpenses, settings.currency, settings.numberFormat)} remaining for the month`,
            amount: settings.overallMonthlyBudget - monthExpenses,
            severity: "warning",
            bucket: "this_week",
            daysRemaining: 4,
            categoryIcon: "📊",
            categoryName: "Overall Budget",
            actionType: "view_budget",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 4. LOANS & BORROW/LEND DEBTS
  if (preferences.channelLoans) {
    loans
      .filter((l) => l.dueDate)
      .forEach((l) => {
        const repaid = (l.repayments || []).reduce((acc, r) => acc + r.amount, 0);
        const remaining = l.amount - repaid;
        if (remaining <= 0) return;

        const dueDateObj = new Date(`${l.dueDate}T00:00:00`);
        if (isNaN(dueDateObj.getTime())) return;

        const diffTime = dueDateObj.getTime() - todayDateOnly.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= preferences.leadDaysLoans) {
          const notifId = `loan-${l.id}`;
          if (isDismissed(notifId)) return;

          const { isSnoozed, until } = getSnoozeStatus(notifId);
          const isLent = l.direction === "lent";

          let severity: NotificationSeverity = "info";
          if (diffDays < 0) severity = "urgent";
          else if (diffDays === 0) severity = "urgent";
          else if (diffDays <= 3) severity = "high";
          else severity = "warning";

          const title = isLent
            ? `Collect debt: ${l.description || "Loan"}`
            : `Repay loan: ${l.description || "Debt"}`;

          const description = diffDays < 0
            ? `Due date passed by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} (${l.dueDate})`
            : diffDays === 0
            ? "Settlement due today"
            : diffDays === 1
            ? "Settlement due tomorrow"
            : `Due in ${diffDays} days (${l.dueDate})`;

          items.push({
            id: notifId,
            type: "loan",
            title,
            description,
            detailedMessage: l.description || undefined,
            amount: remaining,
            dateStr: l.dueDate,
            severity,
            bucket: getBucket(diffDays),
            daysRemaining: diffDays,
            categoryIcon: isLent ? "💸" : "🤝",
            categoryName: isLent ? "Money Lent" : "Money Borrowed",
            originalId: l.id,
            actionType: "view_loan",
            isRead: readIds.has(notifId),
            isSnoozed,
            snoozedUntil: until,
            createdAt: l.createdAt || new Date().toISOString(),
          });
        }
      });
  }

  // 5. CUSTOM FINANCIAL REMINDERS
  if (preferences.channelReminders) {
    customReminders
      .filter((cr) => !cr.isCompleted)
      .forEach((cr) => {
        const parts = cr.dueDate.split("-").map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return;
        const reminderDate = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(reminderDate.getTime())) return;

        const diffTime = reminderDate.getTime() - todayDateOnly.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const notifId = `custom-remind-${cr.id}`;
        if (isDismissed(notifId)) return;

        const { isSnoozed, until } = getSnoozeStatus(notifId);

        let severity: NotificationSeverity = "info";
        if (cr.priority === "urgent" || diffDays < 0) severity = "urgent";
        else if (cr.priority === "high" || diffDays === 0) severity = "high";
        else if (diffDays <= 2) severity = "warning";

        const description = diffDays < 0
          ? `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`
          : diffDays === 0
          ? (cr.dueTime ? `Due today at ${cr.dueTime}` : "Due today")
          : diffDays === 1
          ? "Due tomorrow"
          : `Due in ${diffDays} days (${cr.dueDate})`;

        items.push({
          id: notifId,
          type: "reminder",
          title: cr.title,
          description,
          detailedMessage: cr.notes,
          dateStr: cr.dueDate,
          timeStr: cr.dueTime,
          severity,
          bucket: getBucket(diffDays),
          daysRemaining: diffDays,
          categoryIcon: cr.categoryIcon || "📌",
          categoryName: "Custom Reminder",
          originalId: cr.id,
          actionType: "complete_reminder",
          isRead: readIds.has(notifId),
          isSnoozed,
          snoozedUntil: until,
          createdAt: cr.createdAt,
        });
      });
  }

  // 6. SYSTEM / WEBHOOK INBOX ALERTS
  if (preferences.channelSystem && inboxItemsCount > 0) {
    const notifId = `system-inbox-pending`;
    if (!isDismissed(notifId)) {
      const { isSnoozed, until } = getSnoozeStatus(notifId);
      items.push({
        id: notifId,
        type: "system",
        title: `${inboxItemsCount} Pending Webhook Payment${inboxItemsCount > 1 ? "s" : ""}`,
        description: "MacroDroid bank alerts captured and ready for 1-click confirmation into transactions.",
        severity: "high",
        bucket: "today",
        daysRemaining: 0,
        categoryIcon: "📥",
        categoryName: "Mobile Webhook",
        actionType: "open_inbox",
        isRead: readIds.has(notifId),
        isSnoozed,
        snoozedUntil: until,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Sort by priority and chronological order
  const severityScore: Record<NotificationSeverity, number> = {
    urgent: 0,
    high: 1,
    warning: 2,
    info: 3,
  };

  const sorted = items.sort((a, b) => {
    // 1. Snoozed items pushed to end of active lists
    if (a.isSnoozed !== b.isSnoozed) return a.isSnoozed ? 1 : -1;
    // 2. Severity
    if (severityScore[a.severity] !== severityScore[b.severity]) {
      return severityScore[a.severity] - severityScore[b.severity];
    }
    // 3. Days remaining
    const daysA = a.daysRemaining ?? 999;
    const daysB = b.daysRemaining ?? 999;
    return daysA - daysB;
  });

  const activeList = sorted.filter((item) => !item.isSnoozed);
  const snoozedList = sorted.filter((item) => item.isSnoozed);

  const urgentCount = activeList.filter((item) => item.severity === "urgent" || item.severity === "high").length;
  const unreadCount = activeList.filter((item) => !item.isRead).length;

  return {
    activeList,
    snoozedList,
    urgentCount,
    unreadCount,
  };
}
