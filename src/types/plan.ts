export type BudgetDuration = "weekly" | "monthly" | "yearly";

export interface CategoryBudget {
  id: string;
  categoryId: string;
  amount: number; // minor units (e.g. ₹5,000 -> 500000)
  duration: BudgetDuration;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "monthly" | "weekly" | "biweekly" | "yearly";

export interface RecurringExpense {
  id: string;
  title: string;           // e.g. "High-speed Internet", "Apartment Rent", "Gym Membership"
  amount: number;          // minor units
  frequency: RecurringFrequency;
  dueDay: number;          // 1 - 31 (day of month for monthly/yearly)
  dueMonth?: number;       // 1 - 12 (for yearly expenses, 1-indexed)
  dueWeekday?: number;     // 0 - 6 (0 = Sun, 1 = Mon, etc. for weekly/biweekly)
  categoryId: string;
  startDate?: string;      // YYYY-MM-DD
  endDate?: string;        // YYYY-MM-DD
  notes?: string;
  reminderDaysBefore?: number; // 0 (on day), 1 (1 day before), 3 (3 days before), 7 (1 week before)
  autoRemind?: boolean;
  isPaused?: boolean;
  paidDates?: string[];    // Array of YYYY-MM or YYYY-MM-DD strings where this bill was marked paid
  createdAt: string;
  updatedAt?: string;
}

export interface PlannedExpense {
  id: string;
  title: string;           // e.g. "Flight tickets to Mumbai", "Car major service", "Laptop upgrade"
  amount: number;          // minor units
  targetDate: string;      // YYYY-MM-DD
  categoryId: string;
  isPaid?: boolean;        // whether marked as converted/paid
  paidDate?: string;       // YYYY-MM-DD date when actually paid (e.g. current date when paid early)
  paidTransactionId?: string;
  reminderDaysBefore?: number; // 0, 1, 3, 7
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

