import React, { useState, useEffect, useMemo } from "react";
import { Category } from "@/types/category";
import { 
  X, 
  RotateCcw, 
  SlidersHorizontal, 
  Check, 
  Search, 
  CreditCard, 
  Tag, 
  ArrowUpDown, 
  AlertTriangle, 
  ArrowLeftRight 
} from "lucide-react";

export type SortOption = "newest" | "oldest" | "highest" | "lowest";
export type SpendingFlagOption = "all" | "unwanted_only";
export type TransferFilterOption = "include" | "exclude" | "only";

export interface AdvancedFilterState {
  categoryIds: string[];
  paymentMethods: string[];
  minAmount: string;
  maxAmount: string;
  spendingFlag: SpendingFlagOption;
  transferOption: TransferFilterOption;
  sortBy: SortOption;
}

export const DEFAULT_FILTER_STATE: AdvancedFilterState = {
  categoryIds: [],
  paymentMethods: [],
  minAmount: "",
  maxAmount: "",
  spendingFlag: "all",
  transferOption: "include",
  sortBy: "newest",
};

interface AdvancedFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onApply: (newFilters: AdvancedFilterState) => void;
  onReset: () => void;
  categories: Category[];
  currencySymbol: string;
}

const AVAILABLE_PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "bank", label: "Bank" },
  { id: "other", label: "Other" },
];

export const AdvancedFilterDrawer: React.FC<AdvancedFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  categories,
  currencySymbol,
}) => {
  // Local buffered form state
  const [draft, setDraft] = useState<AdvancedFilterState>(filters);
  const [categorySearch, setCategorySearch] = useState("");

  // Sync draft whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
      setCategorySearch("");
    }
  }, [isOpen, filters]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Toggle category in/out
  const handleToggleCategory = (catId: string) => {
    setDraft((prev) => {
      const exists = prev.categoryIds.includes(catId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== catId)
          : [...prev.categoryIds, catId],
      };
    });
  };

  const handleSelectAllCategories = () => {
    setDraft((prev) => ({
      ...prev,
      categoryIds: categories.map((c) => c.id),
    }));
  };

  const handleClearCategories = () => {
    setDraft((prev) => ({
      ...prev,
      categoryIds: [],
    }));
  };

  // Toggle payment method
  const handleTogglePaymentMethod = (methodId: string) => {
    setDraft((prev) => {
      const exists = prev.paymentMethods.includes(methodId);
      return {
        ...prev,
        paymentMethods: exists
          ? prev.paymentMethods.filter((id) => id !== methodId)
          : [...prev.paymentMethods, methodId],
      };
    });
  };

  // Filtered categories by search
  const visibleCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Compute active count in draft
  const activeCount =
    (draft.categoryIds.length > 0 ? 1 : 0) +
    (draft.paymentMethods.length > 0 ? 1 : 0) +
    (draft.minAmount || draft.maxAmount ? 1 : 0) +
    (draft.spendingFlag !== "all" ? 1 : 0) +
    (draft.transferOption !== "include" ? 1 : 0) +
    (draft.sortBy !== "newest" ? 1 : 0);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleResetDraft = () => {
    setDraft(DEFAULT_FILTER_STATE);
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container: Slide from right on desktop, Bottom sheet on mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="relative w-full sm:w-[420px] max-w-full bg-[#141414] border-l border-[#262626] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-250 sm:slide-in-from-right max-sm:fixed max-sm:bottom-0 max-sm:inset-x-0 max-sm:h-auto max-sm:max-h-[88vh] max-sm:rounded-t-2xl max-sm:border-t max-sm:slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-full pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[#333333]" />
        </div>

        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#171717]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="filter-drawer-title" className="text-sm sm:text-base font-bold text-[#F5F5F5]">
                  Filter Transactions
                </h3>
                {activeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-extrabold">
                    {activeCount} active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717A]">Refine activity with specific criteria</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#222222] transition cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 text-xs text-[#F5F5F5]">
          {/* 1. Category Filter (Multi-select checkboxes) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#D4D4D8] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Categories</span>
                {draft.categoryIds.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-normal">
                    ({draft.categoryIds.length} selected)
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  All
                </button>
                <span className="text-[#3A3A3A]">·</span>
                <button
                  type="button"
                  onClick={handleClearCategories}
                  className="text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Category Search bar */}
            {categories.length > 6 && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1C1C1C] border border-[#262626]">
                <Search className="w-3.5 h-3.5 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Search category..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-[#F5F5F5] outline-none placeholder-[#71717A]"
                />
                {categorySearch && (
                  <button onClick={() => setCategorySearch("")} className="text-[#71717A] hover:text-[#F5F5F5]">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Category List with Checkboxes */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 rounded-xl bg-[#181818] border border-[#262626] p-2">
              {visibleCategories.map((cat) => {
                const isSelected = draft.categoryIds.includes(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-emerald-500/10 text-[#F5F5F5]"
                        : "text-[#A1A1AA] hover:bg-[#202020] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-xs font-medium truncate">{cat.name}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCategory(cat.id)}
                      className="w-4 h-4 rounded border-[#383838] bg-[#141414] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                    />
                  </label>
                );
              })}
              {visibleCategories.length === 0 && (
                <div className="p-3 text-center text-[#71717A] text-[11px]">No categories match search</div>
              )}
            </div>
          </div>

          {/* 2. Payment Method */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#D4D4D8] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment Method</span>
              </label>
              {draft.paymentMethods.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, paymentMethods: [] }))}
                  className="text-[11px] text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PAYMENT_METHODS.map((method) => {
                const isSelected = draft.paymentMethods.includes(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleTogglePaymentMethod(method.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-[#1C1C1C] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#383838] hover:text-[#F5F5F5]"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Amount Range */}
          <div className="space-y-2.5">
            <label className="font-bold text-[#D4D4D8]">Amount Range ({currencySymbol})</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-[#71717A]">Minimum</span>
                <div className="flex items-center gap-1 bg-[#1C1C1C] border border-[#262626] rounded-xl px-2.5 py-1.5">
                  <span className="text-[#71717A] text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={draft.minAmount}
                    onChange={(e) => setDraft((p) => ({ ...p, minAmount: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#F5F5F5] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#71717A]">Maximum</span>
                <div className="flex items-center gap-1 bg-[#1C1C1C] border border-[#262626] rounded-xl px-2.5 py-1.5">
                  <span className="text-[#71717A] text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={draft.maxAmount}
                    onChange={(e) => setDraft((p) => ({ ...p, maxAmount: e.target.value }))}
                    className="w-full bg-transparent text-xs text-[#F5F5F5] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Spending Flag */}
          <div className="space-y-2.5">
            <label className="font-bold text-[#D4D4D8] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Spending Flag</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all" as SpendingFlagOption, label: "All Transactions" },
                { id: "unwanted_only" as SpendingFlagOption, label: "⚠️ Unwanted Only" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, spendingFlag: opt.id }))}
                  className={`p-2 rounded-xl text-center text-xs font-semibold transition border cursor-pointer ${
                    draft.spendingFlag === opt.id
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-[#1C1C1C] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#383838] hover:text-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Transfer Filter */}
          <div className="space-y-2.5">
            <label className="font-bold text-[#D4D4D8] flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span>Transfers & Lending</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "include" as TransferFilterOption, label: "Include" },
                { id: "exclude" as TransferFilterOption, label: "Exclude" },
                { id: "only" as TransferFilterOption, label: "Only" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, transferOption: opt.id }))}
                  className={`p-2 rounded-xl text-center text-xs font-semibold transition border cursor-pointer ${
                    draft.transferOption === opt.id
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                      : "bg-[#1C1C1C] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#383838] hover:text-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Sort By */}
          <div className="space-y-2.5">
            <label className="font-bold text-[#D4D4D8] flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sort By</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "newest" as SortOption, label: "Newest First" },
                { id: "oldest" as SortOption, label: "Oldest First" },
                { id: "highest" as SortOption, label: "Highest Amount" },
                { id: "lowest" as SortOption, label: "Lowest Amount" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, sortBy: opt.id }))}
                  className={`p-2 rounded-xl text-center text-xs font-semibold transition border cursor-pointer ${
                    draft.sortBy === opt.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-[#1C1C1C] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#383838] hover:text-[#F5F5F5]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-[#262626] bg-[#171717] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDraft}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-[#D4D4D8] text-xs font-semibold transition active:scale-[0.98] cursor-pointer border border-[#2D2D2D]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#71717A]" />
            <span>Reset Filters</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/30"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
};
