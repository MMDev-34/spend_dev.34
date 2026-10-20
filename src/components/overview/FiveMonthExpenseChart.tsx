import React, { useMemo, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3, Trophy, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";

export interface MonthExpenseItem {
  monthKey: string;
  monthLabel: string;
  expense: number;
  income: number;
  isCurrent: boolean;
  diffPct: number | null;
}

interface FiveMonthExpenseChartProps {
  last5MonthsData: MonthExpenseItem[];
  fiveMonthsRangeLabel: string;
  fiveMonthOffset: number;
  setFiveMonthOffset: (val: number | ((prev: number) => number)) => void;
  selectedMonthIndex: number | null;
  setSelectedMonthIndex: (val: number | null | ((prev: number | null) => number | null)) => void;
  handlePrev5Months: () => void;
  handleNext5Months: () => void;
  handleTouchStart5Months: (e: React.TouchEvent) => void;
  handleTouchEnd5Months: (e: React.TouchEvent) => void;
  settings: Settings;
  transactions: Transaction[];
  totalExpense: number;
  comparisonView: "months" | "peakDays";
  setComparisonView: (view: "months" | "peakDays") => void;
}

export const FiveMonthExpenseChart: React.FC<FiveMonthExpenseChartProps> = ({
  last5MonthsData,
  fiveMonthsRangeLabel,
  fiveMonthOffset,
  setFiveMonthOffset,
  selectedMonthIndex,
  setSelectedMonthIndex,
  handlePrev5Months,
  handleNext5Months,
  handleTouchStart5Months,
  handleTouchEnd5Months,
  settings,
  transactions,
  totalExpense,
  comparisonView,
  setComparisonView,
}) => {
  // Local gesture refs for touch & mouse drag without causing re-renders
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number; isDown: boolean } | null>(null);

  const handleChartTouchStart = (e: React.TouchEvent) => {
    if (comparisonView !== "months") return;
    if (e.touches && e.touches.length > 0) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleChartTouchEnd = (e: React.TouchEvent) => {
    if (comparisonView !== "months" || !touchStartRef.current) return;
    if (!e.changedTouches || e.changedTouches.length === 0) {
      touchStartRef.current = null;
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartRef.current.x - touchEndX;
    const diffY = touchStartRef.current.y - touchEndY;
    touchStartRef.current = null;

    // Trigger swipe if horizontal distance is > 25px and more dominant than vertical scroll
    if (Math.abs(diffX) > 25 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        // Swiped Right -> Previous 5 months (past)
        handlePrev5Months();
      } else {
        // Swiped Left -> Next 5 months (towards current)
        handleNext5Months();
      }
    }
  };

  const handleChartTouchCancel = () => {
    touchStartRef.current = null;
  };

  const handleChartMouseDown = (e: React.MouseEvent) => {
    if (comparisonView !== "months") return;
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      isDown: true,
    };
  };

  const handleChartMouseUp = (e: React.MouseEvent) => {
    if (comparisonView !== "months" || !mouseStartRef.current?.isDown) {
      mouseStartRef.current = null;
      return;
    }
    const diffX = mouseStartRef.current.x - e.clientX;
    const diffY = mouseStartRef.current.y - e.clientY;
    mouseStartRef.current = null;

    if (Math.abs(diffX) > 25 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        // Dragged Right -> Previous 5 months
        handlePrev5Months();
      } else {
        // Dragged Left -> Next 5 months
        handleNext5Months();
      }
    }
  };

  const handleChartMouseLeave = () => {
    mouseStartRef.current = null;
  };

  // Selected month object for breakdown card when user taps a bar (null if no bar tapped to save space)
  const selectedMonthData = useMemo(() => {
    if (selectedMonthIndex === null || !last5MonthsData || !last5MonthsData[selectedMonthIndex]) {
      return null;
    }
    return last5MonthsData[selectedMonthIndex];
  }, [selectedMonthIndex, last5MonthsData]);

  // Clean, accurate Y-Axis domain & tick intervals for 5-month comparison
  const fiveMonthsYAxisConfig = useMemo(() => {
    const maxMinor = Math.max(...last5MonthsData.map((d) => d.expense || 0), 0);
    const maxMajor = maxMinor / 100;

    if (maxMajor <= 0) {
      return {
        domainMax: 100000,
        ticks: [0, 50000, 100000],
      };
    }

    const rawCeil = maxMajor * 1.25;
    let step = 100;
    if (rawCeil <= 250) {
      step = 50;
    } else if (rawCeil <= 500) {
      step = 100;
    } else if (rawCeil <= 1200) {
      step = 250;
    } else if (rawCeil <= 2500) {
      step = 500;
    } else if (rawCeil <= 6000) {
      step = 1000;
    } else if (rawCeil <= 15000) {
      step = 2500;
    } else if (rawCeil <= 30000) {
      step = 5000;
    } else if (rawCeil <= 60000) {
      step = 10000;
    } else if (rawCeil <= 150000) {
      step = 25000;
    } else if (rawCeil <= 300000) {
      step = 50000;
    } else if (rawCeil <= 600000) {
      step = 100000;
    } else {
      const pow10 = Math.pow(10, Math.floor(Math.log10(rawCeil)));
      step = Math.max(Math.round(pow10 / 2), 1000);
    }

    const ceilMajor = Math.ceil(rawCeil / step) * step;
    const ticks: number[] = [];
    for (let m = 0; m <= ceilMajor; m += step) {
      ticks.push(m * 100);
    }

    const finalTicks = ticks.length > 6 
      ? ticks.filter((_, idx) => idx % 2 === 0 || idx === ticks.length - 1)
      : ticks;

    return {
      domainMax: ceilMajor * 100,
      ticks: finalTicks,
    };
  }, [last5MonthsData]);

  const format5MonthYAxisTick = (val: number) => {
    if (val === 0) return "0";
    const major = Math.round(val / 100);
    if (major >= 1000000) {
      const m = major / 1000000;
      return `${settings.currency}${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    if (major >= 1000) {
      const k = major / 1000;
      return `${settings.currency}${k % 1 === 0 ? k : k.toFixed(1)}k`;
    }
    return `${settings.currency}${major}`;
  };

  const renderCustomBarTopLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null || value <= 0) return null;
    const major = value / 100;
    let label = "";
    if (major >= 10000) {
      const k = major / 1000;
      label = `${settings.currency}${k % 1 === 0 ? k : k.toFixed(1)}k`;
    } else {
      label = `${settings.currency}${Math.round(major)}`;
    }

    const isSelected = selectedMonthIndex === index;

    return (
      <text
        x={x + width / 2}
        y={Math.max(y - 6, 12)}
        fill={isSelected ? "#FB7185" : "#E4E4E7"}
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
        fontFamily="monospace"
        className="select-none cursor-pointer outline-none focus:outline-none"
        style={{ outline: "none" }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedMonthIndex((prev) => (prev === index ? null : index));
        }}
      >
        {label}
      </text>
    );
  };

  const renderBarWithFullColumnHitTarget = (props: any) => {
    const { x, y, width, height, index } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
    const isSelected = selectedMonthIndex === index;
    const entry = last5MonthsData[index];

    const visualHeight = Math.max(height || 0, 6);
    const visualY = y + height - visualHeight;

    const fillColor = isSelected ? "#F43F5E" : entry?.expense === 0 ? "#262626" : entry?.isCurrent ? "#FB7185" : "#3B82F6";
    const fillOpacity = isSelected ? 1 : selectedMonthIndex !== null ? 0.4 : entry?.isCurrent ? 0.95 : 0.65;
    const baselineY = y + height;

    return (
      <g 
        key={`hit-bar-${index}`} 
        className="cursor-pointer outline-none focus:outline-none" 
        style={{ outline: "none" }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedMonthIndex((prev) => (prev === index ? null : index));
        }}
      >
        <rect
          x={x - 12}
          y={0}
          width={width + 24}
          height={baselineY + 12}
          fill="rgba(0,0,0,0.001)"
          stroke="none"
          strokeWidth={0}
          className="cursor-pointer outline-none focus:outline-none"
          style={{ outline: "none", pointerEvents: "all" }}
        />
        <rect
          x={x}
          y={visualY}
          width={width}
          height={visualHeight}
          rx={6}
          ry={6}
          fill={fillColor}
          fillOpacity={fillOpacity}
          stroke="none"
          strokeWidth={0}
          className="transition-all cursor-pointer outline-none focus:outline-none"
          style={{ outline: "none" }}
        />
      </g>
    );
  };

  const renderClickableXAxisTick = (props: any) => {
    const { x, y, payload, index } = props;
    const isSelected = selectedMonthIndex === index;
    const textVal = payload?.value || (last5MonthsData && last5MonthsData[index]?.monthLabel) || "";
    return (
      <g
        transform={`translate(${x},${y})`}
        onClick={() => setSelectedMonthIndex((prev) => (prev === index ? null : index))}
        className="cursor-pointer select-none outline-none focus:outline-none"
        style={{ outline: "none" }}
      >
        <rect x={-26} y={0} width={52} height={26} fill="rgba(0,0,0,0.001)" pointerEvents="all" stroke="none" strokeWidth={0} style={{ outline: "none", pointerEvents: "all" }} />
        <text
          x={0}
          y={13}
          textAnchor="middle"
          fill={isSelected ? "#F43F5E" : "#A1A1AA"}
          fontSize={10}
          fontWeight={isSelected ? 700 : 500}
          style={{ outline: "none" }}
        >
          {textVal}
        </text>
      </g>
    );
  };

  return (
    <div 
      className="rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] p-2.5 sm:p-4 space-y-2.5 sm:space-y-3 shadow-sm select-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleChartTouchStart}
      onTouchEnd={handleChartTouchEnd}
      onTouchCancel={handleChartTouchCancel}
      onMouseDown={handleChartMouseDown}
      onMouseUp={handleChartMouseUp}
      onMouseLeave={handleChartMouseLeave}
    >
      {/* Header with Segmented Toggle Button & 5-Month Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-[#262626]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {comparisonView === "months" ? (
              <BarChart3 className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate">
              {comparisonView === "months" ? "5-Month Expense Comparison" : "Peak Expense Days Ranking"}
            </h3>
            {comparisonView === "months" && (
              <div className="flex items-center gap-1.5 ml-0.5">
                <span className="text-[10px] sm:text-[11px] font-mono-num font-semibold text-[#A1A1AA] bg-[#1E1E1E] px-2 py-0.5 rounded-md border border-[#2D2D2D]">
                  {fiveMonthsRangeLabel}
                </span>

                {/* 5-Month Pagination Chevrons directly beside range label */}
                <div className="flex items-center gap-0.5 bg-[#181818] p-0.5 rounded-lg border border-[#262626]">
                  <button
                    type="button"
                    onClick={handlePrev5Months}
                    className="p-1 rounded-md text-[#A1A1AA] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Previous 5 Months (Swipe Right)"
                    aria-label="Previous 5 Months"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {fiveMonthOffset > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiveMonthOffset(0)}
                      className="text-[10px] px-1.5 py-0.5 rounded-md text-emerald-400 hover:text-emerald-300 font-semibold transition hover:bg-neutral-800 cursor-pointer"
                      title="Jump to Current 5 Months"
                    >
                      Current
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext5Months}
                    disabled={fiveMonthOffset === 0}
                    className="p-1 rounded-md text-[#A1A1AA] hover:text-white hover:bg-neutral-800 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Next 5 Months (Swipe Left)"
                    aria-label="Next 5 Months"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Controls: View Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-[#262626]">
            <button
              type="button"
              onClick={() => setComparisonView("months")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                comparisonView === "months"
                  ? "bg-black text-white shadow-sm border border-neutral-700"
                  : "text-[#71717A] hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
              <span>5-Month Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setComparisonView("peakDays")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                comparisonView === "peakDays"
                  ? "bg-black text-white shadow-sm border border-neutral-700"
                  : "text-[#71717A] hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Peak Days</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Mode: 5-Month Expense Comparison Bar Graph */}
      {comparisonView === "months" && (
        <div className="space-y-3">
          <div 
            className="w-full overflow-hidden outline-none focus:outline-none select-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: "pan-y" }}
            onTouchStart={handleChartTouchStart}
            onTouchEnd={handleChartTouchEnd}
            onTouchCancel={handleChartTouchCancel}
            onMouseDown={handleChartMouseDown}
            onMouseUp={handleChartMouseUp}
            onMouseLeave={handleChartMouseLeave}
          >
            <ResponsiveContainer width="100%" height={205} className="sm:!h-[240px] outline-none focus:outline-none">
              <BarChart 
                data={last5MonthsData} 
                margin={{ top: 24, right: 16, left: 4, bottom: 4 }} 
                className="outline-none focus:outline-none select-none"
                onClick={(state: any) => {
                  if (state && typeof state.activeTooltipIndex === "number") {
                    setSelectedMonthIndex((prev) => (prev === state.activeTooltipIndex ? null : state.activeTooltipIndex));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
                <XAxis 
                  dataKey="monthLabel" 
                  interval={0}
                  ticks={last5MonthsData.map((d) => d.monthLabel)}
                  tick={renderClickableXAxisTick}
                  axisLine={false}
                  tickLine={false}
                  dy={3}
                />
                <YAxis 
                  tick={{ fill: "#A1A1AA", fontSize: 9.5 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  domain={[0, fiveMonthsYAxisConfig.domainMax]}
                  ticks={fiveMonthsYAxisConfig.ticks}
                  tickFormatter={format5MonthYAxisTick}
                />
                <Bar 
                  dataKey="expense" 
                  shape={renderBarWithFullColumnHitTarget}
                  maxBarSize={44}
                >
                  <LabelList dataKey="expense" content={renderCustomBarTopLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Selected Month Tapped Breakdown Info Card */}
          {selectedMonthData && (
            <div className="rounded-xl bg-[#171717] border border-[#282828] p-2.5 sm:p-3 animate-in fade-in slide-in-from-top-1 duration-150 shadow-sm">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                    {new Date(
                      Number(selectedMonthData.monthKey.split("-")[0]), 
                      Number(selectedMonthData.monthKey.split("-")[1]) - 1, 
                      1
                    ).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                  {selectedMonthData.isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold shrink-0">
                      Current
                    </span>
                  )}
                  <span className="text-[9.5px] sm:text-[10px] font-mono-num font-medium text-[#A1A1AA] bg-[#222222] px-2 py-0.5 rounded-full border border-[#2D2D2D] shrink-0">
                    {transactions.filter((t) => t.date?.startsWith(selectedMonthData.monthKey) && t.type === "expense").length} txns
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMonthIndex(null)}
                  className="p-1 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition shrink-0 cursor-pointer"
                  title="Close breakdown"
                  aria-label="Close breakdown"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Structured 3-Column Metric Grid */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mt-2 pt-2 border-t border-[#262626]">
                <div className="bg-[#121212] border border-[#222222] rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block">
                    Spent
                  </span>
                  <span className="text-[11.5px] sm:text-xs md:text-[13px] font-bold font-mono-num text-rose-400 truncate block mt-0.5">
                    {formatMoney(selectedMonthData.expense, settings.currency, settings.numberFormat)}
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#222222] rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block">
                    Income
                  </span>
                  <span className="text-[11.5px] sm:text-xs md:text-[13px] font-bold font-mono-num text-emerald-400 truncate block mt-0.5">
                    {formatMoney(selectedMonthData.income, settings.currency, settings.numberFormat)}
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#222222] rounded-lg p-1.5 sm:p-2 text-center flex flex-col justify-center min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block">
                    Net
                  </span>
                  <span className={`text-[11.5px] sm:text-xs md:text-[13px] font-bold font-mono-num truncate block mt-0.5 ${
                    selectedMonthData.income - selectedMonthData.expense >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {selectedMonthData.income - selectedMonthData.expense >= 0 ? "+" : ""}
                    {formatMoney(selectedMonthData.income - selectedMonthData.expense, settings.currency, settings.numberFormat)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-[#262626]/70">
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-[#71717A] block">
                {fiveMonthOffset === 0 ? "5-Month Total Spend" : "5-Month Period Total"}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono-num">
                {formatMoney(last5MonthsData.reduce((acc, m) => acc + m.expense, 0), settings.currency, settings.numberFormat)}
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#181818] border border-[#262626]">
              <span className="text-[10px] text-[#71717A] block">Monthly Average</span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono-num">
                {formatMoney(Math.round(last5MonthsData.reduce((acc, m) => acc + m.expense, 0) / Math.max(1, last5MonthsData.length)), settings.currency, settings.numberFormat)}
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#181818] border border-[#262626] col-span-2 sm:col-span-1 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center">
              <div>
                <span className="text-[10px] text-[#71717A] block">
                  {fiveMonthOffset === 0 ? "Active Month Status" : "Historical Window"}
                </span>
                <span className="text-xs sm:text-sm font-bold font-mono-num flex items-center gap-1.5">
                  {fiveMonthOffset === 0 ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-rose-400">{formatMoney(totalExpense, settings.currency, settings.numberFormat)}</span>
                    </>
                  ) : (
                    <span className="text-rose-400">-{fiveMonthOffset * 5} mo shift</span>
                  )}
                </span>
              </div>
              {fiveMonthOffset > 0 && (
                <button
                  type="button"
                  onClick={() => setFiveMonthOffset(0)}
                  className="text-[10.5px] text-emerald-400 hover:text-emerald-300 font-semibold underline transition cursor-pointer"
                >
                  Reset to Latest
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
