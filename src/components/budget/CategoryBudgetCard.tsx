import React, { useState } from "react";
import { CategoryBudget } from "@/types/plan";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney, parseMoneyInput, minorUnitsToInputString } from "@/utils/currency";
import { CategoryBudgetProgress } from "@/utils/calculations";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  Trash2, 
  Edit2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Flame, 
  X
} from "lucide-react";

interface CategoryBudgetCardProps {
  budget: CategoryBudget;
  category: Category;
  progress: CategoryBudgetProgress;
  settings: Settings;
  onOpenDrilldown?: () => void;
}

export const CategoryBudgetCard: React.FC<CategoryBudgetCardProps> = ({
  budget,
  category,
  progress,
  settings,
  onOpenDrilldown,
}) => {
  const updateCategoryBudget = useAppStore((s) => s.updateCategoryBudget);
  const deleteCategoryBudget = useAppStore((s) => s.deleteCategoryBudget);
  const showToast = useUIStore((s) => s.showToast);

  const [isEditing, setIsEditing] = useState(false);
  const [editAmountStr, setEditAmountStr] = useState(minorUnitsToInputString(budget.amount));
  const [editDuration, setEditDuration] = useState(budget.duration);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseMoneyInput(editAmountStr);
    if (newAmount <= 0) {
      showToast("Please enter an amount greater than 0", "error");
      return;
    }

    updateCategoryBudget(budget.id, {
      amount: newAmount,
      duration: editDuration,
    });
    setIsEditing(false);
    showToast("Category budget updated");
  };

  const threshold = settings.budgetAlertThreshold ?? 80;

  const getStatusBadge = () => {
    if (progress.isOverBudget) {
      return (
        <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
          <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" /> Over ({progress.percentage}%)
        </span>
      );
    }
    if (progress.percentage >= 100) {
      return (
        <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
          <AlertTriangle className="w-2.5 h-2.5" /> Limit Reached ({progress.percentage}%)
        </span>
      );
    }
    if (progress.percentage >= threshold) {
      return (
        <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
          <Flame className="w-2.5 h-2.5" /> Warning ({progress.percentage}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
        <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" /> On Track ({progress.percentage}%)
      </span>
    );
  };

  const getProgressBarGradient = () => {
    if (progress.isOverBudget) return "bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 shadow-sm shadow-rose-500/50 animate-pulse";
    if (progress.percentage >= 100) return "bg-gradient-to-r from-orange-500 to-rose-400 shadow-sm shadow-orange-500/40";
    if (progress.percentage >= threshold) return "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm shadow-amber-500/40";
    return "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/40";
  };

  return (
    <div 
      onClick={() => {
        if (!isEditing && onOpenDrilldown) onOpenDrilldown();
      }}
      className="rounded-2xl bg-[#141414] border border-[#242424] p-4 sm:p-5 space-y-3.5 shadow-sm hover:border-[#383838] hover:shadow-lg hover:shadow-black/60 transition-all cursor-pointer group select-none relative"
    >
      {/* 1. Header: Icon, Category Name, Duration, Period & Right Corner Action Controls */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1A1A1A] border border-[#282828] flex items-center justify-center text-lg sm:text-xl shrink-0 group-hover:scale-105 group-hover:border-emerald-500/40 transition-all shadow-inner">
            {category.icon || "📦"}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#F5F5F5] group-hover:text-emerald-400 transition-colors truncate">
                {category.name}
              </h3>
              <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#1C1C1C] text-[#A1A1AA] border border-[#2E2E2E] shrink-0 font-mono-num">
                {budget.duration}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs text-[#71717A] block truncate mt-0.5 font-medium">
              {progress.periodLabel}
            </span>
          </div>
        </div>

        {/* Right-most Corner: Edit & Delete buttons aligned with Category Name, with small status badge fitted directly below */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#252525] bg-[#1A1A1A] border border-[#2A2A2A] transition-all cursor-pointer active:scale-95"
              aria-label="Edit budget"
              title="Edit budget limit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                deleteCategoryBudget(budget.id);
                showToast("Budget limit removed");
              }}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-[#252525] bg-[#1A1A1A] border border-[#2A2A2A] transition-all cursor-pointer active:scale-95"
              aria-label="Delete budget"
              title="Delete budget limit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Small status badge fitted below the buttons */}
          {getStatusBadge()}
        </div>
      </div>

      {/* 2. Inline Quick Edit Form */}
      {isEditing ? (
        <form 
          onSubmit={handleSaveEdit} 
          onClick={(e) => e.stopPropagation()}
          className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] flex flex-wrap sm:flex-nowrap items-center gap-2.5 text-xs animate-in fade-in"
        >
          <div className="flex-1 min-w-[140px] flex items-center gap-1.5 bg-[#141414] border border-[#2E2E2E] rounded-xl px-3 py-2">
            <span className="text-xs text-[#71717A] font-mono-num font-bold">{settings.currency}</span>
            <input
              type="text"
              inputMode="decimal"
              value={editAmountStr}
              onChange={(e) => setEditAmountStr(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-[#F5F5F5] outline-none font-mono-num font-bold"
              autoFocus
            />
          </div>

          <select
            value={editDuration}
            onChange={(e: any) => setEditDuration(e.target.value)}
            className="bg-[#141414] border border-[#2E2E2E] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none font-semibold cursor-pointer"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2 text-[#71717A] hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* 3. Enhanced Progress Bar Section with Micro-labels */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className={`font-semibold ${progress.isOverBudget ? "text-rose-400" : "text-[#A1A1AA]"}`}>
                {progress.percentage}% utilized
              </span>
              <span className="font-mono-num text-[#71717A]">
                {formatMoney(progress.spent, settings.currency, settings.numberFormat)} / {formatMoney(budget.amount, settings.currency, settings.numberFormat)}
              </span>
            </div>

            {/* Glowing Track & Fill */}
            <div className="w-full bg-[#181818] h-2.5 sm:h-3 rounded-full p-0.5 overflow-hidden border border-[#282828] shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 relative ${getProgressBarGradient()}`}
                style={{ width: `${Math.min(100, Math.max(4, progress.percentage))}%` }}
              />
            </div>
          </div>

          {/* 4. Responsive 3-Metric Boxes - Polished dark cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs font-mono-num pt-1">
            {/* Box 1: Spent Money */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818]/90 border border-[#242424] hover:border-[#333333] transition-colors min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80 shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-[#71717A] uppercase font-semibold tracking-wider truncate">
                  Spent
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
                {formatMoney(progress.spent, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Box 2: Budget Limit */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818]/90 border border-[#242424] hover:border-[#333333] transition-colors min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400/80 shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-[#71717A] uppercase font-semibold tracking-wider truncate">
                  Budget
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#A1A1AA] truncate">
                {formatMoney(budget.amount, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Box 3: Remaining Balance */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818]/90 border border-[#242424] hover:border-[#333333] transition-colors min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${progress.isOverBudget ? "bg-rose-400" : "bg-emerald-400"}`} />
                <span className="text-[9.5px] sm:text-[10px] text-[#71717A] uppercase font-semibold tracking-wider truncate">
                  {progress.isOverBudget ? "Over By" : "Remaining"}
                </span>
              </div>
              <div
                className={`text-xs sm:text-sm font-bold truncate ${
                  progress.isOverBudget ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {progress.isOverBudget ? "-" : ""}
                {formatMoney(Math.abs(progress.remaining), settings.currency, settings.numberFormat)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
