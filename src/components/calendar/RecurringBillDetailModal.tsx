import React, { useState } from "react";
import { RecurringExpense } from "@/types/plan";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { getUpcomingDueDate, formatRelativeDate, getToday, getNextMonth, formatMonthLabel } from "@/utils/dates";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Pause, 
  Play, 
  Trash2, 
  Edit2, 
  Receipt, 
  Bell, 
  FileText,
  AlertCircle,
  Tag,
  ArrowRight,
  Sparkles,
  CalendarCheck
} from "lucide-react";

interface RecurringBillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: RecurringExpense | null;
  category?: Category | null;
  settings: Settings;
  onEdit: (expense: RecurringExpense) => void;
}

export const RecurringBillDetailModal: React.FC<RecurringBillDetailModalProps> = ({
  isOpen,
  onClose,
  expense,
  category,
  settings,
  onEdit,
}) => {
  const toggleRecurringPause = useAppStore((s) => s.toggleRecurringPause);
  const deleteRecurringExpense = useAppStore((s) => s.deleteRecurringExpense);
  const logRecurringAsTransaction = useAppStore((s) => s.logRecurringAsTransaction);
  const transactions = useAppStore((s) => s.transactions);
  const showToast = useUIStore((s) => s.showToast);

  if (!isOpen || !expense) return null;

  const todayStr = getToday();
  const currentMonthKey = todayStr.slice(0, 7);
  const nextMonthKey = getNextMonth(currentMonthKey);
  const nextNextMonthKey = getNextMonth(nextMonthKey);

  // Check if paid this month
  const isPaidThisMonth = Boolean(
    expense.paidDates?.includes(currentMonthKey) || 
    transactions.some(
      (t) => t.type === "expense" && t.date.startsWith(currentMonthKey) && t.categoryId === expense.categoryId && t.amount === expense.amount
    )
  );

  // Check if paid for next month (advance payment)
  const isPaidNextMonth = Boolean(expense.paidDates?.includes(nextMonthKey));

  const upcoming = getUpcomingDueDate(expense, todayStr);

  const handleTogglePause = () => {
    toggleRecurringPause(expense.id);
    showToast(expense.isPaused ? `Resumed "${expense.title}"` : `Paused "${expense.title}"`);
  };

  const handleLogCurrentPayment = () => {
    const tx = logRecurringAsTransaction(expense.id, todayStr, currentMonthKey);
    if (tx) {
      showToast(`Logged "${expense.title}" as paid for ${formatMonthLabel(currentMonthKey)}!`);
    }
  };

  const handleLogAdvancePayment = () => {
    // If next month is already paid, pay for the following cycle
    const targetCycle = isPaidNextMonth ? nextNextMonthKey : nextMonthKey;
    const tx = logRecurringAsTransaction(expense.id, todayStr, targetCycle);
    if (tx) {
      showToast(
        `Paid early! Recorded ${formatMoney(expense.amount, settings.currency, settings.numberFormat)} today for ${formatMonthLabel(targetCycle)}`
      );
    }
  };

  const handleDelete = () => {
    deleteRecurringExpense(expense.id);
    showToast("Recurring bill removed");
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
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

        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-xl shrink-0 shadow-inner">
              {category?.icon || "⚡"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F5F5] truncate">
                  {expense.title}
                </h3>
                {expense.isPaused ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-[#71717A] border border-[#333333] uppercase">
                    Paused
                  </span>
                ) : isPaidNextMonth ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Paid Early ({formatMonthLabel(nextMonthKey)})
                  </span>
                ) : isPaidThisMonth ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Paid This Month
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Due
                  </span>
                )}
              </div>
              <span className="text-xs text-[#71717A]">
                {category?.name || "General"} · {expense.frequency}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Main Financial Hero */}
          <div className="p-4 rounded-2xl bg-[#181818] border border-[#262626] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">
                Bill Amount
              </span>
              <div className="text-2xl font-black font-mono-num text-[#F5F5F5] mt-0.5">
                {formatMoney(expense.amount, settings.currency, settings.numberFormat)}
              </div>
              <span className="text-xs text-[#A1A1AA] capitalize">
                Billed {expense.frequency}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">
                Next Due Date
              </span>
              <div className="text-sm font-bold text-amber-400 font-mono-num mt-1">
                {upcoming.dateStr}
              </div>
              <span className="text-xs text-[#71717A] block">
                {upcoming.label}
              </span>
            </div>
          </div>

          {/* Billing Cycle Status Strip */}
          <div className="p-3 rounded-xl bg-[#1C1C1C] border border-[#262626] space-y-2">
            <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Billing Cycle Status</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                <span className="text-[10px] text-[#71717A] block truncate">
                  Current ({formatMonthLabel(currentMonthKey)})
                </span>
                <span className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${
                  isPaidThisMonth ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {isPaidThisMonth ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {isPaidThisMonth ? "Settled" : "Pending Payment"}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-[#141414] border border-[#262626]">
                <span className="text-[10px] text-[#71717A] block truncate">
                  Next ({formatMonthLabel(nextMonthKey)})
                </span>
                <span className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${
                  isPaidNextMonth ? "text-emerald-400" : "text-[#71717A]"
                }`}>
                  {isPaidNextMonth ? <Sparkles className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {isPaidNextMonth ? "Paid in Advance" : "Upcoming"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Pay Actions Section */}
          {!expense.isPaused && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#1C1C1C] to-[#161616] border border-[#2A2A2A] space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Payment Options
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Pay Current Month */}
                <button
                  onClick={handleLogCurrentPayment}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                    isPaidThisMonth
                      ? "bg-[#181818] border-[#2A2A2A] text-[#A1A1AA] hover:text-[#F5F5F5]"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black border-transparent shadow-md shadow-emerald-950/20"
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>
                    {isPaidThisMonth ? `Re-log ${formatMonthLabel(currentMonthKey)}` : `Pay ${formatMonthLabel(currentMonthKey)}`}
                  </span>
                </button>

                {/* Pay Next Month Early / Advance */}
                <button
                  onClick={handleLogAdvancePayment}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                  title="Pay next cycle in advance"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>
                    Pay {formatMonthLabel(isPaidNextMonth ? nextNextMonthKey : nextMonthKey)} Early
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-[#71717A] leading-relaxed">
                Paying early records the expense transaction today while marking next month&apos;s cycle as settled in advance.
              </p>
            </div>
          )}

          {/* Manage Actions */}
          <div className="space-y-2 pt-1">
            <h4 className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
              Manage Subscription Actions
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {/* Pause / Resume Button */}
              <button
                onClick={handleTogglePause}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  expense.isPaused
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                    : "bg-[#1C1C1C] border-[#262626] text-[#F5F5F5] hover:bg-[#252525]"
                }`}
              >
                {expense.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              {/* Edit Details */}
              <button
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#262626] text-[#F5F5F5] text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit</span>
              </button>

              {/* Delete Bill */}
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#222222] hover:bg-[#282828] text-[#F5F5F5] font-semibold text-xs border border-[#333333] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
