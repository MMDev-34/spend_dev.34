import React from "react";
import { X, Trash2 } from "lucide-react";
import { AdvancedFilterState, DEFAULT_FILTER_STATE } from "./AdvancedFilterDrawer";
import { Category } from "@/types/category";

interface ActiveFilterChipsProps {
  filters: AdvancedFilterState;
  onUpdateFilters: (newFilters: AdvancedFilterState) => void;
  onClearAll: () => void;
  categories: Category[];
  currencySymbol: string;
  className?: string;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onUpdateFilters,
  onClearAll,
  categories,
  currencySymbol,
  className = "",
}) => {
  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  // 1. Categories
  if (filters.categoryIds.length > 0) {
    if (filters.categoryIds.length === 1) {
      const cat = categoryMap.get(filters.categoryIds[0]);
      chips.push({
        id: "cat-single",
        label: `${cat?.icon || "🏷️"} ${cat?.name || "Category"}`,
        onRemove: () => onUpdateFilters({ ...filters, categoryIds: [] }),
      });
    } else {
      chips.push({
        id: "cat-multi",
        label: `${filters.categoryIds.length} Categories`,
        onRemove: () => onUpdateFilters({ ...filters, categoryIds: [] }),
      });
    }
  }

  // 2. Payment Methods
  for (const pm of filters.paymentMethods) {
    chips.push({
      id: `pm-${pm}`,
      label: pm.toUpperCase(),
      onRemove: () =>
        onUpdateFilters({
          ...filters,
          paymentMethods: filters.paymentMethods.filter((id) => id !== pm),
        }),
    });
  }

  // 3. Amount Range
  if (filters.minAmount || filters.maxAmount) {
    const minText = filters.minAmount ? `${currencySymbol}${filters.minAmount}` : `${currencySymbol}0`;
    const maxText = filters.maxAmount ? `${currencySymbol}${filters.maxAmount}` : "Any";
    chips.push({
      id: "amount-range",
      label: `${minText} – ${maxText}`,
      onRemove: () => onUpdateFilters({ ...filters, minAmount: "", maxAmount: "" }),
    });
  }

  // 4. Spending Flag
  if (filters.spendingFlag === "unwanted_only") {
    chips.push({
      id: "unwanted",
      label: "⚠️ Unwanted Only",
      onRemove: () => onUpdateFilters({ ...filters, spendingFlag: "all" }),
    });
  }

  // 5. Transfer
  if (filters.transferOption === "exclude") {
    chips.push({
      id: "transfer-exclude",
      label: "Excl. Transfers",
      onRemove: () => onUpdateFilters({ ...filters, transferOption: "include" }),
    });
  } else if (filters.transferOption === "only") {
    chips.push({
      id: "transfer-only",
      label: "Transfers Only",
      onRemove: () => onUpdateFilters({ ...filters, transferOption: "include" }),
    });
  }

  // 6. Sort Option
  if (filters.sortBy !== "newest") {
    const sortLabels: Record<string, string> = {
      oldest: "Oldest First",
      highest: "Highest Amount",
      lowest: "Lowest Amount",
    };
    chips.push({
      id: "sort-by",
      label: `Sort: ${sortLabels[filters.sortBy] || filters.sortBy}`,
      onRemove: () => onUpdateFilters({ ...filters, sortBy: "newest" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-1 animate-in fade-in duration-150 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1C1C] border border-[#2F2F2F] text-[11px] font-medium text-[#E4E4E7] shadow-sm select-none"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-[#71717A] hover:text-[#F5F5F5] rounded p-0.5 transition cursor-pointer"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 transition cursor-pointer"
      >
        Clear all
      </button>
    </div>
  );
};
