import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Loan } from "@/types/loan";
import { getCurrentWeekDays, getToday } from "./dates";
import { WeekStartDay } from "@/types/settings";

/**
 * Calculates total spending (minor units) for a given month (YYYY-MM)
 */
export function calculateMonthlySpending(transactions: Transaction[] = [], monthKey: string = ""): number {
  if (!Array.isArray(transactions) || !monthKey) return 0;
  return transactions
    .filter((t) => t && t.type === "expense" && typeof t.date === "string" && t.date.startsWith(monthKey))
    .reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);
}

/**
 * Calculates total income (minor units) for a given month (YYYY-MM)
 */
export function calculateMonthlyIncome(transactions: Transaction[] = [], monthKey: string = ""): number {
  if (!Array.isArray(transactions) || !monthKey) return 0;
  return transactions
    .filter((t) => t && t.type === "income" && typeof t.date === "string" && t.date.startsWith(monthKey))
    .reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);
}

/**
 * Calculates spending for today (minor units)
 */
export function calculateTodaySpending(transactions: Transaction[] = [], todayStr: string = getToday()): number {
  if (!Array.isArray(transactions)) return 0;
  return transactions
    .filter((t) => t && t.type === "expense" && t.date === todayStr)
    .reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);
}

/**
 * Calculates weekly daily totals for the current week Monday-Sunday
 */
export interface DayWeeklyTotal {
  date: string;
  dayLabel: string; // M, T, W
  dayShort: string; // Mon, Tue, Wed
  dayFull: string;  // Monday, Tuesday
  total: number;
  unwantedTotal: number;
  unwantedPercent: number;
  count: number;
  isToday: boolean;
  transactions: Transaction[];
}

export function calculateWeeklyTotals(
  transactions: Transaction[] = [],
  weekStartsOn: WeekStartDay = "monday",
  referenceDate: string = getToday()
): DayWeeklyTotal[] {
  const weekDays = getCurrentWeekDays(referenceDate, weekStartsOn);
  const today = getToday();
  const txList = Array.isArray(transactions) ? transactions : [];

  return weekDays.map((date) => {
    const dayTransactions = txList.filter((t) => t && t.type === "expense" && t.date === date);
    const total = dayTransactions.reduce((acc, t) => acc + (Number.isFinite(t.amount) ? t.amount : 0), 0);
    const unwantedTotal = dayTransactions
      .filter((t) => t.isUnwanted)
      .reduce((acc, t) => acc + (Number.isFinite(t.amount) ? t.amount : 0), 0);
    const unwantedPercent = total > 0 ? Math.round((unwantedTotal / total) * 100) : 0;

    const [y, m, d] = date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("en-US", { weekday: "narrow" }) : "";
    const dayShort = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("en-US", { weekday: "short" }) : "";
    const dayFull = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("en-US", { weekday: "long" }) : "";

    return {
      date,
      dayLabel,
      dayShort,
      dayFull,
      total,
      unwantedTotal,
      unwantedPercent,
      count: dayTransactions.length,
      isToday: date === today,
      transactions: dayTransactions,
    };
  });
}

/**
 * Calculates weekly daily totals shifted by week offset (0 = current week, -12 = 3 months ago)
 */
export function calculateWeeklyTotalsForOffset(
  transactions: Transaction[] = [],
  weekOffset: number = 0,
  weekStartsOn: WeekStartDay = "monday",
  referenceDate: string = getToday()
): DayWeeklyTotal[] {
  const parts = (referenceDate || getToday()).split("-").map(Number);
  const [y, m, d] = parts.length === 3 && !parts.some(isNaN) ? parts : getToday().split("-").map(Number);
  const dObj = new Date(y, m - 1, d + weekOffset * 7);
  const yr = dObj.getFullYear();
  const mo = String(dObj.getMonth() + 1).padStart(2, "0");
  const dy = String(dObj.getDate()).padStart(2, "0");
  const shiftedDate = `${yr}-${mo}-${dy}`;
  return calculateWeeklyTotals(transactions, weekStartsOn, shiftedDate);
}

/**
 * Calculates category spending totals for a given month or range
 */
export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
  count: number;
}

export function calculateCategoryTotals(
  transactions: Transaction[] = [],
  categories: Category[] = [],
  filterFn?: (t: Transaction) => boolean
): CategoryTotal[] {
  const txList = Array.isArray(transactions) ? transactions : [];
  const catList = Array.isArray(categories) ? categories : [];

  const expenseTransactions = txList.filter(
    (t) => t && t.type === "expense" && (filterFn ? filterFn(t) : true)
  );

  const grandTotal = expenseTransactions.reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);
  const categoryMap = new Map<string, Category>(catList.filter(Boolean).map((c) => [c.id, c]));

  const grouped = new Map<string, { total: number; count: number }>();
  for (const t of expenseTransactions) {
    const existing = grouped.get(t.categoryId) || { total: 0, count: 0 };
    grouped.set(t.categoryId, {
      total: existing.total + (Number.isFinite(t.amount) ? t.amount : 0),
      count: existing.count + 1,
    });
  }

  const results: CategoryTotal[] = [];
  grouped.forEach((data, categoryId) => {
    const cat = categoryMap.get(categoryId) || {
      id: categoryId,
      name: "Other",
      icon: "📦",
      color: "#71717A",
      type: "expense" as const,
      isDefault: false,
      createdAt: "",
    };

    results.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      total: data.total,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      count: data.count,
    });
  });

  // Sort descending by total amount
  return results.sort((a, b) => b.total - a.total);
}

/**
 * Calculates average daily spend for a list of transactions across distinct active days
 */
export function calculateAverageDailySpend(transactions: Transaction[] = [], daysInPeriod: number = 1): number {
  if (!Array.isArray(transactions) || daysInPeriod <= 0) return 0;
  const total = transactions
    .filter((t) => t && t.type === "expense")
    .reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);
  return Math.round(total / daysInPeriod);
}

/**
 * Finds the largest expense transaction in a set
 */
export function calculateLargestExpense(transactions: Transaction[] = []): Transaction | null {
  if (!Array.isArray(transactions)) return null;
  const expenses = transactions.filter((t) => t && t.type === "expense");
  if (expenses.length === 0) return null;
  return expenses.reduce((max, t) => (t.amount > max.amount ? t : max), expenses[0]);
}

/**
 * Calculates savings: income - expense (can be negative if spent more than earned)
 */
export function calculateSavings(income: number = 0, expense: number = 0): number {
  const safeIncome = Number.isFinite(income) ? income : 0;
  const safeExpense = Number.isFinite(expense) ? expense : 0;
  return safeIncome - safeExpense;
}

/**
 * Calculates savings rate percentage: ((income - expense) / income) * 100
 */
export function calculateSavingsRate(income: number = 0, expense: number = 0): number | null {
  if (!Number.isFinite(income) || income <= 0) return null;
  const safeExpense = Number.isFinite(expense) ? expense : 0;
  const rate = ((income - safeExpense) / income) * 100;
  return Math.round(rate * 10) / 10;
}

/**
 * Calculates the number of days with zero spending within a date range
 */
export function calculateNoSpendDays(allDatesInPeriod: string[] = [], transactions: Transaction[] = []): number {
  if (!Array.isArray(allDatesInPeriod)) return 0;
  const txList = Array.isArray(transactions) ? transactions : [];
  const spendingDates = new Set(
    txList.filter((t) => t && t.type === "expense" && typeof t.date === "string").map((t) => t.date)
  );

  return allDatesInPeriod.filter((d) => !spendingDates.has(d)).length;
}

/**
 * Calculates the remaining balance of a single loan: original amount - repayments
 */
export function calculateLoanBalance(loan: Loan): number {
  if (!loan || !Number.isFinite(loan.amount)) return 0;
  const repayments = Array.isArray(loan.repayments) ? loan.repayments : [];
  const totalRepaid = repayments.reduce((acc, r) => acc + (r && Number.isFinite(r.amount) ? r.amount : 0), 0);
  return Math.max(0, loan.amount - totalRepaid);
}

/**
 * Returns net loan balance and summaries:
 * Loan != Expense (Rule: Loans are completely separate)
 */
export function calculateLoanSummaries(loans: Loan[] = []) {
  let owedToUser = 0; // User lent money and hasn't been repaid yet
  let userOwes = 0;   // User borrowed money and hasn't repaid yet
  const loanList = Array.isArray(loans) ? loans : [];

  for (const loan of loanList) {
    if (!loan) continue;
    const remaining = calculateLoanBalance(loan);
    if (loan.direction === "lent") {
      owedToUser += remaining;
    } else {
      userOwes += remaining;
    }
  }

  return {
    owedToUser,
    userOwes,
    netBalance: owedToUser - userOwes,
  };
}

/**
 * Calculates spending progress for a category budget based on its duration (weekly, monthly, yearly)
 */
export interface CategoryBudgetProgress {
  budget: import("@/types/plan").CategoryBudget;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  periodLabel: string;
}

export function calculateCategoryBudgetProgress(
  budget: import("@/types/plan").CategoryBudget,
  transactions: Transaction[] = [],
  weekStartsOn: WeekStartDay = "monday",
  referenceDate: string = getToday()
): CategoryBudgetProgress {
  if (!budget) {
    return {
      budget: {} as any,
      spent: 0,
      remaining: 0,
      percentage: 0,
      isOverBudget: false,
      periodLabel: "This Month",
    };
  }

  const txList = Array.isArray(transactions) ? transactions : [];
  let periodTransactions: Transaction[] = [];
  let periodLabel = "This Month";

  if (budget.duration === "weekly") {
    const weekDays = new Set(getCurrentWeekDays(referenceDate, weekStartsOn));
    periodTransactions = txList.filter((t) => t && t.type === "expense" && weekDays.has(t.date));
    periodLabel = "This Week";
  } else if (budget.duration === "yearly") {
    const yearKey = (referenceDate || getToday()).slice(0, 4);
    periodTransactions = txList.filter((t) => t && t.type === "expense" && typeof t.date === "string" && t.date.startsWith(yearKey));
    periodLabel = `Year ${yearKey}`;
  } else {
    // Monthly
    const monthKey = (referenceDate || getToday()).slice(0, 7);
    periodTransactions = txList.filter((t) => t && t.type === "expense" && typeof t.date === "string" && t.date.startsWith(monthKey));
    periodLabel = "This Month";
  }

  const categorySpent = periodTransactions
    .filter((t) => t && t.categoryId === budget.categoryId)
    .reduce((sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0), 0);

  const budgetAmount = Number.isFinite(budget.amount) ? budget.amount : 0;
  const remaining = budgetAmount - categorySpent;
  const percentage = budgetAmount > 0 ? (categorySpent / budgetAmount) * 100 : 0;

  return {
    budget,
    spent: categorySpent,
    remaining,
    percentage: Math.round(percentage * 10) / 10,
    isOverBudget: categorySpent > budgetAmount,
    periodLabel,
  };
}
