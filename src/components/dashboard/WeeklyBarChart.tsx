import React, { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { calculateWeeklyTotalsForOffset } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { Settings } from "@/types/settings";
import { useUIStore } from "@/stores/uiStore";
import { BarChart3, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyBarChartProps {
  settings: Settings;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ settings }) => {
  const transactions = useAppStore((s) => s.transactions);
  const openAddModal = useUIStore((s) => s.openAddModal);

  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -12 = 3 months ago

  const days = useMemo(() => {
    return calculateWeeklyTotalsForOffset(transactions, weekOffset, settings.weekStartsOn);
  }, [transactions, weekOffset, settings.weekStartsOn]);

  const todayIndex = days.findIndex((d) => d.isToday);
  const [selectedIndex, setSelectedIndex] = useState<number>(
    todayIndex !== -1 ? todayIndex : days.length - 1
  );

  const selectedDay = days[selectedIndex] || days[0];
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const weekUnwantedTotal = days.reduce((sum, d) => sum + (d.unwantedTotal || 0), 0);
  const maxDaySpend = Math.max(...days.map((d) => d.total), 1);

  // Week range label (e.g., "Sep 28 - Oct 4")
  const weekRangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const start = days[0].date;
    const end = days[days.length - 1].date;
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const sDt = new Date(sy, sm - 1, sd);
    const eDt = new Date(ey, em - 1, ed);
    const sFmt = sDt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const eFmt = eDt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${sFmt} - ${eFmt}`;
  }, [days]);

  // Touch swipe handling for mobile swipe left/right anywhere on graph
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped Left -> go to more recent week (increment weekOffset, max 0)
        setWeekOffset((prev) => {
          const next = Math.min(0, prev + 1);
          setSelectedIndex(next === 0 ? (todayIndex !== -1 ? todayIndex : 6) : 6);
          return next;
        });
      } else {
        // Swiped Right -> go to older past week (decrement weekOffset, min -12)
        setWeekOffset((prev) => Math.max(-12, prev - 1));
        setSelectedIndex(6);
      }
    }
    setTouchStartX(null);
  };

  const handlePrevWeek = () => {
    setWeekOffset((prev) => Math.max(-12, prev - 1));
    setSelectedIndex(6);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => {
      const next = Math.min(0, prev + 1);
      setSelectedIndex(next === 0 ? (todayIndex !== -1 ? todayIndex : 6) : 6);
      return next;
    });
  };

  // Add currency symbol. Use 'k' format without unnecessary decimals if >= 10,000, else round digits.
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
    <div 
      className="rounded-2xl bg-[#141414] border border-[#262626] p-4 sm:p-5 space-y-3 shadow-sm select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with Navigation */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#262626]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-emerald-400 shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider truncate">
              {weekOffset === 0 ? "This Week" : weekRangeLabel}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono-num text-[#F5F5F5] leading-tight">
              {formatMoney(weekTotal, settings.currency, settings.numberFormat)}
            </div>
          </div>
        </div>

        {/* Action Buttons for Week Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handlePrevWeek}
            disabled={weekOffset <= -12}
            className="p-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] text-[#A1A1AA] hover:text-white border border-[#262626] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextWeek}
            disabled={weekOffset >= 0}
            className="p-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] text-[#A1A1AA] hover:text-white border border-[#262626] transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="pt-2">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-32 sm:h-36 px-0.5 pt-6">
          {days.map((day, idx) => {
            const isSelected = selectedIndex === idx;
            const heightPercent = day.total > 0 
              ? Math.max(14, Math.round((day.total / maxDaySpend) * 75)) 
              : 6;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className="group relative flex flex-col items-center justify-end h-full w-full focus:outline-none cursor-pointer"
                aria-label={`${day.dayFull}: ${formatMoney(day.total, settings.currency, settings.numberFormat)}`}
              >
                <div className="w-full flex items-end justify-center h-full relative">
                  {/* Spend money over each bar */}
                  {day.total > 0 && (
                    <span 
                      style={{ bottom: `calc(${heightPercent}% + 4px)` }}
                      className={`absolute left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-mono-num font-semibold whitespace-nowrap pointer-events-none z-10 transition-colors ${
                        isSelected ? "text-emerald-300 font-bold scale-105" : "text-emerald-400/90"
                      }`}
                    >
                      {formatBarLabel(day.total)}
                    </span>
                  )}

                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`relative w-full max-w-[20px] sm:max-w-[26px] rounded-t-md transition-all duration-150 ${
                      day.total === 0
                        ? "bg-emerald-950/40 border border-emerald-900/30 group-hover:bg-emerald-900/40"
                        : "bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/25 hover:brightness-110"
                    } ${
                      isSelected
                        ? "ring-2 ring-white shadow-md shadow-emerald-400/40 scale-y-[1.02]"
                        : day.isToday
                        ? "ring-1 ring-emerald-300/60 shadow-md shadow-emerald-500/30"
                        : ""
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Days Axis */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 text-center border-t border-[#262626]">
          {days.map((day, idx) => {
            const isSelected = selectedIndex === idx;
            const dateNum = day.date.split("-")[2];

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className="flex flex-col items-center py-0.5 rounded-lg transition-colors select-none focus:outline-none cursor-pointer"
              >
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? "text-emerald-400 font-bold"
                      : day.isToday
                      ? "text-[#F5F5F5] font-semibold"
                      : "text-[#71717A]"
                  }`}
                >
                  {day.dayLabel}
                </span>

                <div className="flex items-center gap-0.5 mt-0.5">
                  <span
                    className={`text-[9.5px] sm:text-[10px] font-mono-num ${
                      isSelected
                        ? "text-emerald-300 font-bold"
                        : day.isToday
                        ? "text-[#A1A1AA]"
                        : "text-[#71717A]"
                    }`}
                  >
                    {dateNum}
                  </span>
                  {day.isToday && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Summary Bar */}
      <div className="pt-2.5 border-t border-[#262626] flex items-center justify-between text-xs gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-semibold text-[#F5F5F5] truncate text-[11px] sm:text-xs">
            {selectedDay.dayFull}:
          </span>
          <span className="text-emerald-400 font-mono-num font-bold text-[11px] sm:text-xs shrink-0">
            {formatMoney(selectedDay.total, settings.currency, settings.numberFormat)}
          </span>
          {selectedDay.count > 0 && (
            <>
              <span className="text-[#52525B]">·</span>
              <span className="text-[#71717A] text-[10px] sm:text-[11px] shrink-0">
                {selectedDay.count} {selectedDay.count === 1 ? "expense" : "expenses"}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => openAddModal("expense", { date: selectedDay.date })}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer shrink-0 ml-auto"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};
