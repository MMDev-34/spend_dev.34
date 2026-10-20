export type ThemeMode = "dark" | "light" | "system";
export type WeekStartDay = "monday" | "sunday";
export type NumberFormatType = "comma" | "dot" | "space";
export type DefaultPaymentMethod = "upi" | "cash" | "card" | "bank" | "other";
export type BackupReminderFrequency = "off" | "weekly" | "monthly";

export interface Settings {
  currency: string;
  theme: ThemeMode;
  weekStartsOn: WeekStartDay;
  numberFormat: NumberFormatType;
  overallMonthlyBudget?: number; // Integer minor units (e.g. ₹50,000 -> 5000000)

  // Privacy & Security Preferences
  hideSensitiveBalances?: boolean;
  confirmBeforeDelete?: boolean;

  // Formatting & Display Preferences
  showDecimals?: boolean;

  // Transaction & Budget Defaults
  defaultPaymentMethod?: DefaultPaymentMethod;
  budgetAlertThreshold?: number; // e.g., 80 for 80%, 90 for 90%, 100 for 100%
  defaultStartRoute?: string; // e.g., "/", "/transactions", "/plans", "/borrow-lend"
  billAlertDays?: number; // Days before due date to alert (e.g. 3, 7, 14)
  hapticFeedback?: boolean; // Mobile vibration feedback on tap
  enableUnwantedSpendTracking?: boolean;
  autoBackupReminder?: BackupReminderFrequency;
}

export interface SpendState {
  version: number;
  transactions: import("./transaction").Transaction[];
  categories: import("./category").Category[];
  people: import("./person").Person[];
  loans: import("./loan").Loan[];
  categoryBudgets?: import("./plan").CategoryBudget[];
  recurringExpenses?: import("./plan").RecurringExpense[];
  plannedExpenses?: import("./plan").PlannedExpense[];
  settings: Settings;
}
