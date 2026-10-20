import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { parseMoneyInput, minorUnitsToInputString, formatMoney } from "@/utils/currency";
import { BudgetDuration, CategoryBudget } from "@/types/plan";
import { X, Target, Check, AlertCircle } from "lucide-react";

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editBudget?: CategoryBudget | null;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ 
  isOpen, 
  onClose,
  editBudget 
}) => {
  const categories = useAppStore((s) => s.categories);
  const categoryBudgets = useAppStore((s) => s.categoryBudgets || []);
  const addCategoryBudget = useAppStore((s) => s.addCategoryBudget);
  const updateCategoryBudget = useAppStore((s) => s.updateCategoryBudget);
  const settings = useAppStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  // Stable memoized expense categories
  const expenseCategories = useMemo(() => {
    const list = categories.filter((c) => c.type === "expense" || c.type === "both");
    return list.length > 0 ? list : categories;
  }, [categories]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [duration, setDuration] = useState<BudgetDuration>("monthly");
  const [amountStr, setAmountStr] = useState<string>("");
  const [error, setError] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Only initialize/reset form when modal opens or edit target changes
  useEffect(() => {
    if (isOpen) {
      if (editBudget) {
        setCategoryId(editBudget.categoryId);
        setDuration(editBudget.duration);
        setAmountStr(minorUnitsToInputString(editBudget.amount));
      } else {
        const defaultCatId = expenseCategories[0]?.id || "";
        setCategoryId(defaultCatId);
        setDuration("monthly");
        setAmountStr("");
      }
      setError("");

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, editBudget?.id, onClose, editBudget, expenseCategories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (amount <= 0) {
      setError("Please enter a valid budget amount greater than 0");
      inputRef.current?.focus();
      return;
    }

    if (editBudget) {
      // Check if duplicate for a different budget
      const existing = categoryBudgets.find(
        (b) => b.id !== editBudget.id && b.categoryId === categoryId && b.duration === duration
      );

      if (existing) {
        setError(`A ${duration} budget already exists for this category.`);
        return;
      }

      updateCategoryBudget(editBudget.id, {
        categoryId,
        duration,
        amount,
      });
      showToast("Category budget updated successfully");
    } else {
      // Check if budget already exists for this category and duration
      const existing = categoryBudgets.find(
        (b) => b.categoryId === categoryId && b.duration === duration
      );

      if (existing) {
        setError(`A ${duration} budget already exists for this category.`);
        return;
      }

      addCategoryBudget({
        categoryId,
        duration,
        amount,
      });
      showToast("Category budget allotted successfully");
    }

    onClose();
  };

  const selectedCategory = expenseCategories.find((c) => c.id === categoryId);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4.5 px-5 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {editBudget ? "Edit Category Budget" : "Allot Category Budget"}
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Set spending ceiling for a specific category
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* 1. Category Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
                Category
              </label>
              {selectedCategory && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  Selected: {selectedCategory.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {expenseCategories.map((c) => {
                const isSelected = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(c.id);
                      if (error) setError("");
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
                      isSelected
                        ? "bg-neutral-800 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/40"
                        : "bg-[#1C1C1C] border-[#262626] text-[#A1A1AA] hover:text-white hover:bg-neutral-800/50"
                    }`}
                  >
                    <span className="text-xl shrink-0">{c.icon}</span>
                    <span className="truncate text-xs font-semibold">{c.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 absolute right-2 top-2.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Duration Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
              Budget Period / Duration
            </label>
            <div className="flex p-1 bg-[#1C1C1C] rounded-xl border border-[#262626]">
              {(["weekly", "monthly", "yearly"] as BudgetDuration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    if (error) setError("");
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                    duration === d
                      ? "bg-[#262626] text-emerald-400 border border-[#383838] shadow-sm"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Budget Limit Amount */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
              Budget Limit Amount ({duration})
            </label>
            <div className="flex items-center gap-2.5 bg-[#1C1C1C] border border-[#262626] rounded-xl p-3.5 focus-within:border-emerald-500/60 transition">
              <span className="text-xl font-bold text-[#71717A] font-mono-num select-none">
                {settings.currency}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                placeholder={duration === "weekly" ? "2000" : duration === "yearly" ? "60000" : "10000"}
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (error) setError("");
                }}
                className="w-full bg-transparent text-2xl font-bold text-[#F5F5F5] outline-none font-mono-num placeholder-[#71717A]"
                autoComplete="off"
              />
              {amountStr && (
                <button
                  type="button"
                  onClick={() => {
                    setAmountStr("");
                    if (error) setError("");
                    inputRef.current?.focus();
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                  title="Clear amount"
                  aria-label="Clear amount"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Quick amount suggestion chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
              {[2000, 5000, 10000, 20000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => {
                    setAmountStr(quick.toString());
                    if (error) setError("");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#222222] border border-[#262626] text-[11px] font-mono-num text-[#A1A1AA] hover:text-white transition"
                >
                  +{quick.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-[0.99] shadow-md shadow-emerald-950/20"
            >
              {editBudget ? "Update Category Budget" : "Set Category Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
