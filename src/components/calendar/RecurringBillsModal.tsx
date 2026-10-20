import React, { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { RecurringExpense } from "@/types/plan";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { getToday, getUpcomingDueDate } from "@/utils/dates";
import { RecurringBillDetailModal } from "./RecurringBillDetailModal";
import { 
  X, 
  Plus, 
  Repeat, 
  Search,
  CheckCircle2,
  Check,
  Clock,
  ChevronRight
} from "lucide-react";

interface RecurringBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onAddNew: () => void;
  onEdit: (expense: RecurringExpense) => void;
}

type FilterStatus = "all" | "unpaid" | "paid" | "paused";

export const RecurringBillsModal: React.FC<RecurringBillsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onAddNew,
  onEdit,
}) => {
  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const updateRecurringExpense = useAppStore((s) => s.updateRecurringExpense);
  const logRecurringAsTransaction = useAppStore((s) => s.logRecurringAsTransaction);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const showToast = useUIStore((s) => s.showToast);

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const todayStr = useMemo(() => getToday(), []);
  const currentMonthKey = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Aggregate bills with upcoming dates and paid status
  const billsList = useMemo(() => {
    return recurringExpenses.map((rec) => {
      const isPaidThisMonth = rec.paidDates?.includes(currentMonthKey) || 
        transactions.some(
          (t) => t.type === "expense" && t.date.startsWith(currentMonthKey) && t.categoryId === rec.categoryId && t.amount === rec.amount
        );

      const upcoming = getUpcomingDueDate(rec, todayStr);

      return {
        rec,
        category: categoryMap.get(rec.categoryId),
        isPaidThisMonth,
        upcoming,
      };
    });
  }, [recurringExpenses, currentMonthKey, transactions, categoryMap, todayStr]);

  // Filtered list
  const filteredList = useMemo(() => {
    return billsList.filter(({ rec, isPaidThisMonth }) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = rec.title.toLowerCase().includes(q);
        const matchesNotes = rec.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes) return false;
      }

      if (filter === "paused") return rec.isPaused;
      if (filter === "paid") return !rec.isPaused && isPaidThisMonth;
      if (filter === "unpaid") return !rec.isPaused && !isPaidThisMonth;
      return true;
    });
  }, [billsList, filter, searchQuery]);

  // Financial Summary
  const summary = useMemo(() => {
    const activeBills = billsList.filter((b) => !b.rec.isPaused);
    const totalCommitted = activeBills.reduce((sum, b) => sum + b.rec.amount, 0);
    const totalPaid = activeBills.filter((b) => b.isPaidThisMonth).reduce((sum, b) => sum + b.rec.amount, 0);
    const totalRemaining = Math.max(0, totalCommitted - totalPaid);

    return {
      totalCommitted,
      totalPaid,
      totalRemaining,
    };
  }, [billsList]);

  if (!isOpen) return null;

  // Toggle paid status for current month
  const handleTogglePaid = (e: React.MouseEvent, rec: RecurringExpense, isPaid: boolean) => {
    e.stopPropagation();

    if (isPaid) {
      // Remove from paidDates
      const updatedDates = (rec.paidDates || []).filter((d) => d !== currentMonthKey);
      updateRecurringExpense(rec.id, { paidDates: updatedDates });
      showToast(`Marked "${rec.title}" as unpaid`);
    } else {
      // Add to paidDates
      const currentDates = rec.paidDates || [];
      const updatedDates = currentDates.includes(currentMonthKey) ? currentDates : [...currentDates, currentMonthKey];
      updateRecurringExpense(rec.id, { paidDates: updatedDates });
      logRecurringAsTransaction(rec.id, todayStr, currentMonthKey);
      showToast(`Marked "${rec.title}" as paid & logged expense!`);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#141414] border-t sm:border border-[#262626] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Pull Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div className="w-8 h-1 bg-[#262626] rounded-full" />
          </div>

          {/* Minimal Header */}
          <div className="p-4 px-5 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Repeat className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5]">
                  Recurring Bills & Subscriptions
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  {recurringExpenses.length} recurring {recurringExpenses.length === 1 ? "bill" : "bills"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onAddNew();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Add Bill</span>
              </button>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compact Monthly Summary Strip */}
          <div className="grid grid-cols-3 divide-x divide-[#262626] border-b border-[#262626] bg-[#181818]/40 text-center py-2.5 px-3">
            <div>
              <span className="text-[10px] text-[#71717A] block font-medium uppercase">Active Total</span>
              <span className="text-xs font-bold text-purple-400 font-mono-num">
                {formatMoney(summary.totalCommitted, settings.currency, settings.numberFormat)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#71717A] block font-medium uppercase">Paid This Month</span>
              <span className="text-xs font-bold text-emerald-400 font-mono-num">
                {formatMoney(summary.totalPaid, settings.currency, settings.numberFormat)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#71717A] block font-medium uppercase">Remaining</span>
              <span className="text-xs font-bold text-[#F5F5F5] font-mono-num">
                {formatMoney(summary.totalRemaining, settings.currency, settings.numberFormat)}
              </span>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="p-2.5 px-4 border-b border-[#262626] flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <div className="flex items-center gap-1 p-0.5 bg-[#1C1C1C] rounded-lg border border-[#262626]">
              {(["all", "unpaid", "paid", "paused"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize transition cursor-pointer ${
                    filter === f
                      ? "bg-[#262626] text-[#F5F5F5] border border-[#383838]"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#262626] rounded-lg px-2 py-1 max-w-[130px] sm:max-w-[170px]">
              <Search className="w-3 h-3 text-[#71717A] shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] text-[#F5F5F5] outline-none placeholder-[#71717A]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#71717A] hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Clean Minimal Bills List (No button clutter!) */}
          <div className="p-3 sm:p-4 space-y-2 overflow-y-auto flex-1 text-xs">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#181818]/30 border border-[#262626] space-y-2">
                <p className="text-xs text-[#71717A]">No recurring bills found.</p>
                <button
                  onClick={() => {
                    onClose();
                    onAddNew();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add First Bill</span>
                </button>
              </div>
            ) : (
              filteredList.map(({ rec, category, isPaidThisMonth, upcoming }) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedExpense(rec)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group select-none ${
                    rec.isPaused
                      ? "bg-[#181818]/30 border-[#262626]/50 opacity-60"
                      : isPaidThisMonth
                      ? "bg-emerald-950/10 border-emerald-500/25 hover:border-emerald-500/40"
                      : "bg-[#181818] border-[#262626] hover:border-[#383838] hover:bg-[#1B1B1B]"
                  }`}
                >
                  {/* Left: Checkbox + Icon + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* One Tick / Check Option to Mark Paid */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePaid(e, rec, isPaidThisMonth)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 cursor-pointer active:scale-90 ${
                        isPaidThisMonth
                          ? "bg-emerald-500 border-emerald-400 text-black shadow-sm shadow-emerald-950/40"
                          : "bg-[#141414] border-[#383838] text-transparent hover:border-emerald-500/60"
                      }`}
                      title={isPaidThisMonth ? "Click to mark as unpaid" : "Click to mark as paid for this month"}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[3] ${isPaidThisMonth ? "text-black" : "opacity-0"}`} />
                    </button>

                    {/* Category Icon */}
                    <div className="w-8 h-8 rounded-xl bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                      {category?.icon || "⚡"}
                    </div>

                    {/* Bill Info: Name, Frequency, Upcoming Date to Pay */}
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-xs sm:text-sm truncate transition-colors ${
                          isPaidThisMonth ? "line-through text-[#A1A1AA]" : "text-[#F5F5F5] group-hover:text-purple-300"
                        }`}>
                          {rec.title}
                        </span>

                        {rec.isPaused && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-[#71717A] uppercase">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] flex items-center gap-1.5 text-[#71717A] mt-0.5">
                        <span className="capitalize font-medium text-[#A1A1AA]">{rec.frequency}</span>
                        <span>·</span>
                        <span className={upcoming.isDueToday ? "text-rose-400 font-bold" : upcoming.daysLeft <= 3 ? "text-amber-400 font-medium" : "text-[#71717A]"}>
                          {upcoming.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Detail Chevron */}
                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <div>
                      <span className="font-bold font-mono-num text-xs sm:text-sm text-purple-400 block">
                        {formatMoney(rec.amount, settings.currency, settings.numberFormat)}
                      </span>
                      {isPaidThisMonth && (
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          Paid
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#F5F5F5] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 px-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#71717A]">
              Tap any bill to view full details & manage
            </span>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#222222] hover:bg-[#282828] text-[#F5F5F5] font-semibold text-xs border border-[#333333] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Bill Detail Modal (Opened on click) */}
      <RecurringBillDetailModal
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        category={selectedExpense ? categoryMap.get(selectedExpense.categoryId) : undefined}
        settings={settings}
        onEdit={(exp) => {
          setSelectedExpense(null);
          onClose();
          onEdit(exp);
        }}
      />
    </>
  );
};
