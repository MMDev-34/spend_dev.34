import { WeekStartDay } from "@/types/settings";

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns current month formatted as YYYY-MM
 */
export function getCurrentMonthKey(): string {
  return getToday().slice(0, 7);
}

/**
 * Formats YYYY-MM into human friendly string (e.g. "September 2026")
 */
export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || typeof monthKey !== "string" || !monthKey.includes("-")) {
    return "All Time";
  }
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return monthKey;
  }
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Computes previous month in YYYY-MM format
 */
export function getPreviousMonth(monthKey: string): string {
  if (!monthKey || typeof monthKey !== "string" || !monthKey.includes("-")) {
    return getCurrentMonthKey();
  }
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // 0-indexed
  if (isNaN(year) || isNaN(month)) return getCurrentMonthKey();
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return `${year}-${month.toString().padStart(2, "0")}`;
}

/**
 * Computes next month in YYYY-MM format
 */
export function getNextMonth(monthKey: string): string {
  if (!monthKey || typeof monthKey !== "string" || !monthKey.includes("-")) {
    return getCurrentMonthKey();
  }
  const [yearStr, monthStr] = monthKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + 1; // 1-indexed
  if (isNaN(year) || isNaN(month)) return getCurrentMonthKey();
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${month.toString().padStart(2, "0")}`;
}

/**
 * Formats a YYYY-MM-DD date relative to today (e.g. "Today", "Yesterday", "24 Sep")
 */
export function formatRelativeDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const today = getToday();
  if (dateStr === today) return "Today";

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${(yesterdayDate.getMonth() + 1).toString().padStart(2, "0")}-${yesterdayDate.getDate().toString().padStart(2, "0")}`;
  if (dateStr === yesterdayStr) return "Yesterday";

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${(tomorrowDate.getMonth() + 1).toString().padStart(2, "0")}-${tomorrowDate.getDate().toString().padStart(2, "0")}`;
  if (dateStr === tomorrowStr) return "Tomorrow";

  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;

  const currentYear = new Date().getFullYear();
  if (y === currentYear) {
    return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  }
  return dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Formats a date specifically for picker buttons (e.g. "Today, 20 Oct", "Yesterday, 19 Oct", "20 Oct 2026")
 */
export function formatDateButtonLabel(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "Select Date";
  const today = getToday();
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;

  const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" });
  const shortDate = `${d} ${monthShort}`;
  if (dateStr === today) return `Today, ${shortDate}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;
  if (dateStr === yesterdayStr) return `Yesterday, ${shortDate}`;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}-${tomorrow.getDate().toString().padStart(2, "0")}`;
  if (dateStr === tomorrowStr) return `Tomorrow, ${shortDate}`;

  const currentYear = new Date().getFullYear();
  if (y === currentYear) return shortDate;
  return `${d} ${monthShort} ${y}`;
}

/**
 * Returns strictly day and month (e.g. "20 Oct")
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;
  const monthShort = dateObj.toLocaleDateString("en-US", { month: "short" });
  return `${d} ${monthShort}`;
}

/**
 * Returns days of the current week (Monday-Sunday or Sunday-Saturday)
 */
export function getCurrentWeekDays(referenceDate: string = getToday(), weekStartsOn: WeekStartDay = "monday"): string[] {
  const parts = (referenceDate || getToday()).split("-").map(Number);
  const safeParts = parts.length === 3 && !parts.some(isNaN) ? parts : getToday().split("-").map(Number);
  const [y, m, d] = safeParts;
  const current = new Date(y, m - 1, d);
  const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday

  let diffToStart = 0;
  if (weekStartsOn === "monday") {
    // If Sunday (0), Monday was 6 days ago. If Monday (1), 0 days ago.
    diffToStart = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  } else {
    // Sunday starts week: diff is -dayOfWeek
    diffToStart = -dayOfWeek;
  }

  const startDate = new Date(current);
  startDate.setDate(current.getDate() + diffToStart);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + i);
    const yr = nextDate.getFullYear();
    const mo = (nextDate.getMonth() + 1).toString().padStart(2, "0");
    const dy = nextDate.getDate().toString().padStart(2, "0");
    days.push(`${yr}-${mo}-${dy}`);
  }

  return days;
}

/**
 * Returns short day name for a YYYY-MM-DD (e.g. "Mon", "Tue")
 */
export function getShortDayName(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return "";
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return "";
  return dateObj.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Computes the exact next upcoming due date for any recurring expense
 */
export function getUpcomingDueDate(
  expense: import("@/types/plan").RecurringExpense,
  referenceDate: string = getToday()
): { dateStr: string; label: string; daysLeft: number; isDueToday: boolean; isPastDue: boolean } {
  const [refY, refM, refD] = referenceDate.split("-").map(Number);
  const refDateObj = new Date(refY, refM - 1, refD);
  refDateObj.setHours(0, 0, 0, 0);

  let targetDate = new Date(refDateObj);

  if (expense.frequency === "monthly") {
    // Current month due date
    const daysInCurrentMonth = new Date(refY, refM, 0).getDate();
    const actualDueDay = Math.min(expense.dueDay, daysInCurrentMonth);
    const thisMonthDue = new Date(refY, refM - 1, actualDueDay);

    if (thisMonthDue >= refDateObj) {
      targetDate = thisMonthDue;
    } else {
      // Next month
      const nextMonthY = refM === 12 ? refY + 1 : refY;
      const nextMonthM = refM === 12 ? 1 : refM + 1;
      const daysInNextMonth = new Date(nextMonthY, nextMonthM, 0).getDate();
      const actualNextDueDay = Math.min(expense.dueDay, daysInNextMonth);
      targetDate = new Date(nextMonthY, nextMonthM - 1, actualNextDueDay);
    }
  } else if (expense.frequency === "yearly") {
    const dueMonth = expense.dueMonth || 1; // 1-12
    const thisYearDue = new Date(refY, dueMonth - 1, expense.dueDay);

    if (thisYearDue >= refDateObj) {
      targetDate = thisYearDue;
    } else {
      targetDate = new Date(refY + 1, dueMonth - 1, expense.dueDay);
    }
  } else if (expense.frequency === "weekly" || expense.frequency === "biweekly") {
    const targetWeekday = expense.dueWeekday ?? 1; // 0=Sun, 1=Mon...
    const currentWeekday = refDateObj.getDay();
    let diff = targetWeekday - currentWeekday;
    if (diff < 0) diff += 7;
    targetDate.setDate(refDateObj.getDate() + diff);
  }

  const y = targetDate.getFullYear();
  const m = (targetDate.getMonth() + 1).toString().padStart(2, "0");
  const d = targetDate.getDate().toString().padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  const diffMs = targetDate.getTime() - refDateObj.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isDueToday = daysLeft === 0;
  const isPastDue = daysLeft < 0;

  let label = "";
  if (isDueToday) {
    label = "Due Today";
  } else if (daysLeft === 1) {
    label = "Due Tomorrow";
  } else if (daysLeft > 1 && daysLeft <= 7) {
    label = `Due in ${daysLeft} days (${targetDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })})`;
  } else {
    label = `Due on ${targetDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`;
  }

  return {
    dateStr,
    label,
    daysLeft,
    isDueToday,
    isPastDue,
  };
}
