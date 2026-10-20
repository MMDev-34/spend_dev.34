import React, { useMemo, useState, useEffect } from "react";
import { CategoryBudget } from "@/types/plan";
import { Category } from "@/types/category";
import { Transaction } from "@/types/transaction";
import { Settings } from "@/types/settings";
import { CategoryBudgetProgress } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { formatRelativeDate } from "@/utils/dates";
import { useUIStore } from "@/stores/uiStore";
import { useAppStore } from "@/stores/appStore";
import { 
  X, 
  Plus, 
  TrendingDown, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Trash2,
  Edit2
} from "lucide-react";

interface CategoryBudgetDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: CategoryBudget | null;
  category: Category | null;
  progress: CategoryBudgetProgress | null;
  settings: Settings;
  onEditBudget: (budget: CategoryBudget) => void;
}

export const CategoryBudgetDrilldownModal: React.FC<CategoryBudgetDrilldownModalProps> = ({
  isOpen,
  onClose,
  budget,
  category,
  progress,
  settings,
  onEditBudget,
}) => {
  const transactions = useAppStore((s) => s.transactions);
  const deleteCategoryBudget = useAppStore((s) => s.deleteCategoryBudget);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Filter transactions for this specific category in the budget period
  const categoryTransactions = useMemo(() => {
    if (!budget || !category) return [];

    let result = transactions.filter(
      (t) => t.type === "expense" && t.categoryId === category.id
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (budget.duration === "weekly") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
      result = result.filter((t) => t.date >= oneWeekAgoStr);
    } else if (budget.duration === "yearly") {
      result = result.filter((t) => t.date.startsWith(`${currentYear}`));
    } else {
      // Monthly
      const prefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(prefix));
    }

    return result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, budget, category]);

  if (!isOpen || !budget || !category || !progress) return null;

  const handleDeleteBudget = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    deleteCategoryBudget(budget.id);
    showToast(`${category.name} budget removed`);
    onClose();
  };

  const getStatusBadge = () => {
    if (progress.isOverBudget) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3 h-3 stroke-[2.5]" /> Over Budget
        </span>
      );
    }
    if (progress.percentage >= 90) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="w-3 h-3" /> Critical (90%+)
        </span>
      );
    }
    if (progress.percentage >= 70) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" /> Caution (70%+)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> On Track
      </span>
    );
  };

  const getProgressBarColor = () => {
    if (progress.isOverBudget) return "bg-rose-500";
    if (progress.percentage >= 90) return "bg-rose-400";
    if (progress.percentage >= 70) return "bg-amber-400";
    return "bg-emerald-400";
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#141414] border-t sm:border border-[#262626] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-[#262626] rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-5 pb-4 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-xl shrink-0 shadow-inner">
              {category.icon || "📦"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  {category.name} Budget
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                {progress.periodLabel} · {budget.duration} limit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Progress & Financial Snapshot */}
          <div className="p-4 rounded-2xl bg-[#181818]/40 border border-[#262626] space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
                  Spent
                </span>
                <div className="text-base font-black font-mono-num text-[#F5F5F5]">
                  {formatMoney(progress.spent, settings.currency, settings.numberFormat)}
                </div>
              </div>

              <div className="space-y-0.5 border-x border-[#262626]">
                <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
                  Budget
                </span>
                <div className="text-base font-black font-mono-num text-[#A1A1AA]">
                  {formatMoney(budget.amount, settings.currency, settings.numberFormat)}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider">
                  {progress.isOverBudget ? "Over by" : "Remaining"}
                </span>
                <div className={`text-base font-black font-mono-num ${
                  progress.isOverBudget ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {progress.isOverBudget ? "-" : ""}
                  {formatMoney(Math.abs(progress.remaining), settings.currency, settings.numberFormat)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-[#262626] h-2.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                  style={{ width: `${Math.min(100, Math.max(3, progress.percentage))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono-num text-[#71717A]">
                <span>{progress.percentage}% utilized</span>
                <span>{formatMoney(progress.spent, settings.currency, settings.numberFormat)} of {formatMoney(budget.amount, settings.currency, settings.numberFormat)}</span>
              </div>
            </div>
          </div>

          {/* Transactions in this budget period */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                Expenses in {progress.periodLabel} ({categoryTransactions.length})
              </h4>

              <button
                onClick={() => {
                  onClose();
                  openAddModal("expense", { categoryId: category.id });
                }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            {categoryTransactions.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#181818]/30 border border-[#262626] space-y-2">
                <p className="text-xs text-[#71717A]">
                  No expenses logged under <strong className="text-[#F5F5F5]">{category.name}</strong> for this period yet.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    openAddModal("expense", { categoryId: category.id });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#F5F5F5] border border-[#333333] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log First Expense</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-[#181818]/30 border border-[#262626] divide-y divide-[#262626] overflow-hidden">
                {categoryTransactions.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose();
                      openAddModal("expense", t);
                    }}
                    className="p-3 flex items-center justify-between hover:bg-neutral-800/40 transition cursor-pointer text-xs group"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="font-semibold text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors">
                        {t.note || category.name}
                      </div>
                      <div className="text-[11px] text-[#71717A] flex items-center gap-1.5">
                        <span>{formatRelativeDate(t.date)}</span>
                        <span>·</span>
                        <span className="font-mono-num">{t.date}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold font-mono-num text-[#F5F5F5] text-xs sm:text-sm">
                        -{formatMoney(t.amount, settings.currency, settings.numberFormat)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDeleteBudget}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-rose-950/30"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm Remove</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#262626] text-[#A1A1AA] hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteBudget}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-rose-500/10 border border-[#262626] hover:border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
              title="Delete Category Budget"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEditBudget(budget);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#333333] text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Limit</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
