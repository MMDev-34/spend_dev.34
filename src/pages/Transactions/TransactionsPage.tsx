import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { Transaction, TransactionType } from "@/types/transaction";
import { TransactionDetailsModal } from "@/components/transaction/TransactionDetailsModal";
import { ExportCsvModal } from "@/components/transaction/ExportCsvModal";
import { ConfirmDeleteTransactionModal } from "@/components/transaction/ConfirmDeleteTransactionModal";
import { 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Edit2, 
  Download, 
  X,
  FileSpreadsheet,
  CalendarClock
} from "lucide-react";

type ScopeType = "month" | "last_month" | "all" | "custom";
type TypeFilterType = "all" | "expense" | "income";

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

  // Minimal filters state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all");
  const [scope, setScope] = useState<ScopeType>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Auto-filter by clicked peak expense day from Overview
  useEffect(() => {
    if (activityDateFilter) {
      setScope("custom");
      setCustomStartDate(activityDateFilter);
      setCustomEndDate(activityDateFilter);
      setActivityDateFilter(null);
    }
  }, [activityDateFilter, setActivityDateFilter]);

  // Modals state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
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
          setScope("all");
        }
        setSelectedTransaction(target);
        setIsDetailsModalOpen(true);
      }
      setFocusedTransactionId(null);
    }
  }, [focusedTransactionId, transactions, setFocusedTransactionId]);

  // Filter & sort calculation (always sorted newest first)
  const filtered = useMemo(() => {
    let result = [...transactions];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // 1. Date Scope Filter
    if (scope === "month") {
      const currentMonthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(currentMonthPrefix));
    } else if (scope === "last_month") {
      const prevMonth = currentMonth === 0 ? 12 : currentMonth;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthPrefix = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(prevMonthPrefix));
    } else if (scope === "custom") {
      if (customStartDate) {
        result = result.filter((t) => t.date >= customStartDate);
      }
      if (customEndDate) {
        result = result.filter((t) => t.date <= customEndDate);
      }
    }
    // If scope === "all", keep all dates without filtering

    // 2. Type Filter (Expense / Income)
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // 3. Category Filter
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.categoryId === selectedCategory);
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

    // Sort newest first
    result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    return result;
  }, [
    transactions,
    scope,
    customStartDate,
    customEndDate,
    typeFilter,
    selectedCategory,
    search,
    categoryMap,
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

    // Sort dates descending
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const d of sortedDates) {
      const items = map.get(d)!;
      let totalExpense = 0;
      let totalIncome = 0;
      for (const item of items) {
        if (item.type === "expense") totalExpense += item.amount;
        else totalIncome += item.amount;
      }
      groups.push({ dateStr: d, items, totalExpense, totalIncome });
    }

    return groups;
  }, [filtered]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    let totalOutflow = 0;
    let totalInflow = 0;

    for (const t of filtered) {
      if (t.type === "expense") totalOutflow += t.amount;
      else totalInflow += t.amount;
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

  // Dynamic text size based on character / digit count so numbers never wrap into below line
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
    setSelectedTransaction(t);
    setIsDetailsModalOpen(true);
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Minimal Clean Search & Action Bar */}
      <div className="space-y-2.5 sm:space-y-3 bg-[#141414] border border-[#262626] rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-sm">
        {/* Row 1: Search Input & Export to CSV Modal Trigger */}
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
                onClick={() => setSearch("")} 
                className="text-[#71717A] hover:text-[#F5F5F5] shrink-0 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#222222] text-[#F5F5F5] border border-[#262626] text-xs font-semibold transition active:scale-95 shrink-0 cursor-pointer"
            title="Export CSV"
            aria-label="Export to CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {/* Row 2: Type Filter Pills & Category Dropdown */}
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          {/* Type Segmented Switcher */}
          <div className="flex items-center p-0.5 sm:p-1 bg-[#1C1C1C] rounded-lg sm:rounded-xl border border-[#262626] shrink-0">
            {[
              { id: "all", label: "All" },
              { id: "expense", label: "Expenses" },
              { id: "income", label: "Income" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as TypeFilterType)}
                className={`px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  typeFilter === t.id
                    ? t.id === "expense"
                      ? "bg-[#262626] text-rose-400 border border-[#383838]"
                      : t.id === "income"
                      ? "bg-[#262626] text-emerald-400 border border-[#383838]"
                      : "bg-[#262626] text-[#F5F5F5] border border-[#383838]"
                    : "text-[#71717A] hover:text-[#F5F5F5]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown Menu */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1C1C1C] border border-[#262626] text-[11px] sm:text-xs text-[#F5F5F5] rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 outline-none font-medium focus:border-neutral-700 cursor-pointer max-w-[125px] xs:max-w-[150px] sm:max-w-[200px] truncate shrink-0"
            aria-label="Filter by category"
          >
            <option value="all">📦 All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Date Scope */}
        <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-[#1C1C1C] rounded-lg sm:rounded-xl border border-[#262626] w-full overflow-x-auto">
          {[
            { id: "month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "all", label: "All Time" },
            { id: "custom", label: "Custom" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id as ScopeType)}
              className={`flex-1 sm:flex-initial px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition whitespace-nowrap text-center cursor-pointer ${
                scope === s.id
                  ? "bg-[#262626] text-cyan-300 border border-[#383838]"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Row (Only when scope === "custom") */}
        {scope === "custom" && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#1C1C1C] border border-[#262626] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs animate-in fade-in">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[#71717A] text-[11px]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#141414] border border-[#262626] text-[#F5F5F5] rounded-lg px-2 py-1 outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#71717A] text-[11px]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#141414] border border-[#262626] text-[#F5F5F5] rounded-lg px-2 py-1 outline-none text-xs"
                />
              </div>
            </div>

            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="text-xs text-rose-400 hover:underline self-end sm:self-auto cursor-pointer"
              >
                Clear Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Minimal, Single-Row Responsive Summary Strip */}
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
              Try adjusting your search query, date filter, or category dropdown.
            </p>
          </div>
          <div className="pt-2">
            <button
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
                    const isExpense = t.type === "expense";

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
                              {t.tag === "transfer" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold shrink-0 tracking-wide" title="Transfer / Lent to Contact">
                                  Transfer
                                </span>
                              )}
                              {t.isUnwanted && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold shrink-0" title="Unwanted / Impulse Spend">
                                  Unwanted
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#71717A] flex items-center gap-1.5 truncate mt-0.5">
                              {t.note ? (
                                <>
                                  <span className="truncate text-[#A1A1AA]">{t.note}</span>
                                  {t.paymentMethod && <span className="text-[#52525B]">·</span>}
                                </>
                              ) : null}
                              {t.paymentMethod && (
                                <span className="capitalize shrink-0">{t.paymentMethod}</span>
                              )}
                              {!t.note && !t.paymentMethod && (
                                <span className="text-[#52525B] text-[10px] capitalize">{t.type}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Quick Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-bold font-mono-num ${
                              isExpense ? "text-[#F5F5F5]" : "text-emerald-400"
                            }`}
                          >
                            {isExpense ? "-" : "+"}
                            {formatMoney(t.amount, settings.currency, settings.numberFormat)}
                          </span>

                          {/* Quick Actions on hover */}
                          <div className="hidden sm:flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
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

      {/* 4. Transaction Details Modal (Opened on click) */}
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

      {/* 5. Delete Confirmation Modal (PC view & direct row deletion) */}
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

      {/* 5. Export to CSV Pop-up Window */}
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
