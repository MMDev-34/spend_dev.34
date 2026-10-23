import React, { useState, useEffect } from "react";
import { Settings } from "@/types/settings";
import { Transaction } from "@/types/transaction";
import { formatMoney } from "@/utils/currency";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { X, ChevronRight, Layers } from "lucide-react";
import { TransactionDetailsModal } from "@/components/transaction/TransactionDetailsModal";

export interface PeakDayItem {
  rank: number;
  date: string;
  formattedDate: string;
  fullDate: string;
  chartLabel: string;
  total: number;
  topItemNote?: string;
  txCount: number;
  percentageOfTimeline: number;
  relativeToPeak: number;
  transactions?: Transaction[];
}

interface PeakExpenseDaysChartProps {
  peakExpenseDays: PeakDayItem[];
  settings: Settings;
}

interface RankTheme {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  barGradient: string;
  glow?: string;
  activeRing: string;
  labelColor: string;
}

const getRankTheme = (rank: number): RankTheme => {
  switch (rank) {
    case 1:
      return {
        badgeBg: "bg-amber-500/15",
        badgeBorder: "border-amber-500/35",
        badgeText: "text-amber-400",
        barGradient: "bg-gradient-to-t from-amber-600 to-amber-400",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
        activeRing: "ring-2 ring-amber-400/90",
        labelColor: "text-amber-400",
      };
    case 2:
      return {
        badgeBg: "bg-slate-400/15",
        badgeBorder: "border-slate-400/35",
        badgeText: "text-slate-300",
        barGradient: "bg-gradient-to-t from-slate-500 to-slate-300",
        glow: "shadow-[0_0_8px_rgba(148,163,184,0.25)]",
        activeRing: "ring-2 ring-slate-300/90",
        labelColor: "text-slate-300",
      };
    case 3:
      return {
        badgeBg: "bg-amber-800/20",
        badgeBorder: "border-amber-700/40",
        badgeText: "text-amber-500",
        barGradient: "bg-gradient-to-t from-amber-800 to-amber-600",
        glow: "shadow-[0_0_8px_rgba(217,119,6,0.2)]",
        activeRing: "ring-2 ring-amber-500/90",
        labelColor: "text-amber-500",
      };
    case 4:
      return {
        badgeBg: "bg-zinc-800",
        badgeBorder: "border-zinc-700",
        badgeText: "text-zinc-400",
        barGradient: "bg-gradient-to-t from-zinc-600 to-zinc-400",
        activeRing: "ring-2 ring-zinc-400/90",
        labelColor: "text-zinc-400",
      };
    case 5:
    default:
      return {
        badgeBg: "bg-zinc-900",
        badgeBorder: "border-zinc-800",
        badgeText: "text-zinc-500",
        barGradient: "bg-gradient-to-t from-zinc-700 to-zinc-500",
        activeRing: "ring-2 ring-zinc-500/90",
        labelColor: "text-zinc-500",
      };
  }
};

export const PeakExpenseDaysChart: React.FC<PeakExpenseDaysChartProps> = ({
  peakExpenseDays,
  settings,
}) => {
  const categories = useAppStore((s) => s.categories);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const restoreTransaction = useAppStore((s) => s.restoreTransaction);
  const duplicateTransaction = useAppStore((s) => s.duplicateTransaction);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);

  // Animation mount trigger
  const [isMounted, setIsMounted] = useState(false);
  // Selected day for viewing all transactions on click
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  // Transaction to view details in TransactionDetailsModal
  const [inspectingTransaction, setInspectingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    setIsMounted(false);
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [peakExpenseDays]);

  if (peakExpenseDays.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#71717A]">
        No expense transactions recorded in this timeline.
      </div>
    );
  }

  // Display top 5 peak days
  const displayItems = peakExpenseDays.slice(0, 5);
  const maxDaySpend = Math.max(...displayItems.map((d) => d.total), 1);
  const totalTop5 = displayItems.reduce((acc, d) => acc + d.total, 0);

  const selectedDay = displayItems.find((d) => d.date === selectedDayDate) || null;

  // Format compact spend label floating on top of bar
  const formatBarLabel = (minorUnits: number) => {
    if (minorUnits <= 0) return "";
    const major = minorUnits / 100;
    if (major >= 10000) {
      const k = major / 1000;
      return `${settings.currency}${k % 1 === 0 ? k : k.toFixed(1)}k`;
    }
    return `${settings.currency}${Math.round(major)}`;
  };

  return (
    <div className="space-y-3 select-none">
      {/* Vertical Bar Graph Container */}
      <div className="pt-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-3 items-end h-32 sm:h-36 px-0.5">
          {displayItems.map((item, index) => {
            const isSelected = selectedDayDate === item.date;
            const theme = getRankTheme(item.rank);

            // Scale proportionally with 82% max height so floating value label fits with headroom
            const targetHeightPercent = Math.max(4, Math.round((item.total / maxDaySpend) * 82));
            const currentHeight = isMounted ? targetHeightPercent : 0;

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDayDate((prev) => (prev === item.date ? null : item.date))}
                className="group relative flex flex-col items-center justify-end h-full w-full focus:outline-none cursor-pointer"
                title={`Rank #${item.rank}: ${item.formattedDate} - ${formatMoney(item.total, settings.currency, settings.numberFormat)} (Click to view transactions)`}
              >
                {/* Floating spend money amount directly above the bar */}
                <div className="w-full flex items-end justify-center h-full relative">
                  <span
                    style={{
                      bottom: `calc(${currentHeight}% + 4px)`,
                      transitionDelay: `${index * 50}ms`,
                    }}
                    className={`absolute left-1/2 -translate-x-1/2 text-[9.5px] sm:text-[10.5px] font-mono-num font-bold whitespace-nowrap pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] z-20 transition-all duration-700 ease-out ${
                      isSelected ? theme.labelColor : "text-[#F5F5F5] group-hover:text-amber-300"
                    }`}
                  >
                    {formatBarLabel(item.total)}
                  </span>

                  {/* Vertical Column Bar */}
                  <div
                    style={{
                      height: `${currentHeight}%`,
                      transitionDelay: `${index * 50}ms`,
                    }}
                    className={`relative w-full max-w-[26px] sm:max-w-[34px] rounded-t-lg transition-all duration-700 ease-out flex flex-col justify-end overflow-hidden ${
                      theme.barGradient
                    } ${theme.glow || ""} ${
                      isSelected
                        ? `${theme.activeRing} scale-105 shadow-lg`
                        : "group-hover:brightness-110 group-hover:scale-[1.02]"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* X-Axis: Rank & Date under each bar */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-2 text-center border-t border-[#262626]/70">
          {displayItems.map((item) => {
            const isSelected = selectedDayDate === item.date;
            const theme = getRankTheme(item.rank);

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDayDate((prev) => (prev === item.date ? null : item.date))}
                className={`flex flex-col items-center py-0.5 rounded-lg transition-all cursor-pointer focus:outline-none ${
                  isSelected ? "bg-[#1C1C1C]" : "hover:bg-[#181818]"
                }`}
              >
                {/* Rank Badge */}
                <span
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-bold font-mono-num border mb-0.5 ${
                    theme.badgeBg
                  } ${theme.badgeBorder} ${theme.badgeText}`}
                >
                  #{item.rank}
                </span>

                {/* Date */}
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold tracking-tight transition-colors truncate max-w-full ${
                    isSelected ? theme.badgeText : "text-[#A1A1AA] group-hover:text-white"
                  }`}
                >
                  {item.formattedDate}
                </span>

                {/* Entry count indicator */}
                <span className="text-[9px] text-[#71717A] font-mono-num mt-0.5">
                  {item.txCount} {item.txCount === 1 ? "tx" : "txs"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day All Transactions Breakdown Panel */}
      {selectedDay ? (
        <div className="rounded-xl bg-[#181818] border border-[#2E2E2E] p-2.5 sm:p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#262626] text-xs">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold font-mono-num border ${
                  getRankTheme(selectedDay.rank).badgeBg
                } ${getRankTheme(selectedDay.rank).badgeBorder} ${
                  getRankTheme(selectedDay.rank).badgeText
                }`}
              >
                #{selectedDay.rank}
              </span>
              <span className="font-bold text-[#F5F5F5]">
                {selectedDay.fullDate || selectedDay.formattedDate}
              </span>
              <span className="text-[#71717A]">·</span>
              <span className="font-mono-num font-bold text-rose-400">
                {formatMoney(selectedDay.total, settings.currency, settings.numberFormat)}
              </span>
              <span className="text-[10px] text-[#71717A] font-mono-num">
                ({selectedDay.txCount} {selectedDay.txCount === 1 ? "expense" : "expenses"})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayDate(null)}
              className="p-1 rounded-md text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer shrink-0"
              title="Close transactions"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List of all transactions for that day */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
            {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
              selectedDay.transactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setInspectingTransaction(tx)}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#141414] border border-[#242424] hover:border-neutral-700 transition cursor-pointer group"
                    title="Click to view transaction details"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{cat?.icon || "💸"}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#F5F5F5] group-hover:text-amber-400 transition-colors truncate">
                          {cat?.name || "Expense"}
                        </div>
                        {tx.note && (
                          <div className="text-[10.5px] text-[#A1A1AA] truncate">
                            {tx.note}
                          </div>
                        )}
                      </div>
                      {tx.isUnwanted && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold shrink-0">
                          unwanted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono-num font-bold text-xs text-rose-400">
                        -{formatMoney(tx.amount, settings.currency, settings.numberFormat)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-[#52525B] group-hover:text-[#A1A1AA] transition" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-2 text-center text-xs text-[#71717A]">
                No transaction details found for this date.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Default Compact Summary & Tap Hint when no bar is clicked */
        <div className="pt-1.5 border-t border-[#262626]/70 flex items-center justify-between text-[11px] text-[#71717A] px-1 font-mono-num flex-wrap gap-1">
          <span className="truncate">
            Top {displayItems.length} days:{" "}
            <span className="font-bold text-[#F5F5F5]">
              {formatMoney(totalTop5, settings.currency, settings.numberFormat)}
            </span>
          </span>
          <span className="text-amber-400 font-semibold shrink-0 flex items-center gap-1">
            <span>Tap any bar to inspect day</span>
          </span>
        </div>
      )}

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={!!inspectingTransaction}
        transaction={inspectingTransaction}
        onClose={() => setInspectingTransaction(null)}
        onEdit={(tx) => {
          setInspectingTransaction(null);
          openAddModal("expense", tx);
        }}
        onDuplicate={(tx) => {
          const dup = duplicateTransaction(tx.id);
          if (dup) {
            openAddModal(dup.type, dup);
            showToast("Transaction copied. Review and save.");
          }
          setInspectingTransaction(null);
        }}
        onDelete={(tx) => {
          deleteTransaction(tx.id);
          const cat = categories.find((c) => c.id === tx.categoryId);
          const catName = cat?.name || "Transaction";
          const amountStr = formatMoney(tx.amount, settings.currency, settings.numberFormat);
          const prefix = tx.type === "expense" ? "-" : "+";

          showToast(
            `Deleted ${catName} (${prefix}${amountStr})`,
            "info",
            {
              label: "Undo",
              onClick: () => {
                restoreTransaction(tx);
                showToast("Transaction restored", "success");
              },
            },
            6000
          );
          setInspectingTransaction(null);
        }}
        settings={settings}
        categories={categories}
      />
    </div>
  );
};
