import React, { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney, formatKAmount } from "@/utils/currency";
import { getToday, formatMonthLabel, getPreviousMonth, getNextMonth } from "@/utils/dates";
import { Settings } from "@/types/settings";
import { RecurringExpense, PlannedExpense } from "@/types/plan";
import { Transaction } from "@/types/transaction";
import { AddPlannedExpenseModal } from "./AddPlannedExpenseModal";
import { AddRecurringModal } from "./AddRecurringModal";
import { DayInspectorModal } from "./DayInspectorModal";
import { RecurringBillsModal } from "./RecurringBillsModal";
import { RecurringBillDetailModal } from "./RecurringBillDetailModal";
import { TransactionDetailsModal } from "@/components/transaction/TransactionDetailsModal";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ListFilter,
  Repeat,
  Target,
  CalendarCheck,
  Check
} from "lucide-react";

interface FinancialCalendarProps {
  settings: Settings;
  onOpenAddRecurring?: () => void;
}

type DayFilterType = "all" | "spent" | "planned" | "recurring" | "loans";

export const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ settings }) => {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const loans = useAppStore((s) => s.loans);
  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const plannedExpenses = useAppStore((s) => s.plannedExpenses || []);
  const logRecurringAsTransaction = useAppStore((s) => s.logRecurringAsTransaction);
  const markPlannedExpenseAsPaid = useAppStore((s) => s.markPlannedExpenseAsPaid);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const restoreTransaction = useAppStore((s) => s.restoreTransaction);
  const duplicateTransaction = useAppStore((s) => s.duplicateTransaction);

  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);

  const todayStr = useMemo(() => getToday(), []);
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => todayStr.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Popup Day Inspector state
  const [isDayInspectorOpen, setIsDayInspectorOpen] = useState(false);
  const [dayFilter, setDayFilter] = useState<DayFilterType>("all");

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isRecurringListOpen, setIsRecurringListOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedExpense | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);

  // Transaction & Bill Detail Modal state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTxDetailOpen, setIsTxDetailOpen] = useState(false);
  const [selectedRecurringDetail, setSelectedRecurringDetail] = useState<RecurringExpense | null>(null);
  const [isRecurringDetailOpen, setIsRecurringDetailOpen] = useState(false);

  // Compute calendar days for currentMonthKey (YYYY-MM)
  const calendarData = useMemo(() => {
    const [yearStr, monthStr] = currentMonthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    let startDayOfWeek = firstDayOfMonth.getDay();
    if (settings.weekStartsOn === "monday") {
      startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    }

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Leading padding days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDay - i;
      const prevMonthNum = month === 0 ? 12 : month;
      const prevMonthStr = prevMonthNum.toString().padStart(2, "0");
      const prevYear = month === 0 ? year - 1 : year;
      days.push({
        dateStr: `${prevYear}-${prevMonthStr}-${prevDay.toString().padStart(2, "0")}`,
        dayNum: prevDay,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing padding days
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthNum = month + 2 > 12 ? 1 : month + 2;
      const nextMonthStr = nextMonthNum.toString().padStart(2, "0");
      const nextYear = month + 2 > 12 ? year + 1 : year;
      days.push({
        dateStr: `${nextYear}-${nextMonthStr}-${i.toString().padStart(2, "0")}`,
        dayNum: i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentMonthKey, todayStr, settings.weekStartsOn]);

  // Aggregate events by date for fast tile rendering
  const dayEventsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalSpent: number;
        transactionsCount: number;
        hasPlanned: boolean;
        hasRecurring: boolean;
        hasLoans: boolean;
      }
    >();

    // 1. Transactions
    for (const t of transactions) {
      if (!map.has(t.date)) {
        map.set(t.date, { totalSpent: 0, transactionsCount: 0, hasPlanned: false, hasRecurring: false, hasLoans: false });
      }
      const entry = map.get(t.date)!;
      entry.transactionsCount += 1;
      if (t.type === "expense") {
        entry.totalSpent += t.amount;
      }
    }

    // 2. Planned Future Expenses
    for (const plan of plannedExpenses) {
      if (!map.has(plan.targetDate)) {
        map.set(plan.targetDate, { totalSpent: 0, transactionsCount: 0, hasPlanned: true, hasRecurring: false, hasLoans: false });
      } else {
        map.get(plan.targetDate)!.hasPlanned = true;
      }
    }

    // 3. Recurring expenses
    const [yearStr, monthStr] = currentMonthKey.split("-");
    const currentMonth = parseInt(monthStr, 10);

    for (const rec of recurringExpenses) {
      if (rec.isPaused) continue;

      if (rec.frequency === "monthly") {
        const dueDayStr = rec.dueDay.toString().padStart(2, "0");
        const recDate = `${currentMonthKey}-${dueDayStr}`;
        if (!map.has(recDate)) {
          map.set(recDate, { totalSpent: 0, transactionsCount: 0, hasPlanned: false, hasRecurring: true, hasLoans: false });
        } else {
          map.get(recDate)!.hasRecurring = true;
        }
      } else if (rec.frequency === "yearly" && rec.dueMonth === currentMonth) {
        const dueDayStr = rec.dueDay.toString().padStart(2, "0");
        const recDate = `${currentMonthKey}-${dueDayStr}`;
        if (!map.has(recDate)) {
          map.set(recDate, { totalSpent: 0, transactionsCount: 0, hasPlanned: false, hasRecurring: true, hasLoans: false });
        } else {
          map.get(recDate)!.hasRecurring = true;
        }
      } else if (rec.frequency === "weekly" || rec.frequency === "biweekly") {
        calendarData.forEach((day) => {
          if (day.isCurrentMonth) {
            const d = new Date(`${day.dateStr}T00:00:00`);
            if (d.getDay() === (rec.dueWeekday ?? 1)) {
              if (!map.has(day.dateStr)) {
                map.set(day.dateStr, { totalSpent: 0, transactionsCount: 0, hasPlanned: false, hasRecurring: true, hasLoans: false });
              } else {
                map.get(day.dateStr)!.hasRecurring = true;
              }
            }
          }
        });
      }
    }

    // 4. Loans with due dates
    for (const loan of loans) {
      if (loan.dueDate) {
        if (!map.has(loan.dueDate)) {
          map.set(loan.dueDate, { totalSpent: 0, transactionsCount: 0, hasPlanned: false, hasRecurring: false, hasLoans: true });
        } else {
          map.get(loan.dueDate)!.hasLoans = true;
        }
      }
    }

    return map;
  }, [transactions, plannedExpenses, recurringExpenses, loans, currentMonthKey, calendarData]);

  // Max daily spending for heatmap calculation
  const maxDaySpend = useMemo(() => {
    let max = 0;
    dayEventsMap.forEach((entry) => {
      if (entry.totalSpent > max) max = entry.totalSpent;
    });
    return max || 1;
  }, [dayEventsMap]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsDayInspectorOpen(true);
  };

  const weekdayLabels = settings.weekStartsOn === "monday" 
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Compute unified chronological schedule of planned and recurring bills for currentMonthKey
  const monthCommitments = useMemo(() => {
    const list: Array<{
      id: string;
      kind: "recurring" | "planned";
      title: string;
      amount: number;
      dateStr: string;
      dayNum: number;
      categoryId: string;
      isPaid: boolean;
      frequencyLabel?: string;
      rawPlan?: PlannedExpense;
      rawRecurring?: RecurringExpense;
    }> = [];

    const [yearStr, monthStr] = currentMonthKey.split("-");
    const currentMonthNum = parseInt(monthStr, 10);
    const lastDayOfMonth = new Date(parseInt(yearStr, 10), currentMonthNum, 0).getDate();

    // 1. Planned Expenses for this month
    for (const plan of plannedExpenses) {
      if (plan.targetDate && plan.targetDate.startsWith(currentMonthKey)) {
        const day = parseInt(plan.targetDate.split("-")[2] || "1", 10);
        list.push({
          id: `planned-${plan.id}`,
          kind: "planned",
          title: plan.title,
          amount: plan.amount,
          dateStr: plan.targetDate,
          dayNum: day,
          categoryId: plan.categoryId,
          isPaid: !!plan.isPaid,
          rawPlan: plan,
        });
      }
    }

    // 2. Recurring Expenses due in this month
    for (const rec of recurringExpenses) {
      if (rec.isPaused) continue;

      const isPaidForMonth = Array.isArray(rec.paidDates) && rec.paidDates.some((pd) => pd.startsWith(currentMonthKey));

      if (rec.frequency === "monthly") {
        const clampedDay = Math.min(rec.dueDay, lastDayOfMonth);
        const dayStr = clampedDay.toString().padStart(2, "0");
        const dateStr = `${currentMonthKey}-${dayStr}`;
        list.push({
          id: `rec-${rec.id}`,
          kind: "recurring",
          title: rec.title,
          amount: rec.amount,
          dateStr,
          dayNum: clampedDay,
          categoryId: rec.categoryId,
          isPaid: isPaidForMonth,
          frequencyLabel: "Monthly bill",
          rawRecurring: rec,
        });
      } else if (rec.frequency === "yearly" && rec.dueMonth === currentMonthNum) {
        const clampedDay = Math.min(rec.dueDay, lastDayOfMonth);
        const dayStr = clampedDay.toString().padStart(2, "0");
        const dateStr = `${currentMonthKey}-${dayStr}`;
        list.push({
          id: `rec-${rec.id}`,
          kind: "recurring",
          title: rec.title,
          amount: rec.amount,
          dateStr,
          dayNum: clampedDay,
          categoryId: rec.categoryId,
          isPaid: isPaidForMonth,
          frequencyLabel: "Annual bill",
          rawRecurring: rec,
        });
      } else if (rec.frequency === "weekly" || rec.frequency === "biweekly") {
        calendarData.forEach((day) => {
          if (day.isCurrentMonth) {
            const d = new Date(`${day.dateStr}T00:00:00`);
            if (d.getDay() === (rec.dueWeekday ?? 1)) {
              list.push({
                id: `rec-${rec.id}-${day.dateStr}`,
                kind: "recurring",
                title: rec.title,
                amount: rec.amount,
                dateStr: day.dateStr,
                dayNum: day.dayNum,
                categoryId: rec.categoryId,
                isPaid: isPaidForMonth,
                frequencyLabel: rec.frequency === "weekly" ? "Weekly" : "Bi-weekly",
                rawRecurring: rec,
              });
            }
          }
        });
      }
    }

    // Sort chronologically by dateStr ascending, then by title
    list.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.title.localeCompare(b.title));
    return list;
  }, [currentMonthKey, plannedExpenses, recurringExpenses, calendarData]);

  const commitmentsSummary = useMemo(() => {
    let totalAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;

    for (const item of monthCommitments) {
      totalAmount += item.amount;
      if (item.isPaid) {
        paidCount++;
      } else {
        pendingAmount += item.amount;
      }
    }

    return { totalAmount, pendingAmount, paidCount };
  }, [monthCommitments]);

  const findTransactionForItem = (item: {
    kind: "recurring" | "planned";
    title: string;
    amount: number;
    categoryId: string;
    dateStr: string;
    isPaid: boolean;
    rawPlan?: PlannedExpense;
    rawRecurring?: RecurringExpense;
  }): Transaction | undefined => {
    if (item.kind === "planned" && item.rawPlan) {
      if (item.rawPlan.paidTransactionId) {
        const found = transactions.find((t) => t.id === item.rawPlan?.paidTransactionId);
        if (found) return found;
      }
      return transactions.find(
        (t) =>
          t.type === "expense" &&
          (t.note?.includes(item.title) || t.categoryId === item.categoryId) &&
          (t.date === item.rawPlan?.paidDate || t.date === item.dateStr || t.date === todayStr)
      );
    } else if (item.kind === "recurring" && item.rawRecurring) {
      return transactions.find(
        (t) =>
          t.type === "expense" &&
          t.categoryId === item.categoryId &&
          (t.note?.toLowerCase().includes(item.title.toLowerCase()) || t.amount === item.amount) &&
          (t.date.startsWith(currentMonthKey) || t.date === todayStr || t.date === item.dateStr)
      );
    }
    return undefined;
  };

  const handleItemClick = (item: {
    kind: "recurring" | "planned";
    title: string;
    amount: number;
    categoryId: string;
    dateStr: string;
    isPaid: boolean;
    rawPlan?: PlannedExpense;
    rawRecurring?: RecurringExpense;
  }) => {
    // If the item is marked as paid, look up and show the transaction details popup
    if (item.isPaid) {
      const tx = findTransactionForItem(item);
      if (tx) {
        setSelectedTx(tx);
        setIsTxDetailOpen(true);
        return;
      }
    }

    // If it's a recurring bill, open its detail modal
    if (item.kind === "recurring" && item.rawRecurring) {
      setSelectedRecurringDetail(item.rawRecurring);
      setIsRecurringDetailOpen(true);
      return;
    }

    // If it's a planned expense
    if (item.kind === "planned" && item.rawPlan) {
      setEditingPlan(item.rawPlan);
      setSelectedDate(item.dateStr);
      setIsPlanModalOpen(true);
      return;
    }
  };

  const handleSettleCommitment = (item: {
    kind: "recurring" | "planned";
    dateStr: string;
    rawPlan?: PlannedExpense;
    rawRecurring?: RecurringExpense;
  }) => {
    const isEarly = item.dateStr > todayStr;
    if (item.kind === "recurring" && item.rawRecurring) {
      logRecurringAsTransaction(item.rawRecurring.id, todayStr, currentMonthKey);
      showToast(
        isEarly
          ? `Paid early! Logged bill "${item.rawRecurring.title}" on today's date (${todayStr})`
          : `Logged bill "${item.rawRecurring.title}" as paid`
      );
    } else if (item.kind === "planned" && item.rawPlan) {
      markPlannedExpenseAsPaid(item.rawPlan.id, todayStr);
      showToast(
        isEarly
          ? `Paid early! Logged planned expense "${item.rawPlan.title}" on today's date (${todayStr})`
          : `Logged planned expense "${item.rawPlan.title}" as paid`
      );
    }
  };

  const handleEditCommitment = (item: {
    kind: "recurring" | "planned";
    dateStr: string;
    rawPlan?: PlannedExpense;
    rawRecurring?: RecurringExpense;
  }) => {
    if (item.kind === "recurring" && item.rawRecurring) {
      setEditingRecurring(item.rawRecurring);
      setIsRecurringModalOpen(true);
    } else if (item.kind === "planned" && item.rawPlan) {
      setEditingPlan(item.rawPlan);
      setSelectedDate(item.dateStr);
      setIsPlanModalOpen(true);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Integrated Clean Calendar Card */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] p-3 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
        {/* Integrated Top Navigation & Small Action Buttons Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#262626]">
          {/* Left: Left/Right Month Slider & Label */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentMonthKey(getPreviousMonth(currentMonthKey))}
                className="p-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] transition active:scale-95 cursor-pointer"
                title="Previous month"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs sm:text-sm font-bold text-[#F5F5F5] px-1.5 min-w-[110px] sm:min-w-[125px] text-center select-none font-mono-num">
                {formatMonthLabel(currentMonthKey)}
              </span>

              <button
                onClick={() => setCurrentMonthKey(getNextMonth(currentMonthKey))}
                className="p-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] transition active:scale-95 cursor-pointer"
                title="Next month"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {currentMonthKey !== todayStr.slice(0, 7) && (
              <button
                onClick={() => {
                  setCurrentMonthKey(todayStr.slice(0, 7));
                  setSelectedDate(todayStr);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition active:scale-95 cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* Right: Small Buttons for Plan Expense, Add Bill, and Recurring Bills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-[10px] sm:text-xs border border-cyan-500/30 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title="Plan a future expense"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Plan Expense</span>
            </button>

            <button
              onClick={() => {
                setEditingRecurring(null);
                setIsRecurringModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-[10px] sm:text-xs border border-purple-500/30 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title="Add a recurring bill"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Add Bill</span>
            </button>

            <button
              onClick={() => setIsRecurringListOpen(true)}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-[#F5F5F5] font-semibold text-[10px] sm:text-xs border border-[#333333] transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title="View all recurring bills & subscriptions"
            >
              <Repeat className="w-3 h-3 text-purple-400" />
              <span>Recurring Bills ({recurringExpenses.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs py-0.5">
          <div className="flex items-center gap-1 p-1 bg-[#1C1C1C] rounded-xl border border-[#262626]">
            {[
              { id: "all", label: "All" },
              { id: "spent", label: "Spent" },
              { id: "planned", label: "Planned" },
              { id: "recurring", label: "Bills" },
              { id: "loans", label: "Loans" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDayFilter(f.id as DayFilterType)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  dayFilter === f.id
                    ? "bg-[#262626] text-[#F5F5F5] border border-[#383838]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-[#71717A] shrink-0 hidden sm:inline">
            Click date to inspect or log
          </span>
        </div>

        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-1">
          {weekdayLabels.map((label) => (
            <span key={label} className="text-[10px] sm:text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
              {label}
            </span>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarData.map((day) => {
            const isSelected = selectedDate === day.dateStr && isDayInspectorOpen;
            const events = dayEventsMap.get(day.dateStr);

            const hasSpending = events && events.totalSpent > 0;
            const hasPlanned = events && events.hasPlanned;
            const hasRecurring = events && events.hasRecurring;
            const hasLoans = events && events.hasLoans;

            // Filter match logic
            let matchesFilter = true;
            if (dayFilter === "spent") matchesFilter = Boolean(hasSpending);
            else if (dayFilter === "planned") matchesFilter = Boolean(hasPlanned);
            else if (dayFilter === "recurring") matchesFilter = Boolean(hasRecurring);
            else if (dayFilter === "loans") matchesFilter = Boolean(hasLoans);

            // Heatmap intensity ratio
            const spendIntensity = hasSpending ? Math.min(1, events.totalSpent / maxDaySpend) : 0;

            return (
              <button
                key={day.dateStr}
                onClick={() => handleDayClick(day.dateStr)}
                className={`relative min-h-[58px] sm:min-h-[76px] p-1 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-all select-none focus:outline-none cursor-pointer ${
                  !matchesFilter && dayFilter !== "all"
                    ? "opacity-25"
                    : isSelected
                    ? "bg-[#262626] border-2 border-emerald-400 shadow-md ring-2 ring-emerald-500/20"
                    : day.isToday
                    ? "bg-[#1C1C1C] border border-emerald-500/60"
                    : day.isCurrentMonth
                    ? "bg-[#181818] hover:bg-[#202020] border border-[#262626]/70 active:scale-[0.98]"
                    : "opacity-25 bg-transparent hover:bg-neutral-900/30 border border-transparent"
                }`}
                style={{
                  backgroundColor:
                    day.isCurrentMonth && !isSelected && spendIntensity > 0
                      ? `rgba(244, 63, 94, ${Math.max(0.04, spendIntensity * 0.16)})`
                      : undefined,
                }}
                aria-label={day.dateStr}
              >
                {/* Top: Day Number & Today indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[11px] sm:text-xs font-bold font-mono-num ${
                      day.isToday
                        ? "text-[#F5F5F5]"
                        : day.isCurrentMonth
                        ? "text-[#A1A1AA]"
                        : "text-[#71717A]"
                    }`}
                  >
                    {day.dayNum}
                  </span>

                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ring-2 ring-emerald-400/20" />
                  )}
                </div>

                {/* Bottom: Spending total & Event Indicators */}
                <div className="space-y-0.5 w-full">
                  {hasSpending && (
                    <div className="text-[9px] sm:text-[10px] font-mono-num font-bold text-rose-300 truncate leading-tight">
                      {formatKAmount(events.totalSpent)}
                    </div>
                  )}

                  {/* Badges row */}
                  <div className="flex items-center gap-0.5 sm:gap-1 overflow-hidden pt-0.5">
                    {hasPlanned && (
                      <span
                        className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shrink-0"
                        title="Planned expense"
                      />
                    )}
                    {hasRecurring && (
                      <span
                        className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400 shrink-0"
                        title="Recurring bill"
                      />
                    )}
                    {hasLoans && (
                      <span
                        className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shrink-0"
                        title="Loan due date"
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2.5 text-[10px] sm:text-[11px] text-[#71717A]">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400" />
              <span>Spent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400" />
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400" />
              <span>Bill</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
              <span>Loan</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Minimal & Responsive Bills & Planned Section */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] p-3 sm:p-4 space-y-3 shadow-sm">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#262626]">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
              Bills & Planned Expenses
            </h3>
            <span className="text-[10px] font-mono-num font-semibold px-1.5 py-0.5 rounded-md bg-[#1C1C1C] border border-[#2E2E2E] text-[#A1A1AA] shrink-0">
              {monthCommitments.length}
            </span>
          </div>

          {/* Clean Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setEditingRecurring(null);
                setIsRecurringModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-xs border border-purple-500/30 transition active:scale-95 cursor-pointer"
              title="Add recurring bill"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Bill</span>
            </button>

            <button
              onClick={() => {
                setEditingPlan(null);
                setSelectedDate(`${currentMonthKey}-15`);
                setIsPlanModalOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-xs border border-cyan-500/30 transition active:scale-95 cursor-pointer"
              title="Plan expense"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Plan</span>
            </button>
          </div>
        </div>

        {/* Minimal Summary Strip */}
        {monthCommitments.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#181818] border border-[#262626] text-xs">
            <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto min-w-0">
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-[#71717A] uppercase font-semibold">Total</span>
                <span className="font-bold text-[#F5F5F5] font-mono-num text-xs sm:text-sm">
                  {formatMoney(commitmentsSummary.totalAmount, settings.currency, settings.numberFormat)}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-[#71717A] uppercase font-semibold">Pending</span>
                <span className="font-bold text-rose-400 font-mono-num text-xs sm:text-sm">
                  {formatMoney(commitmentsSummary.pendingAmount, settings.currency, settings.numberFormat)}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-[10px] sm:text-[11px] font-mono-num font-semibold text-[#A1A1AA]">
              <span className="text-emerald-400 font-bold">{commitmentsSummary.paidCount}</span>/{monthCommitments.length} paid
            </div>
          </div>
        )}

        {/* Minimalist Commitments List */}
        {monthCommitments.length === 0 ? (
          <div className="p-6 text-center space-y-1 rounded-xl bg-[#181818] border border-[#242424]">
            <p className="text-xs text-[#A1A1AA] font-medium">
              No bills or planned expenses this month
            </p>
            <p className="text-[11px] text-[#71717A]">
              Add a recurring bill or plan an expense above
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#222222] rounded-xl bg-[#181818] border border-[#262626] overflow-hidden text-xs">
            {monthCommitments.map((item) => {
              const cat = categoryMap.get(item.categoryId);
              const isPastDate = item.dateStr < todayStr;
              const isToday = item.dateStr === todayStr;

              // Format date cleanly, e.g. "Oct 17" or "Today"
              const [y, m, d] = item.dateStr.split("-").map(Number);
              const dateObj = new Date(y, (m || 1) - 1, d || 1);
              const shortMonth = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("en-US", { month: "short" })
                : "Due";
              const shortDateLabel = isToday
                ? "Today"
                : !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : item.dateStr;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-center justify-between p-2.5 sm:p-3 gap-2 sm:gap-3 transition hover:bg-[#202020] active:bg-[#252525] cursor-pointer group select-none ${
                    item.isPaid ? "opacity-75" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  title={item.isPaid ? "Click to view transaction details" : "Click to view details"}
                >
                  {/* Left: Date indicator + Title & Category */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Compact Date Box */}
                    <div
                      className={`flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border shrink-0 text-center ${
                        item.isPaid
                          ? "bg-[#161616] border-[#2A2A2A] text-[#71717A]"
                          : isToday
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : isPastDate
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                          : "bg-[#141414] border-[#2C2C2C] text-[#F5F5F5]"
                      }`}
                    >
                      <span className="text-xs font-bold font-mono-num leading-tight">
                        {item.dayNum}
                      </span>
                      <span className="text-[8px] uppercase font-semibold tracking-wider opacity-70 leading-none">
                        {isToday ? "Today" : shortMonth}
                      </span>
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-[#F5F5F5] truncate group-hover:text-emerald-300 transition-colors">
                          {item.title}
                        </span>

                        {/* Quiet indicator dot */}
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.kind === "recurring" ? "bg-purple-400" : "bg-cyan-400"
                          }`}
                          title={item.kind === "recurring" ? "Recurring Bill" : "Planned Expense"}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] truncate">
                        <span>{cat?.icon || "📦"} {cat?.name || "General"}</span>
                        <span>·</span>
                        <span>{shortDateLabel}</span>
                        {item.isPaid && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              {item.kind === "planned" && item.rawPlan?.paidDate && item.rawPlan.paidDate < item.dateStr
                                ? `Paid early`
                                : `Paid`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Action Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-bold font-mono-num ${
                        item.isPaid ? "text-[#71717A] line-through" : "text-[#F5F5F5]"
                      }`}
                    >
                      {formatMoney(item.amount, settings.currency, settings.numberFormat)}
                    </span>

                    {/* Settle / Pay Button */}
                    {!item.isPaid ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSettleCommitment(item);
                        }}
                        className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                        title="Mark as paid and log transaction"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span className="hidden xs:inline sm:inline">Pay</span>
                      </button>
                    ) : (
                      <span className="p-1 text-[#52525B] group-hover:text-[#A1A1AA] transition">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Details Modal (when clicking paid commitment) */}
      <TransactionDetailsModal
        isOpen={isTxDetailOpen}
        onClose={() => {
          setIsTxDetailOpen(false);
          setSelectedTx(null);
        }}
        transaction={selectedTx}
        categories={categories}
        settings={settings}
        onEdit={(tx) => {
          setIsTxDetailOpen(false);
          openAddModal(tx.type, tx);
        }}
        onDuplicate={(tx) => {
          duplicateTransaction(tx.id);
          showToast("Transaction duplicated");
          setIsTxDetailOpen(false);
        }}
        onDelete={(tx) => {
          deleteTransaction(tx.id);
          const cat = categories.find((c) => c.id === tx.categoryId);
          const catName = cat?.name || "Transaction";
          const amountStr = formatMoney(tx.amount, settings.currency, settings.numberFormat);
          const prefix = tx.type === "expense" ? "-" : "+";

          showToast(
            `Deleted ${catName} (${prefix}${amountStr})`,
            "info",
            {
              label: "Undo",
              onClick: () => {
                restoreTransaction(tx);
                showToast("Transaction restored", "success");
              },
            },
            6000
          );
          setIsTxDetailOpen(false);
        }}
      />

      {/* Recurring Bill Detail Modal */}
      <RecurringBillDetailModal
        isOpen={isRecurringDetailOpen}
        onClose={() => {
          setIsRecurringDetailOpen(false);
          setSelectedRecurringDetail(null);
        }}
        expense={selectedRecurringDetail}
        category={categoryMap.get(selectedRecurringDetail?.categoryId || "")}
        settings={settings}
        onEdit={(rec) => {
          setIsRecurringDetailOpen(false);
          setEditingRecurring(rec);
          setIsRecurringModalOpen(true);
        }}
      />

      {/* Day Inspector Popup Modal */}
      <DayInspectorModal
        isOpen={isDayInspectorOpen}
        onClose={() => setIsDayInspectorOpen(false)}
        dateStr={selectedDate}
        settings={settings}
        onOpenLogExpense={(date) => openAddModal("expense", { date })}
        onOpenPlanExpense={(date) => {
          setEditingPlan(null);
          setSelectedDate(date);
          setIsPlanModalOpen(true);
        }}
        onEditPlan={(plan) => {
          setEditingPlan(plan);
          setIsPlanModalOpen(true);
        }}
        onEditRecurring={(rec) => {
          setEditingRecurring(rec);
          setIsRecurringModalOpen(true);
        }}
      />

      {/* Recurring Bills List Modal */}
      <RecurringBillsModal
        isOpen={isRecurringListOpen}
        onClose={() => setIsRecurringListOpen(false)}
        settings={settings}
        onAddNew={() => {
          setEditingRecurring(null);
          setIsRecurringModalOpen(true);
        }}
        onEdit={(rec) => {
          setEditingRecurring(rec);
          setIsRecurringModalOpen(true);
        }}
      />

      {/* Plan Future Expense Modal */}
      <AddPlannedExpenseModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        initialDate={selectedDate}
        editPlan={editingPlan}
      />

      {/* Add / Edit Recurring Bill Modal */}
      <AddRecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false);
          setEditingRecurring(null);
        }}
        initialDay={parseInt(selectedDate.split("-")[2] || "1", 10)}
        editExpense={editingRecurring}
      />
    </div>
  );
};
