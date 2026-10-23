import { Category } from "@/types/category";
import { Settings, SpendState } from "@/types/settings";

export const APP_STORAGE_KEY = "spend_app_state";
export const CURRENT_STATE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  currency: "₹",
  theme: "dark",
  weekStartsOn: "monday",
  numberFormat: "comma",
  defaultPaymentMethod: "upi",
  budgetAlertThreshold: 80,
  defaultStartRoute: "/",
  billAlertDays: 7,
  confirmBeforeDelete: false,
  hideSensitiveBalances: false,
  hapticFeedback: true,
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "cat-food",
    name: "Food",
    icon: "🍔",
    color: "#F97316", // Orange
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-transport",
    name: "Transport",
    icon: "🚌",
    color: "#3B82F6", // Blue
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-shopping",
    name: "Shopping",
    icon: "🛍",
    color: "#EC4899", // Pink
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-bills",
    name: "Bills",
    icon: "🧾",
    color: "#EAB308", // Yellow
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-rent",
    name: "Rent",
    icon: "🏠",
    color: "#8B5CF6", // Purple
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-health",
    name: "Health",
    icon: "💊",
    color: "#EF4444", // Red
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-entertainment",
    name: "Entertainment",
    icon: "🎬",
    color: "#06B6D4", // Cyan
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-other-expense",
    name: "Other",
    icon: "📦",
    color: "#71717A", // Zinc
    type: "expense",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-salary",
    name: "Salary",
    icon: "💰",
    color: "#10B981", // Emerald
    type: "income",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-freelance",
    name: "Freelance",
    icon: "💼",
    color: "#14B8A6", // Teal
    type: "income",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-other-income",
    name: "Other Income",
    icon: "✨",
    color: "#84CC16", // Lime
    type: "income",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-transfer",
    name: "Transfer",
    icon: "🔄",
    color: "#0EA5E9", // Sky
    type: "both",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_CATEGORY_BUDGETS: import("@/types/plan").CategoryBudget[] = [
  {
    id: "budget-food",
    categoryId: "cat-food",
    amount: 1200000, // ₹12,000 / month
    duration: "monthly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "budget-transport",
    categoryId: "cat-transport",
    amount: 300000, // ₹3,000 / month
    duration: "monthly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "budget-shopping",
    categoryId: "cat-shopping",
    amount: 600000, // ₹6,000 / month
    duration: "monthly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "budget-entertainment",
    categoryId: "cat-entertainment",
    amount: 150000, // ₹1,500 / week
    duration: "weekly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_RECURRING: import("@/types/plan").RecurringExpense[] = [
  {
    id: "rec-1",
    title: "Apartment Rent",
    amount: 1800000, // ₹18,000
    frequency: "monthly",
    dueDay: 1,
    categoryId: "cat-rent",
    notes: "Transfer by 1st of month",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rec-2",
    title: "Broadband Fiber Internet",
    amount: 119900, // ₹1,199
    frequency: "monthly",
    dueDay: 7,
    categoryId: "cat-bills",
    notes: "Auto-pay debit",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rec-3",
    title: "Gym Membership",
    amount: 250000, // ₹2,500
    frequency: "monthly",
    dueDay: 15,
    categoryId: "cat-health",
    notes: "Monthly pass",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "rec-4",
    title: "Cloud Storage & Music",
    amount: 34900, // ₹349
    frequency: "monthly",
    dueDay: 22,
    categoryId: "cat-entertainment",
    notes: "Family plan",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const DEFAULT_PLANNED_EXPENSES: import("@/types/plan").PlannedExpense[] = [
  {
    id: "plan-1",
    title: "Quarterly Vehicle Service & Maintenance",
    amount: 450000, // ₹4,500
    targetDate: "2026-10-18",
    categoryId: "cat-transport",
    reminderDaysBefore: 3,
    notes: "Full synthetic oil & brake inspection",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "plan-2",
    title: "Annual Term Insurance Premium",
    amount: 1450000, // ₹14,500
    targetDate: "2026-10-28",
    categoryId: "cat-bills",
    reminderDaysBefore: 7,
    notes: "Policy renewal auto-reminder",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

export const INITIAL_STATE: SpendState = {
  version: CURRENT_STATE_VERSION,
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  people: [],
  loans: [],
  categoryBudgets: [],
  recurringExpenses: [],
  plannedExpenses: [],
  settings: DEFAULT_SETTINGS,
};

export const SUPPORTED_CURRENCIES = [
  { symbol: "₹", name: "INR (₹)" },
  { symbol: "$", name: "USD ($)" },
  { symbol: "€", name: "EUR (€)" },
  { symbol: "£", name: "GBP (£)" },
  { symbol: "¥", name: "JPY (¥)" },
  { symbol: "₩", name: "KRW (₩)" },
  { symbol: "R$", name: "BRL (R$)" },
  { symbol: "CHF", name: "CHF" },
  { symbol: "kr", name: "SEK/NOK (kr)" },
  { symbol: "zł", name: "PLN (zł)" },
  { symbol: "Custom", name: "Custom" },
];
