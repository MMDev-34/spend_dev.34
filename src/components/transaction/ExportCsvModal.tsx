import React, { useState, useMemo } from "react";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { exportTransactionsToCsv } from "@/utils/csvExport";
import { getToday } from "@/utils/dates";
import { formatMoney } from "@/utils/currency";
import { 
  X, 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle2, 
  Filter 
} from "lucide-react";

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  onExportSuccess?: (filename: string, count: number) => void;
}

type ExportScope = "this_month" | "last_month" | "all_time" | "custom";
type ExportType = "all" | "expense" | "income";

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  settings,
  onExportSuccess,
}) => {
  const [scope, setScope] = useState<ExportScope>("this_month");
  const [typeFilter, setTypeFilter] = useState<ExportType>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  React.useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const todayStr = useMemo(() => getToday(), []);

  // Filter transactions according to modal selections
  const matchingTransactions = useMemo(() => {
    let result = [...transactions];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Date range filter
    if (scope === "this_month") {
      const prefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(prefix));
    } else if (scope === "last_month") {
      const prevMonth = currentMonth === 0 ? 12 : currentMonth;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prefix = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;
      result = result.filter((t) => t.date.startsWith(prefix));
    } else if (scope === "custom") {
      if (customStart) result = result.filter((t) => t.date >= customStart);
      if (customEnd) result = result.filter((t) => t.date <= customEnd);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.categoryId === selectedCategory);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, scope, customStart, customEnd, typeFilter, selectedCategory]);

  const totalAmount = useMemo(() => {
    return matchingTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [matchingTransactions]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (matchingTransactions.length === 0) return;

    let rangeLabel = "This Month";
    if (scope === "last_month") rangeLabel = "Last Month";
    else if (scope === "all_time") rangeLabel = "All Time";
    else if (scope === "custom") {
      rangeLabel = customStart && customEnd 
        ? `${customStart} to ${customEnd}` 
        : customStart 
        ? `From ${customStart}` 
        : customEnd 
        ? `Up to ${customEnd}` 
        : "Custom Range";
    }

    const filename = exportTransactionsToCsv(
      matchingTransactions,
      categories,
      settings.currency,
      rangeLabel,
      scope === "custom" ? customStart : undefined,
      scope === "custom" ? customEnd : undefined
    );

    if (onExportSuccess) {
      onExportSuccess(filename, matchingTransactions.length);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Export to CSV
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Select date range and format options
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* 1. Date Range Scope Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
              Date Range
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "all_time", label: "All Time" },
                { id: "custom", label: "Custom" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id as ExportScope)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                    scope === s.id
                      ? "bg-neutral-800 border-emerald-500/80 text-emerald-400 shadow-sm ring-1 ring-emerald-500/30"
                      : "bg-[#1C1C1C] border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-neutral-800/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Custom Range Inputs */}
            {scope === "custom" && (
              <div className="p-3 rounded-xl bg-[#1C1C1C] border border-[#262626] space-y-2.5 animate-in fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#71717A]">From Date:</span>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] text-[#F5F5F5] rounded-lg px-2 py-1.5 outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#71717A]">To Date:</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-[#141414] border border-[#262626] text-[#F5F5F5] rounded-lg px-2 py-1.5 outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Transaction Type Filter */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "all", label: "All Types" },
                { id: "expense", label: "Expenses Only" },
                { id: "income", label: "Income Only" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id as ExportType)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition text-center ${
                    typeFilter === t.id
                      ? "bg-neutral-800 border-cyan-500/80 text-cyan-400 shadow-sm ring-1 ring-cyan-500/30"
                      : "bg-[#1C1C1C] border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-neutral-800/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Category Filter Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] text-xs text-[#F5F5F5] rounded-xl px-3 py-2 outline-none font-medium focus:border-neutral-700"
            >
              <option value="all">📦 All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Live Export Preview Box */}
          <div className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#71717A] uppercase font-semibold">
                Export Summary
              </span>
              <div className="text-sm font-bold text-[#F5F5F5] font-mono-num">
                {matchingTransactions.length} {matchingTransactions.length === 1 ? "transaction" : "transactions"}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-[#71717A] uppercase font-semibold">
                Total Value
              </span>
              <div className="text-sm font-bold text-emerald-400 font-mono-num">
                {formatMoney(totalAmount, settings.currency, settings.numberFormat)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={matchingTransactions.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-950/20"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Download CSV ({matchingTransactions.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
