import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { Transaction } from "@/types/transaction";
import { TransactionDetailsModal } from "@/components/transaction/TransactionDetailsModal";
import { TransactionDetailView } from "@/components/transaction/TransactionDetailView";
import { ExportCsvModal } from "@/components/transaction/ExportCsvModal";
import { ConfirmDeleteTransactionModal } from "@/components/transaction/ConfirmDeleteTransactionModal";
import { DatePeriodDropdown, DatePeriodValue } from "@/components/transaction/DatePeriodDropdown";
import { 
  AdvancedFilterDrawer, 
  AdvancedFilterState, 
  DEFAULT_FILTER_STATE 
} from "@/components/transaction/AdvancedFilterDrawer";
import { ActiveFilterChips } from "@/components/transaction/ActiveFilterChips";
import { 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Edit2, 
  Download, 
  X,
  SlidersHorizontal
} from "lucide-react";
import { 
  isTransferOrLoan, 
  isRealExpense, 
  isRealIncome, 
  getTransferOrLoanLabel 
} from "@/utils/transactionClassification";

type QuickTypeFilter = "all" | "expense" | "income" | "transfer";

export const TransactionsPage: React.FC = () => {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const restoreTransaction = useAppStore((s) => s.restoreTransaction);
  const duplicateTransaction = useAppStore((s) => s.duplicateTransaction);

  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);
  const activityDateFilter = useUIStore((s) => s.activityDateFilter);
  const setActivityDateFilter = useUIStore((s) => s.setActivityDateFilter);
  const focusedTransactionId = useUIStore((s) => s.focusedTransactionId);
  const setFocusedTransactionId = useUIStore((s) => s.setFocusedTransactionId);

  // Search & Quick Type Filter
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuickTypeFilter>("all");

  // Single Unified Date Period Dropdown
  const [datePeriod, setDatePeriod] = useState<DatePeriodValue>({
    type: "this_month",
  });

  // Advanced Filter Drawer State
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(DEFAULT_FILTER_STATE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Auto-filter by clicked peak expense day from Overview
  useEffect(() => {
    if (activityDateFilter) {
      setDatePeriod({
        type: "custom",
        customStartDate: activityDateFilter,
        customEndDate: activityDateFilter,
      });
      setActivityDateFilter(null);
    }
  }, [activityDateFilter, setActivityDateFilter]);

  // Modals & In-page detail view state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [mobileDetailTxId, setMobileDetailTxId] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const todayStr = useMemo(() => getToday(), []);

  // Auto-open transaction when clicked from recent payments on Home tab
  useEffect(() => {
    if (focusedTransactionId) {
      const target = transactions.find((tx) => tx.id === focusedTransactionId);
      if (target) {
        const currentMonthPrefix = new Date().toISOString().slice(0, 7);
        if (!target.date.startsWith(currentMonthPrefix)) {
          setDatePeriod({ type: "all_time" });
        }
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        if (isMobile) {
          setMobileDetailTxId(target.id);
        } else {
          setSelectedTransaction(target);
          setIsDetailsModalOpen(true);
        }
      }
      setFocusedTransactionId(null);
    }
  }, [focusedTransactionId, transactions, setFocusedTransactionId]);

  // Compute active filters count for the Filter badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.categoryIds.length > 0) count++;
    if (advancedFilters.paymentMethods.length > 0) count++;
    if (advancedFilters.minAmount || advancedFilters.maxAmount) count++;
    if (advancedFilters.spendingFlag !== "all") count++;
    if (advancedFilters.transferOption !== "include") count++;
    if (advancedFilters.sortBy !== "newest") count++;
    return count;
  }, [advancedFilters]);

  // Filter & sort calculation
  const filtered = useMemo(() => {
    let result = [...transactions];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // 1. Date Period Filter
    if (datePeriod.type === "this_month") {
      const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(currentMonthPrefix));
    } else if (datePeriod.type === "last_month") {
      const prevMonth = currentMonth === 0 ? 12 : currentMonth;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthPrefix = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(prevMonthPrefix));
    } else if (datePeriod.type === "last_7_days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${(sevenDaysAgo.getMonth() + 1).toString().padStart(2, "0")}-${sevenDaysAgo.getDate().toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date >= sevenDaysAgoStr && t.date <= todayStr);
    } else if (datePeriod.type === "this_year") {
      const currentYearPrefix = `${currentYear}-`;
      result = result.filter((t) => t.date.startsWith(currentYearPrefix));
    } else if (datePeriod.type === "custom") {
      if (datePeriod.customStartDate) {
        result = result.filter((t) => t.date >= datePeriod.customStartDate!);
      }
      if (datePeriod.customEndDate) {
        result = result.filter((t) => t.date <= datePeriod.customEndDate!);
      }
    }
    // "all_time" keeps all dates

    // 2. Quick Type Filter (All / Expenses / Income / Transfer)
    if (typeFilter === "expense") {
      result = result.filter((t) => isRealExpense(t));
    } else if (typeFilter === "income") {
      result = result.filter((t) => isRealIncome(t));
    } else if (typeFilter === "transfer") {
      result = result.filter((t) => isTransferOrLoan(t));
    }

    // 3. Advanced Drawer Filters
    // Categories (Multi-select)
    if (advancedFilters.categoryIds.length > 0) {
      const catSet = new Set(advancedFilters.categoryIds);
      result = result.filter((t) => catSet.has(t.categoryId));
    }

    // Payment Methods (Multi-select)
    if (advancedFilters.paymentMethods.length > 0) {
      const pmSet = new Set(advancedFilters.paymentMethods.map((p) => p.toLowerCase()));
      result = result.filter((t) => {
        const pm = (t.paymentMethod || "other").toLowerCase();
        return pmSet.has(pm);
      });
    }

    // Amount Range
    if (advancedFilters.minAmount) {
      const minMinor = parseFloat(advancedFilters.minAmount) * 100;
      if (!isNaN(minMinor)) {
        result = result.filter((t) => t.amount >= minMinor);
      }
    }
    if (advancedFilters.maxAmount) {
      const maxMinor = parseFloat(advancedFilters.maxAmount) * 100;
      if (!isNaN(maxMinor)) {
        result = result.filter((t) => t.amount <= maxMinor);
      }
    }

    // Spending Flag
    if (advancedFilters.spendingFlag === "unwanted_only") {
      result = result.filter((t) => Boolean(t.isUnwanted));
    }

    // Transfer Filter Option
    if (advancedFilters.transferOption === "exclude") {
      result = result.filter((t) => !isTransferOrLoan(t));
    } else if (advancedFilters.transferOption === "only") {
      result = result.filter((t) => isTransferOrLoan(t));
    }

    // 4. Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const catName = categoryMap.get(t.categoryId)?.name?.toLowerCase() || "";
        const note = (t.note || "").toLowerCase();
        const amountExact = (t.amount / 100).toString();
        return catName.includes(q) || note.includes(q) || amountExact.includes(q);
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (advancedFilters.sortBy === "oldest") {
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      }
      if (advancedFilters.sortBy === "highest") {
        return b.amount - a.amount || b.date.localeCompare(a.date);
      }
      if (advancedFilters.sortBy === "lowest") {
        return a.amount - b.amount || a.date.localeCompare(b.date);
      }
      // Default: newest first
      return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }, [
    transactions,
    datePeriod,
    typeFilter,
    advancedFilters,
    search,
    categoryMap,
    todayStr,
  ]);

  // Group filtered transactions by Date for Day-by-Day Timeline
  const groupedByDate = useMemo(() => {
    const groups: Array<{
      dateStr: string;
      items: Transaction[];
      totalExpense: number;
      totalIncome: number;
    }> = [];

    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }

    // Sort dates according to chosen sort order
    const isOldestSort = advancedFilters.sortBy === "oldest";
    const sortedDates = Array.from(map.keys()).sort((a, b) =>
      isOldestSort ? a.localeCompare(b) : b.localeCompare(a)
    );

    for (const d of sortedDates) {
      const items = map.get(d)!;
      let totalExpense = 0;
      let totalIncome = 0;
      for (const item of items) {
        if (isRealExpense(item)) totalExpense += item.amount;
        else if (isRealIncome(item)) totalIncome += item.amount;
      }
      groups.push({ dateStr: d, items, totalExpense, totalIncome });
    }

    return groups;
  }, [filtered, advancedFilters.sortBy]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    let totalOutflow = 0;
    let totalInflow = 0;

    for (const t of filtered) {
      if (isRealExpense(t)) totalOutflow += t.amount;
      else if (isRealIncome(t)) totalInflow += t.amount;
    }

    return {
      totalOutflow,
      totalInflow,
      count: filtered.length,
    };
  }, [filtered]);

  const spentFormatted = useMemo(
    () => `-${formatMoney(summaryStats.totalOutflow, settings.currency, settings.numberFormat)}`,
    [summaryStats.totalOutflow, settings.currency, settings.numberFormat]
  );

  const incomeFormatted = useMemo(
    () => `+${formatMoney(summaryStats.totalInflow, settings.currency, settings.numberFormat)}`,
    [summaryStats.totalInflow, settings.currency, settings.numberFormat]
  );

  // Dynamic text size based on digit count
  const amountTextSizeClass = useMemo(() => {
    const hasIncome = summaryStats.totalInflow > 0;
    const spentDigits = spentFormatted.length;
    const incomeDigits = hasIncome ? incomeFormatted.length : 0;
    const totalDigits = spentDigits + incomeDigits;
    const maxSingleDigits = Math.max(spentDigits, incomeDigits);

    if (hasIncome) {
      if (totalDigits > 24 || maxSingleDigits > 13) return "text-[10px] sm:text-xs";
      if (totalDigits > 19 || maxSingleDigits > 10) return "text-[11px] sm:text-xs";
      if (totalDigits > 15 || maxSingleDigits > 8) return "text-xs sm:text-sm";
      return "text-xs sm:text-sm";
    } else {
      if (spentDigits > 16) return "text-xs sm:text-sm";
      if (spentDigits > 11) return "text-sm sm:text-base";
      return "text-sm sm:text-base";
    }
  }, [spentFormatted, incomeFormatted, summaryStats.totalInflow]);

  // Handlers
  const handleOpenDetails = (t: Transaction) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile) {
      setMobileDetailTxId(t.id);
    } else {
      setSelectedTransaction(t);
      setIsDetailsModalOpen(true);
    }
  };

  const handleDuplicate = (t: Transaction) => {
    const duplicated = duplicateTransaction(t.id);
    if (duplicated) {
      openAddModal(duplicated.type, duplicated);
      showToast("Transaction copied. Review and save.");
    }
  };

  const handleExecuteDelete = (t: Transaction) => {
    deleteTransaction(t.id);
    const cat = categoryMap.get(t.categoryId);
    const catName = cat?.name || "Transaction";
    const amountStr = formatMoney(t.amount, settings.currency, settings.numberFormat);
    const prefix = t.type === "expense" ? "-" : "+";

    showToast(
      `Deleted ${catName} (${prefix}${amountStr})`,
      "info",
      {
        label: "Undo",
        onClick: () => {
          restoreTransaction(t);
          showToast("Transaction restored", "success");
        },
      },
      6000
    );
  };

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== "string") return "";
    if (dateStr === todayStr) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, "0")}-${yesterday.getDate().toString().padStart(2, "0")}`;
    if (dateStr === yesterdayStr) return "Yesterday";

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}-${tomorrow.getDate().toString().padStart(2, "0")}`;
    if (dateStr === tomorrowStr) return "Tomorrow";

    const parts = dateStr.split("-").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  // Dedicated In-page View for Mobile (Borrow & Lend architecture)
  if (mobileDetailTxId) {
    return (
      <TransactionDetailView
        transactionId={mobileDetailTxId}
        categories={categories}
        settings={settings}
        onBack={() => setMobileDetailTxId(null)}
        onEdit={(tx) => {
          setMobileDetailTxId(null);
          openAddModal(tx.tag === "transfer" ? "transfer" : tx.type, tx);
        }}
        onDuplicate={handleDuplicate}
        onDelete={(tx) => handleExecuteDelete(tx)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Redesigned Premium Filter & Search Card */}
      <div className="space-y-3 bg-[#141414] border border-[#262626] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
        {/* Row 1: Search Bar on top beside it Export CSV Button */}
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-[#1C1C1C] border border-[#262626] rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 focus-within:border-neutral-700 transition">
            <Search className="w-4 h-4 text-[#71717A] shrink-0" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-[#F5F5F5] outline-none placeholder-[#71717A]"
            />
            {search && (
              <button 
                type="button"
                onClick={() => setSearch("")} 
                className="text-[#71717A] hover:text-[#F5F5F5] shrink-0 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#222222] text-[#F5F5F5] border border-[#262626] text-xs font-semibold transition active:scale-95 shrink-0 cursor-pointer"
            title="Export CSV"
            aria-label="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {/* Row 2: Small Pills of All, Expenses, Income, Transfer */}
        <div className="flex items-center p-0.5 sm:p-1 bg-[#1C1C1C] rounded-lg sm:rounded-xl border border-[#262626] w-fit">
          {[
            { id: "all" as QuickTypeFilter, label: "All" },
            { id: "expense" as QuickTypeFilter, label: "Expenses" },
            { id: "income" as QuickTypeFilter, label: "Income" },
            { id: "transfer" as QuickTypeFilter, label: "Transfer" },
          ].map((t) => {
            const isSelected = typeFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer select-none ${
                  isSelected
                    ? t.id === "expense"
                      ? "bg-[#262626] text-rose-400 border border-[#383838]"
                      : t.id === "income"
                      ? "bg-[#262626] text-emerald-400 border border-[#383838]"
                      : t.id === "transfer"
                      ? "bg-[#262626] text-sky-400 border border-[#383838]"
                      : "bg-[#262626] text-[#F5F5F5] border border-[#383838]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Row 3: Select Date Calendar Button & Filter Button */}
        <div className="flex items-center justify-between gap-2 w-full pt-0.5">
          {/* Unified Date Period Dropdown */}
          <DatePeriodDropdown
            value={datePeriod}
            onChange={setDatePeriod}
          />

          {/* Advanced Filter Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-sm select-none ${
              activeFilterCount > 0
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-[#1C1C1C] hover:bg-[#222222] border-[#2D2D2D] hover:border-[#383838] text-[#F5F5F5]"
            }`}
            aria-label="Open advanced filter drawer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 4: Removable Active Filter Chips */}
        <ActiveFilterChips
          filters={advancedFilters}
          onUpdateFilters={setAdvancedFilters}
          onClearAll={() => setAdvancedFilters(DEFAULT_FILTER_STATE)}
          categories={categories}
          currencySymbol={settings.currency || "$"}
        />
      </div>

      {/* 2. Single-Row Responsive Summary Strip */}
      <div className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#141414] border border-[#262626] font-mono-num flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar gap-4 sm:gap-6">
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <span className="text-[10px] sm:text-xs text-[#71717A] shrink-0 font-sans">Spent:</span>
          <span className={`font-bold text-rose-400 font-mono-num whitespace-nowrap ${amountTextSizeClass}`}>
            {spentFormatted}
          </span>
        </div>

        {summaryStats.totalInflow > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="text-[10px] sm:text-xs text-[#71717A] shrink-0 font-sans">Income:</span>
            <span className={`font-bold text-emerald-400 font-mono-num whitespace-nowrap ${amountTextSizeClass}`}>
              {incomeFormatted}
            </span>
          </div>
        )}
      </div>

      {/* 3. Day-by-Day Grouped Timeline */}
      {groupedByDate.length === 0 ? (
        <div className="rounded-2xl bg-[#141414] border border-[#262626] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-[#71717A]">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">No matching transactions found</h3>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Try adjusting your search query, date period, or filter criteria.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {(activeFilterCount > 0 || search || typeFilter !== "all" || datePeriod.type !== "this_month") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setDatePeriod({ type: "this_month" });
                  setAdvancedFilters(DEFAULT_FILTER_STATE);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2D2D2D] text-[#D4D4D8] text-xs font-semibold transition"
              >
                Reset All Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => openAddModal("expense")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log New Expense</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => {
            const isToday = group.dateStr === todayStr;

            return (
              <div key={group.dateStr} className="space-y-1.5">
                {/* Day Header */}
                <div className="flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold font-mono-num ${isToday ? "text-emerald-400" : "text-[#A1A1AA]"}`}>
                      {formatDateHeader(group.dateStr)}
                    </span>
                    <span className="text-[11px] text-[#71717A] font-mono-num hidden sm:inline">
                      · {group.dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono-num text-[11px]">
                    {group.totalExpense > 0 && (
                      <span className="text-rose-400 font-bold">
                        -{formatMoney(group.totalExpense, settings.currency, settings.numberFormat)}
                      </span>
                    )}
                    {group.totalIncome > 0 && (
                      <span className="text-emerald-400 font-bold">
                        +{formatMoney(group.totalIncome, settings.currency, settings.numberFormat)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Transactions Card List */}
                <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#262626] overflow-hidden shadow-sm">
                  {group.items.map((t) => {
                    const cat = categoryMap.get(t.categoryId);
                    const transferOrLoan = isTransferOrLoan(t);
                    const transferLabel = getTransferOrLoanLabel(t);
                    const isExpense = isRealExpense(t);

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleOpenDetails(t)}
                        className="flex items-center justify-between p-3.5 hover:bg-neutral-800/40 transition group cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Category Icon */}
                          <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                            {cat?.icon || "📦"}
                          </div>

                          {/* Category Name on top & Description/Note below */}
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors">
                                {cat?.name || "General"}
                              </span>
                              {transferOrLoan && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold shrink-0 tracking-wide" title={transferLabel || "Transfer"}>
                                  {transferLabel || "Transfer"}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#71717A] truncate mt-0.5">
                              {t.note ? (
                                <span className="text-[#A1A1AA] truncate">
                                  {(() => {
                                    const firstLine = t.note.split("\n")[0].trim();
                                    return firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;
                                  })()}
                                </span>
                              ) : (
                                <span className="text-[#52525B] text-[10px] capitalize">{t.type}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Quick Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {transferOrLoan ? (
                            <span className="text-xs sm:text-sm font-bold font-mono-num text-[#A1A1AA]">
                              {formatMoney(t.amount, settings.currency, settings.numberFormat)}
                            </span>
                          ) : (
                            <span
                              className={`text-xs sm:text-sm font-bold font-mono-num ${
                                isExpense ? "text-[#F5F5F5]" : "text-emerald-400"
                              }`}
                            >
                              {isExpense ? "-" : "+"}
                              {formatMoney(t.amount, settings.currency, settings.numberFormat)}
                            </span>
                          )}

                          {/* Quick Actions on hover */}
                          <div className="hidden sm:flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(t);
                              }}
                              className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddModal(t.tag === "transfer" ? "transfer" : t.type, t);
                              }}
                              className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
                              title="Edit directly"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransactionToDelete(t);
                              }}
                              className="p-1 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                              title="Delete transaction"
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Advanced Filter Drawer */}
      <AdvancedFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={advancedFilters}
        onApply={setAdvancedFilters}
        onReset={() => setAdvancedFilters(DEFAULT_FILTER_STATE)}
        categories={categories}
        currencySymbol={settings.currency || "$"}
      />

      {/* 5. Transaction Details Modal (Opened on click) */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTransaction(null);
        }}
        onEdit={(t) => openAddModal(t.tag === "transfer" ? "transfer" : t.type, t)}
        onDuplicate={handleDuplicate}
        onDelete={(tx) => handleExecuteDelete(tx)}
        settings={settings}
        categories={categories}
      />

      {/* 6. Delete Confirmation Modal (PC view & direct row deletion) */}
      <ConfirmDeleteTransactionModal
        isOpen={!!transactionToDelete}
        transaction={transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete) {
            handleExecuteDelete(transactionToDelete);
          }
        }}
        categoryName={transactionToDelete ? categoryMap.get(transactionToDelete.categoryId)?.name : undefined}
        categoryIcon={transactionToDelete ? categoryMap.get(transactionToDelete.categoryId)?.icon : undefined}
        currency={settings.currency}
        numberFormat={settings.numberFormat}
      />

      {/* 7. Export to CSV Pop-up Window */}
      <ExportCsvModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        categories={categories}
        settings={settings}
        onExportSuccess={(filename, count) => {
          showToast(`Exported ${count} transactions to ${filename}`);
        }}
      />
    </div>
  );
};
