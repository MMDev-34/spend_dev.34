import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney } from "@/utils/currency";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  CreditCard,
  Flame,
  ChevronDown,
  Trophy
} from "lucide-react";
import { MonthPickerPopover } from "@/components/overview/MonthPickerPopover";
import { KeyInsightsGrid, FinancialInsightsData } from "@/components/overview/KeyInsightsGrid";
import { CategoryDonutSection, CategoryChartItem } from "@/components/overview/CategoryDonutSection";
import { CashFlowTrendChart, CashFlowDataPoint } from "@/components/overview/CashFlowTrendChart";
import { FiveMonthExpenseChart, MonthExpenseItem } from "@/components/overview/FiveMonthExpenseChart";
import { PeakExpenseDaysChart, PeakDayItem } from "@/components/overview/PeakExpenseDaysChart";

type TimeScopeType = "month" | "last3" | "all";

const PALETTE = [
  "#2DD4BF", // Turquoise / Mint
  "#64748B", // Slate Blue
  "#38BDF8", // Sky Blue
  "#FBBF24", // Warm Yellow
  "#34D399", // Mint Green
  "#22D3EE", // Cyan
  "#F87171", // Coral Red
  "#A855F7", // Purple
  "#60A5FA", // Blue
  "#FB923C", // Tangerine
  "#EC4899", // Pink
  "#A3E635", // Lime
];

export const OverviewPage: React.FC = () => {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const setSelectedMonth = useUIStore((s) => s.setSelectedMonth);
  const openAddModal = useUIStore((s) => s.openAddModal);

  // Local interactive controls
  const [activeMonth, setActiveMonth] = useState<string>(selectedMonth || new Date().toISOString().slice(0, 7));
  const [timeScope, setTimeScope] = useState<TimeScopeType>("month");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [donutQuadrant, setDonutQuadrant] = useState<"left" | "right">("right");
  const [comparisonView, setComparisonView] = useState<"months" | "peakDays">("months");
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    return parseInt((selectedMonth || new Date().toISOString().slice(0, 7)).split("-")[0], 10);
  });
  const [fiveMonthOffset, setFiveMonthOffset] = useState<number>(0);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const touchStart5MonthsRef = useRef<{ x: number; y: number } | null>(null);

  // Reset 5-month offset and selected month index when activeMonth or offset changes
  useEffect(() => {
    setFiveMonthOffset(0);
    setSelectedMonthIndex(null);
  }, [activeMonth]);

  useEffect(() => {
    setSelectedMonthIndex(null);
  }, [fiveMonthOffset]);

  // Touch swipe handling for 5-month comparison (swipe right to see previous 5 months)
  const handleTouchStart5Months = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStart5MonthsRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd5Months = (e: React.TouchEvent) => {
    if (!touchStart5MonthsRef.current || !e.changedTouches || e.changedTouches.length === 0) {
      touchStart5MonthsRef.current = null;
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStart5MonthsRef.current.x - touchEndX;
    const diffY = touchStart5MonthsRef.current.y - touchEndY;
    touchStart5MonthsRef.current = null;

    if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        setFiveMonthOffset((prev) => Math.min(10, prev + 1));
      } else {
        setFiveMonthOffset((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handlePrev5Months = () => {
    setFiveMonthOffset((prev) => Math.min(10, prev + 1));
  };

  const handleNext5Months = () => {
    setFiveMonthOffset((prev) => Math.max(0, prev - 1));
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = activeMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const newMonthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    setActiveMonth(newMonthStr);
    setSelectedMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    const [y, m] = activeMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    const newMonthStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setActiveMonth(newMonthStr);
    setSelectedMonth(newMonthStr);
  };

  const handleSelectMonth = (monthIdx: number, year: number) => {
    const mStr = String(monthIdx + 1).padStart(2, "0");
    const newMonthStr = `${year}-${mStr}`;
    setActiveMonth(newMonthStr);
    setSelectedMonth(newMonthStr);
    setTimeScope("month");
    setIsMonthPickerOpen(false);
  };

  const formattedMonthLabel = useMemo(() => {
    const [y, m] = activeMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [activeMonth]);

  // Filter transactions based on activeMonth and timeScope
  const scopedTransactions = useMemo(() => {
    if (timeScope === "all") {
      return transactions;
    }

    if (timeScope === "last3") {
      const [y, m] = activeMonth.split("-").map(Number);
      const monthsToCheck: string[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(y, m - 1 - i, 1);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, "0");
        monthsToCheck.push(`${yStr}-${mStr}`);
      }
      return transactions.filter((t) => t.date && monthsToCheck.some((mo) => t.date.startsWith(mo)));
    }

    // Default: Single active month
    return transactions.filter((t) => t.date && t.date.startsWith(activeMonth));
  }, [transactions, activeMonth, timeScope]);

  // Financial aggregates
  const { totalExpense, totalIncome, totalUnwanted, netSavings, savingsRate, expensesList } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let unw = 0;
    const expList: typeof transactions = [];

    for (const t of scopedTransactions) {
      if (t.type === "expense") {
        exp += t.amount;
        if (t.isUnwanted) unw += t.amount;
        expList.push(t);
      } else {
        inc += t.amount;
      }
    }

    const savings = inc - exp;
    const rate = inc > 0 ? Math.round((savings / inc) * 100) : null;

    return {
      totalExpense: exp,
      totalIncome: inc,
      totalUnwanted: unw,
      netSavings: savings,
      savingsRate: rate,
      expensesList: expList,
    };
  }, [scopedTransactions]);

  // Category Aggregates for Charts
  const categoryData: CategoryChartItem[] = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const totals = new Map<string, { total: number; count: number }>();

    for (const t of expensesList) {
      const current = totals.get(t.categoryId) || { total: 0, count: 0 };
      current.total += t.amount;
      current.count += 1;
      totals.set(t.categoryId, current);
    }

    const items = Array.from(totals.entries()).map(([catId, val], idx) => {
      const cat = catMap.get(catId);
      const percentage = totalExpense > 0 ? (val.total / totalExpense) * 100 : 0;
      return {
        id: catId,
        name: cat?.name || "Other",
        icon: cat?.icon || "📦",
        value: val.total,
        percentage,
        count: val.count,
        color: cat?.color || PALETTE[idx % PALETTE.length],
      };
    });

    return items.sort((a, b) => b.value - a.value);
  }, [expensesList, categories, totalExpense]);

  // Cash Flow Trend continuous time series
  const cashFlowTrendData: CashFlowDataPoint[] = useMemo(() => {
    let startDt: Date;
    let endDt: Date;

    const [y, m] = activeMonth.split("-").map(Number);

    if (timeScope === "month") {
      startDt = new Date(y, m - 1, 1);
      endDt = new Date(y, m, 0);
    } else if (timeScope === "last3") {
      const startYear = m <= 2 ? y - 1 : y;
      const startMo = m <= 2 ? 12 + (m - 3) : m - 3;
      startDt = new Date(startYear, startMo, 1);
      endDt = new Date(y, m, 0);
    } else {
      const validTxs = scopedTransactions.filter((t) => t.date && t.date.length >= 10);
      const sortedTxs = [...validTxs].sort((a, b) => a.date.localeCompare(b.date));
      if (sortedTxs.length > 0) {
        const [sy, sm, sd] = sortedTxs[0].date.split("-").map(Number);
        startDt = new Date(sy, sm - 1, sd || 1);
        const [ey, em, ed] = sortedTxs[sortedTxs.length - 1].date.split("-").map(Number);
        endDt = new Date(ey, em - 1, ed || 28);
      } else {
        startDt = new Date(y, m - 1, 1);
        endDt = new Date(y, m, 0);
      }
    }

    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt > endDt) {
      startDt = new Date(y, m - 1, 1);
      endDt = new Date(y, m, 0);
    }

    const totalDaysSpan = Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24));

    if (timeScope !== "all" || totalDaysSpan <= 90) {
      const map = new Map<string, { spending: number; earning: number; unwanted: number }>();
      for (const t of scopedTransactions) {
        if (!t.date) continue;
        const cur = map.get(t.date) || { spending: 0, earning: 0, unwanted: 0 };
        if (t.type === "expense") {
          cur.spending += t.amount;
          if (t.isUnwanted) cur.unwanted += t.amount;
        } else if (t.type === "income") {
          cur.earning += t.amount;
        }
        map.set(t.date, cur);
      }

      const result: CashFlowDataPoint[] = [];
      const iter = new Date(startDt);
      let safetyCounter = 0;

      while (iter <= endDt && safetyCounter < 120) {
        safetyCounter++;
        const yr = iter.getFullYear();
        const moStr = String(iter.getMonth() + 1).padStart(2, "0");
        const dyStr = String(iter.getDate()).padStart(2, "0");
        const dateKey = `${yr}-${moStr}-${dyStr}`;
        const dayNum = iter.getDate();
        const rec = map.get(dateKey) || { spending: 0, earning: 0, unwanted: 0 };

        const monthName = iter.toLocaleDateString("en-US", { month: "short" });
        const label = timeScope === "last3" ? `${dayNum} ${monthName}` : String(dayNum);
        const fullLabel = iter.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

        result.push({
          date: dateKey,
          dayNum,
          label,
          fullLabel,
          spending: rec.spending,
          earning: rec.earning,
          unwanted: rec.unwanted,
          net: rec.earning - rec.spending,
        });

        iter.setDate(iter.getDate() + 1);
      }

      return result;
    }

    // Multi-month aggregation for All Time
    const monthMap = new Map<string, { spending: number; earning: number; unwanted: number }>();
    for (const t of scopedTransactions) {
      if (!t.date) continue;
      const monthKey = t.date.slice(0, 7);
      const cur = monthMap.get(monthKey) || { spending: 0, earning: 0, unwanted: 0 };
      if (t.type === "expense") {
        cur.spending += t.amount;
        if (t.isUnwanted) cur.unwanted += t.amount;
      } else if (t.type === "income") {
        cur.earning += t.amount;
      }
      monthMap.set(monthKey, cur);
    }

    const result: CashFlowDataPoint[] = [];
    const curIter = new Date(startDt.getFullYear(), startDt.getMonth(), 1);
    const endMonth = new Date(endDt.getFullYear(), endDt.getMonth(), 1);
    const spanYears = endDt.getFullYear() - startDt.getFullYear();

    let safetyCounter = 0;
    while (curIter <= endMonth && safetyCounter < 120) {
      safetyCounter++;
      const yr = curIter.getFullYear();
      const moStr = String(curIter.getMonth() + 1).padStart(2, "0");
      const monthKey = `${yr}-${moStr}`;
      const rec = monthMap.get(monthKey) || { spending: 0, earning: 0, unwanted: 0 };

      const moShort = curIter.toLocaleDateString("en-US", { month: "short" });
      const yrShort = String(yr).slice(-2);
      const label = spanYears > 0 ? `${moShort} '${yrShort}` : moShort;
      const fullLabel = curIter.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      result.push({
        date: monthKey,
        dayNum: curIter.getMonth() + 1,
        label,
        fullLabel,
        spending: rec.spending,
        earning: rec.earning,
        unwanted: rec.unwanted,
        net: rec.earning - rec.spending,
        isMonthly: true,
      });

      curIter.setMonth(curIter.getMonth() + 1);
    }

    return result;
  }, [scopedTransactions, activeMonth, timeScope]);

  const xAxisTicks = useMemo(() => {
    if (!cashFlowTrendData || cashFlowTrendData.length === 0) return undefined;

    if (timeScope === "month") {
      const targetDays = [1, 5, 10, 15, 20, 25, 30];
      return cashFlowTrendData.filter((d) => d.dayNum && targetDays.includes(d.dayNum)).map((d) => d.date);
    }

    if (timeScope === "last3") {
      return cashFlowTrendData.filter((d) => d.dayNum === 1 || d.dayNum === 15).map((d) => d.date);
    }

    const isMonthly = cashFlowTrendData[0]?.isMonthly;
    if (isMonthly) {
      const totalMonths = cashFlowTrendData.length;
      if (totalMonths <= 7) return cashFlowTrendData.map((d) => d.date);
      const step = Math.ceil(totalMonths / 6);
      return cashFlowTrendData.filter((_, idx) => idx % step === 0 || idx === totalMonths - 1).map((d) => d.date);
    }

    const monthFirsts = cashFlowTrendData.filter((d) => d.dayNum === 1 || d.dayNum === 15);
    return monthFirsts.length > 0 ? monthFirsts.map((d) => d.date) : undefined;
  }, [cashFlowTrendData, timeScope]);

  // Last 5 Months Expense Comparison Data
  const last5MonthsData: MonthExpenseItem[] = useMemo(() => {
    const [currY, currM] = activeMonth.split("-").map(Number);
    const monthsList: MonthExpenseItem[] = [];
    const baseOffset = fiveMonthOffset * 5;

    for (let i = 4; i >= 0; i--) {
      const d = new Date(currY, currM - 1 - baseOffset - i, 1);
      const y = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${y}-${mStr}`;
      const moShort = d.toLocaleDateString("en-US", { month: "short" });
      const yrShort = String(y).slice(-2);
      const label = `${moShort} '${yrShort}`;

      const mTransactions = transactions.filter((t) => t.date && t.date.startsWith(key));
      const exp = mTransactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const inc = mTransactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);

      monthsList.push({
        monthKey: key,
        monthLabel: label,
        expense: exp,
        income: inc,
        isCurrent: key === activeMonth && fiveMonthOffset === 0,
        diffPct: null,
      });
    }

    return monthsList.map((item, idx) => {
      const prevExpense = idx > 0 ? monthsList[idx - 1].expense : null;
      let diffPct: number | null = null;
      if (prevExpense !== null && prevExpense > 0) {
        diffPct = Math.round(((item.expense - prevExpense) / prevExpense) * 100);
      }
      return { ...item, diffPct };
    });
  }, [transactions, activeMonth, fiveMonthOffset]);

  const fiveMonthsRangeLabel = useMemo(() => {
    if (!last5MonthsData || last5MonthsData.length === 0) return "";
    return `${last5MonthsData[0]?.monthLabel} – ${last5MonthsData[last5MonthsData.length - 1]?.monthLabel}`;
  }, [last5MonthsData]);

  // Ranked 5 to 6 Highest Expense Days
  const peakExpenseDays: PeakDayItem[] = useMemo(() => {
    const dayMap = new Map<string, { total: number; transactions: typeof transactions }>();

    for (const t of scopedTransactions) {
      if (t.type === "expense" && t.date) {
        const cur = dayMap.get(t.date) || { total: 0, transactions: [] };
        cur.total += t.amount;
        cur.transactions.push(t);
        dayMap.set(t.date, cur);
      }
    }

    const sorted = Array.from(dayMap.entries())
      .filter(([_, val]) => val.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6);

    const maxSpend = sorted.length > 0 ? sorted[0][1].total : 1;

    return sorted.map(([dateStr, val], index) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      const formattedDate = `${dt.getDate()} ${dt.toLocaleDateString("en-US", { month: "short" })}`;
      const fullDate = `${dt.getDate()} ${dt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
      const chartLabel = `#${index + 1}  ${formattedDate}`;
      const topTx = [...val.transactions].sort((a, b) => b.amount - a.amount)[0];
      const percentageOfTimeline = totalExpense > 0 ? Math.round((val.total / totalExpense) * 100) : 0;
      const relativeToPeak = Math.max(8, Math.round((val.total / maxSpend) * 100));

      return {
        rank: index + 1,
        date: dateStr,
        formattedDate,
        fullDate,
        chartLabel,
        total: val.total,
        topItemNote: topTx?.note || undefined,
        txCount: val.transactions.length,
        percentageOfTimeline,
        relativeToPeak,
        transactions: val.transactions,
      };
    });
  }, [scopedTransactions, totalExpense]);

  // Derived Financial Insights
  const insights: FinancialInsightsData | null = useMemo(() => {
    let maxTx = expensesList.length > 0 ? expensesList[0] : null;
    for (const t of expensesList) {
      if (!maxTx || t.amount > maxTx.amount) maxTx = t;
    }

    const [y, m] = activeMonth.split("-").map(Number);
    const daysCount = timeScope === "month" ? new Date(y, m, 0).getDate() : 30;
    const avgDaily = Math.round(totalExpense / daysCount);
    const topCat = categoryData.length > 0 ? categoryData[0] : null;

    const expenseByDay = new Map<string, { total: number; transactions: typeof transactions }>();
    const incomeByDay = new Map<string, { total: number; transactions: typeof transactions }>();

    for (const t of scopedTransactions) {
      if (t.type === "expense") {
        const cur = expenseByDay.get(t.date) || { total: 0, transactions: [] };
        cur.total += t.amount;
        cur.transactions.push(t);
        expenseByDay.set(t.date, cur);
      } else if (t.type === "income") {
        const cur = incomeByDay.get(t.date) || { total: 0, transactions: [] };
        cur.total += t.amount;
        cur.transactions.push(t);
        incomeByDay.set(t.date, cur);
      }
    }

    let highestSpentDay: { date: string; amount: number; topItem?: string } | null = null;
    for (const [date, val] of expenseByDay.entries()) {
      if (!highestSpentDay || val.total > highestSpentDay.amount) {
        const topTx = [...val.transactions].sort((a, b) => b.amount - a.amount)[0];
        highestSpentDay = {
          date,
          amount: val.total,
          topItem: topTx?.note || undefined,
        };
      }
    }

    let highestIncomeDay: { date: string; amount: number; topItem?: string } | null = null;
    for (const [date, val] of incomeByDay.entries()) {
      if (!highestIncomeDay || val.total > highestIncomeDay.amount) {
        const topTx = [...val.transactions].sort((a, b) => b.amount - a.amount)[0];
        highestIncomeDay = {
          date,
          amount: val.total,
          topItem: topTx?.note || undefined,
        };
      }
    }

    const expenseDatesSet = new Set<string>();
    for (const t of scopedTransactions) {
      if (t.type === "expense" && t.date) {
        expenseDatesSet.add(t.date);
      }
    }

    let totalDaysInScope = 30;
    let daysRemainingInMonth = 1;
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);

    if (timeScope === "month") {
      const [yearNum, monthNum] = activeMonth.split("-").map(Number);
      totalDaysInScope = new Date(yearNum, monthNum, 0).getDate();
      if (activeMonth === currentMonthStr) {
        daysRemainingInMonth = Math.max(1, totalDaysInScope - now.getDate() + 1);
      } else {
        daysRemainingInMonth = totalDaysInScope;
      }
    } else {
      totalDaysInScope = cashFlowTrendData.length || 30;
      daysRemainingInMonth = totalDaysInScope;
    }

    let noSpendDaysCount = 0;
    if (timeScope === "month") {
      noSpendDaysCount = Math.max(0, totalDaysInScope - expenseDatesSet.size);
    } else {
      noSpendDaysCount = cashFlowTrendData.filter((d) => d.spending === 0).length;
    }
    const noSpendPercentage = totalDaysInScope > 0 ? Math.round((noSpendDaysCount / totalDaysInScope) * 100) : 0;

    const netHeadroom = totalIncome - totalExpense;
    let safeToSpendDaily = 0;
    let safeStatusText = "";

    if (netHeadroom > 0) {
      safeToSpendDaily = Math.round(netHeadroom / daysRemainingInMonth);
      safeStatusText = `${daysRemainingInMonth}d left in scope`;
    } else if (totalIncome > 0) {
      safeToSpendDaily = 0;
      safeStatusText = "Outflow exceeded earnings";
    } else {
      safeToSpendDaily = 0;
      safeStatusText = "No surplus balance";
    }

    return {
      largestExpense: maxTx,
      avgDailySpend: avgDaily,
      topCategory: topCat,
      highestSpentDay,
      highestIncomeDay,
      noSpendDaysCount,
      totalDaysInScope,
      noSpendPercentage,
      safeToSpendDaily,
      safeStatusText,
    };
  }, [expensesList, scopedTransactions, activeMonth, timeScope, totalExpense, totalIncome, categoryData, cashFlowTrendData]);

  const formatInsightDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return `${dt.getDate()} ${dt.toLocaleDateString("en-US", { month: "short" })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-5 lg:space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Bar: Month Navigator & Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-[#141414] border border-[#262626] rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-sm">
        {/* Month Selector Buttons */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={timeScope !== "month"}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#262626] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div className="relative flex-1 sm:flex-none">
            <button
              type="button"
              onClick={() => {
                setPickerYear(parseInt(activeMonth.split("-")[0], 10));
                setIsMonthPickerOpen(!isMonthPickerOpen);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#1C1C1C] hover:bg-[#242424] border border-[#262626] hover:border-neutral-600 transition cursor-pointer w-full sm:w-auto sm:min-w-[155px] justify-between sm:justify-center text-left"
              title="Click to change month directly"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs md:text-sm font-semibold text-[#F5F5F5] truncate">
                  {timeScope === "month" ? formattedMonthLabel : timeScope === "last3" ? "Last 3 Months" : "All Time"}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#71717A] shrink-0 transition-transform duration-200 ${isMonthPickerOpen ? "rotate-180 text-emerald-400" : ""}`} />
            </button>

            <MonthPickerPopover
              isOpen={isMonthPickerOpen}
              onClose={() => setIsMonthPickerOpen(false)}
              pickerYear={pickerYear}
              onYearChange={setPickerYear}
              activeMonth={activeMonth}
              timeScope={timeScope}
              onSelectMonth={handleSelectMonth}
              onJumpToCurrentMonth={() => {
                const now = new Date();
                const nowStr = now.toISOString().slice(0, 7);
                setActiveMonth(nowStr);
                setSelectedMonth(nowStr);
                setPickerYear(now.getFullYear());
                setTimeScope("month");
                setIsMonthPickerOpen(false);
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={timeScope !== "month"}
            className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#262626] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Time Scope Switcher */}
        <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-[#262626] self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => setTimeScope("month")}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              timeScope === "month" ? "bg-black text-white shadow-sm border border-neutral-700" : "text-[#71717A] hover:text-white"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setTimeScope("last3")}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              timeScope === "last3" ? "bg-black text-white shadow-sm border border-neutral-700" : "text-[#71717A] hover:text-white"
            }`}
          >
            Last 3 Mo
          </button>
          <button
            type="button"
            onClick={() => setTimeScope("all")}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
              timeScope === "all" ? "bg-black text-white shadow-sm border border-neutral-700" : "text-[#71717A] hover:text-white"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 2. Net Cash Flow Hero Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#181818] via-[#141414] to-[#0F0F0F] border border-[#262626] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                {timeScope === "month" ? "Monthly Net Cash Flow" : timeScope === "last3" ? "3-Month Net Cash Flow" : "Total Net Cash Flow"}
              </span>
              {savingsRate !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  savingsRate >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  {savingsRate}% Saved
                </span>
              )}
            </div>

            <div className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight ${netSavings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {netSavings >= 0 ? "+" : ""}{formatMoney(netSavings, settings.currency, settings.numberFormat)}
            </div>
          </div>

        </div>

        {/* 4 Financial Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-[#262626]/80">
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] space-y-0.5 sm:space-y-1 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between text-[10.5px] sm:text-xs text-[#71717A]">
              <span className="truncate">Total Spending</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <TrendingDown className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-rose-400 font-mono-num pt-0.5 truncate leading-tight">
              {formatMoney(totalExpense, settings.currency, settings.numberFormat)}
            </div>
            <div className="text-[9.5px] sm:text-[11px] text-[#71717A] truncate block">
              {expensesList.length} expenses
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] space-y-0.5 sm:space-y-1 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between text-[10.5px] sm:text-xs text-[#71717A]">
              <span className="truncate">Total Income</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-emerald-400 font-mono-num pt-0.5 truncate leading-tight">
              {formatMoney(totalIncome, settings.currency, settings.numberFormat)}
            </div>
            <div className="text-[9.5px] sm:text-[11px] text-[#71717A] truncate block">
              Inflow recorded
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] space-y-0.5 sm:space-y-1 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between text-[10.5px] sm:text-xs text-[#71717A]">
              <span className="truncate">Net Savings</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Wallet className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className={`text-sm sm:text-lg lg:text-xl font-bold font-mono-num pt-0.5 truncate leading-tight ${netSavings >= 0 ? "text-[#F5F5F5]" : "text-rose-400"}`}>
              {netSavings >= 0 ? "+" : ""}{formatMoney(netSavings, settings.currency, settings.numberFormat)}
            </div>
            <div className="text-[9.5px] sm:text-[11px] text-[#71717A] truncate block">
              {savingsRate !== null ? (
                <span className={savingsRate >= 20 ? "text-emerald-400 font-semibold" : ""}>
                  {savingsRate}% rate
                </span>
              ) : (
                "No income"
              )}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] space-y-0.5 sm:space-y-1 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between text-[10.5px] sm:text-xs text-[#71717A]">
              <span className="truncate">Avg Daily Spend</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
              </div>
            </div>
            <div className="text-sm sm:text-lg lg:text-xl font-bold text-amber-400 font-mono-num pt-0.5 truncate leading-tight">
              {insights ? formatMoney(insights.avgDailySpend, settings.currency, settings.numberFormat) : "—"}
            </div>
            <div className="text-[9.5px] sm:text-[11px] text-[#71717A] truncate block">
              Daily outflow
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Breakdown & Financial Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <CategoryDonutSection
          categoryData={categoryData}
          totalExpense={totalExpense}
          settings={settings}
          hoveredCategory={hoveredCategory}
          setHoveredCategory={setHoveredCategory}
          donutQuadrant={donutQuadrant}
          setDonutQuadrant={setDonutQuadrant}
          openAddModal={openAddModal}
        />

        <KeyInsightsGrid
          insights={insights}
          settings={settings}
          formatInsightDate={formatInsightDate}
        />
      </div>

      {/* 4. Cash Flow Trend & Payment Methods Chart */}
      <CashFlowTrendChart
        cashFlowTrendData={cashFlowTrendData}
        totalExpense={totalExpense}
        totalIncome={totalIncome}
        totalUnwanted={totalUnwanted}
        timeScope={timeScope}
        xAxisTicks={xAxisTicks}
        settings={settings}
        transactions={scopedTransactions}
        categories={categories}
        activeMonth={activeMonth}
      />

      {/* 5. Expense Comparison & Peak Spend Days Ranking */}
      {comparisonView === "months" ? (
        <FiveMonthExpenseChart
          last5MonthsData={last5MonthsData}
          fiveMonthsRangeLabel={fiveMonthsRangeLabel}
          fiveMonthOffset={fiveMonthOffset}
          setFiveMonthOffset={setFiveMonthOffset}
          selectedMonthIndex={selectedMonthIndex}
          setSelectedMonthIndex={setSelectedMonthIndex}
          handlePrev5Months={handlePrev5Months}
          handleNext5Months={handleNext5Months}
          handleTouchStart5Months={handleTouchStart5Months}
          handleTouchEnd5Months={handleTouchEnd5Months}
          settings={settings}
          transactions={transactions}
          totalExpense={totalExpense}
          comparisonView={comparisonView}
          setComparisonView={setComparisonView}
        />
      ) : (
        <div className="rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 shadow-sm select-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#262626]">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
                  Peak Expense Days Ranking
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setComparisonView("months")}
                  className="px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 text-[#71717A] hover:text-white"
                >
                  <span>5-Month Trend</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonView("peakDays")}
                  className="px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 bg-black text-white shadow-sm border border-neutral-700"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Peak Days</span>
                </button>
              </div>
            </div>
          </div>

          <PeakExpenseDaysChart
            peakExpenseDays={peakExpenseDays}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
};
