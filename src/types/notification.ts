export type NotificationType = 
  | "bill" 
  | "planned" 
  | "budget" 
  | "loan" 
  | "reminder" 
  | "insight" 
  | "system";

export type NotificationSeverity = "urgent" | "high" | "warning" | "info";

export type NotificationStatus = "active" | "read" | "snoozed" | "dismissed" | "resolved";

export type ChronologicalBucket = "overdue" | "today" | "tomorrow" | "this_week" | "upcoming";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  detailedMessage?: string;
  amount?: number; // minor units (e.g. ₹1,200 -> 120000)
  dateStr?: string; // YYYY-MM-DD
  timeStr?: string;
  severity: NotificationSeverity;
  bucket: ChronologicalBucket;
  daysRemaining?: number; // negative if overdue, 0 if today, positive if future
  categoryIcon: string;
  categoryName?: string;
  originalId?: string; // id of recurring bill, planned expense, loan, budget, reminder
  actionType?: "pay_bill" | "pay_plan" | "view_budget" | "view_loan" | "complete_reminder" | "open_inbox" | "custom";
  isRead: boolean;
  isSnoozed: boolean;
  snoozedUntil?: string; // ISO string
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface CustomReminder {
  id: string;
  title: string;
  notes?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: "urgent" | "high" | "normal" | "low";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  categoryIcon?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  enableBrowserPush: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string; // e.g. "08:00"
  leadDaysBills: number; // e.g. 5 days before
  leadDaysPlanned: number; // e.g. 3 days before
  leadDaysLoans: number; // e.g. 7 days before
  budgetThresholdPercent: number; // e.g. 80%
  channelBills: boolean;
  channelPlanned: boolean;
  channelBudgets: boolean;
  channelLoans: boolean;
  channelReminders: boolean;
  channelSystem: boolean;
  groupingMode: "chronological" | "type";
}

export interface ResolvedNotificationEvent {
  id: string;
  notificationId: string;
  title: string;
  type: NotificationType;
  action: "paid" | "completed" | "snoozed" | "dismissed";
  timestamp: string;
  amount?: number;
}
