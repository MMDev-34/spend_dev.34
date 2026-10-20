import React, { useState, useMemo, useRef } from "react";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { CreditCard, Wallet, Smartphone, Building, HelpCircle, Layers, Calendar } from "lucide-react";

interface PaymentMethodsDotChartProps {
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  timeScope: string;
  activeMonth: string; // YYYY-MM
}

interface MethodConfig {
  id: string;
  label: string;
  subLabel: string;
  color: string;
  bgHex: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PAYMENT_METHODS: MethodConfig[] = [
  { id: "upi", label: "UPI / Online", subLabel: "GPay, PhonePe, QR", color: "#06B6D4", bgHex: "rgba(6, 182, 212, 0.15)", icon: Smartphone },
  { id: "cash", label: "Cash", subLabel: "Physical Currency", color: "#10B981", bgHex: "rgba(16, 185, 129, 0.15)", icon: Wallet },
  { id: "card", label: "Card", subLabel: "Debit & Credit", color: "#8B5CF6", bgHex: "rgba(139, 92, 246, 0.15)", icon: CreditCard },
  { id: "bank", label: "Bank Transfer", subLabel: "NEFT, IMPS, RTGS", color: "#F59E0B", bgHex: "rgba(245, 158, 11, 0.15)", icon: Building },
  { id: "other", label: "Other", subLabel: "Vouchers & Misc", color: "#71717A", bgHex: "rgba(113, 113, 122, 0.15)", icon: HelpCircle },
];

interface DotDataPoint {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  methodId: string;
  methodLabel: string;
  methodColor: string;
  totalAmount: number;
  count: number;
  transactions: Transaction[];
  xPercent: number; // 0 - 100
  yLaneIndex: number; // 0 - 4
}

interface DaySummaryMethod {
  methodId: string;
  label: string;
  color: string;
  amount: number;
  count: number;
  laneIndex: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface DaySummary {
  dateStr: string;
  dayNum: number;
  formattedDate: string;
  fullDate: string;
  totalAmount: number;
  totalCount: number;
  xPercent: number;
  methods: DaySummaryMethod[];
}

export const PaymentMethodsDotChart: React.FC<PaymentMethodsDotChartProps> = ({
  transactions,
  categories,
  settings,
  timeScope,
  activeMonth,
}) => {
  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense");
  const [highlightedMethod, setHighlightedMethod] = useState<string | null>(null);
  
  // Interactive Shared Crosshair & Tooltip State
  const [activeDateSummary, setActiveDateSummary] = useState<DaySummary | null>(null);
  const [activeCrosshair, setActiveCrosshair] = useState<{
    xPercent: number;
    yPx: number;
    laneIndex: number;
    tooltipX: number;
    tooltipY: number;
    tooltipWidth: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Filter transactions by selected type (expense/income)
  const filteredTxs = useMemo(() => {
    return transactions.filter((t) => t.type === selectedType && t.date);
  }, [transactions, selectedType]);

  // 1. Calculate percentage distribution across payment methods
  const distribution = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {
      upi: { amount: 0, count: 0 },
      cash: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
      bank: { amount: 0, count: 0 },
      other: { amount: 0, count: 0 },
    };

    let grandTotal = 0;

    for (const tx of filteredTxs) {
      const rawMethod = (tx.paymentMethod || "other").toLowerCase();
      const methodId = rawMethod in totals ? rawMethod : "other";
      totals[methodId].amount += tx.amount;
      totals[methodId].count += 1;
      grandTotal += tx.amount;
    }

    return PAYMENT_METHODS.map((m) => {
      const stats = totals[m.id];
      const percent = grandTotal > 0 ? (stats.amount / grandTotal) * 100 : 0;
      return {
        ...m,
        amount: stats.amount,
        count: stats.count,
        percent: Math.round(percent * 10) / 10,
      };
    });
  }, [filteredTxs]);

  const totalAmount = useMemo(() => {
    return distribution.reduce((sum, d) => sum + d.amount, 0);
  }, [distribution]);

  // 2. Compute date boundaries for X-axis
  const { minDate, maxDate, totalDays, dateTicks } = useMemo(() => {
    const [y, m] = activeMonth.split("-").map(Number);

    if (timeScope === "month") {
      const daysInMonth = new Date(y, m, 0).getDate();
      const ticks: { dayNum: number; label: string; percent: number }[] = [];
      for (let d = 1; d <= daysInMonth; d += 2) {
        ticks.push({
          dayNum: d,
          label: `${d}`,
          percent: ((d - 1) / (daysInMonth - 1)) * 100,
        });
      }
      return {
        minDate: new Date(y, m - 1, 1),
        maxDate: new Date(y, m - 1, daysInMonth),
        totalDays: daysInMonth,
        dateTicks: ticks,
      };
    } else {
      // Multi-month range
      const validDates = filteredTxs
        .map((t) => new Date(t.date).getTime())
        .filter((n) => !isNaN(n));

      let start = new Date(y, m - 3, 1);
      let end = new Date(y, m, 0);

      if (validDates.length > 0) {
        start = new Date(Math.min(...validDates));
        end = new Date(Math.max(...validDates));
      }

      const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
      const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);

      // 6-7 ticks across multi-month
      const ticks: { dayNum: number; label: string; percent: number }[] = [];
      const tickCount = 6;
      for (let i = 0; i < tickCount; i++) {
        const ratio = i / (tickCount - 1);
        const curDate = new Date(start.getTime() + ratio * diffTime);
        ticks.push({
          dayNum: curDate.getDate(),
          label: curDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          percent: ratio * 100,
        });
      }

      return {
        minDate: start,
        maxDate: end,
        totalDays: diffDays,
        dateTicks: ticks,
      };
    }
  }, [activeMonth, timeScope, filteredTxs]);

  // 3. Group transactions into dot points
  const dots = useMemo(() => {
    const groupMap = new Map<string, DotDataPoint>();
    const startTime = minDate.getTime();
    const endTime = maxDate.getTime();
    const timeSpan = Math.max(endTime - startTime, 86400000);

    for (const tx of filteredTxs) {
      const rawMethod = (tx.paymentMethod || "other").toLowerCase();
      const methodIndex = PAYMENT_METHODS.findIndex((m) => m.id === rawMethod);
      const safeMethod = methodIndex !== -1 ? PAYMENT_METHODS[methodIndex] : PAYMENT_METHODS[4];
      const laneIndex = methodIndex !== -1 ? methodIndex : 4;

      const txDate = new Date(tx.date);
      const dayNum = parseInt(tx.date.split("-")[2] || "1", 10);
      const clampedTime = Math.min(Math.max(txDate.getTime(), startTime), endTime);
      const xPercent = ((clampedTime - startTime) / timeSpan) * 100;

      const groupKey = `${tx.date}_${safeMethod.id}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: groupKey,
          dateStr: tx.date,
          dayNum,
          methodId: safeMethod.id,
          methodLabel: safeMethod.label,
          methodColor: safeMethod.color,
          totalAmount: tx.amount,
          count: 1,
          transactions: [tx],
          xPercent,
          yLaneIndex: laneIndex,
        });
      } else {
        const existing = groupMap.get(groupKey)!;
        existing.totalAmount += tx.amount;
        existing.count += 1;
        existing.transactions.push(tx);
      }
    }

    return Array.from(groupMap.values());
  }, [filteredTxs, minDate, maxDate]);

  // 4. Group transactions by Date into shared day summaries (for shared crosshair & tooltip)
  const dateSummaries = useMemo(() => {
    const map = new Map<string, DaySummary>();
    const startTime = minDate.getTime();
    const endTime = maxDate.getTime();
    const timeSpan = Math.max(endTime - startTime, 86400000);

    for (const tx of filteredTxs) {
      if (!tx.date) continue;

      let summary = map.get(tx.date);
      if (!summary) {
        const txDate = new Date(tx.date);
        const dayNum = parseInt(tx.date.split("-")[2] || "1", 10);
        const clampedTime = Math.min(Math.max(txDate.getTime(), startTime), endTime);
        const xPercent = ((clampedTime - startTime) / timeSpan) * 100;

        let formattedDate = tx.date;
        let fullDate = tx.date;
        try {
          const [y, m, d] = tx.date.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          formattedDate = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          fullDate = dt.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: timeScope === "all" ? "numeric" : undefined,
          });
        } catch {
          // fallback
        }

        summary = {
          dateStr: tx.date,
          dayNum,
          formattedDate,
          fullDate,
          totalAmount: 0,
          totalCount: 0,
          xPercent,
          methods: [],
        };
        map.set(tx.date, summary);
      }

      summary.totalAmount += tx.amount;
      summary.totalCount += 1;

      const rawMethod = (tx.paymentMethod || "other").toLowerCase();
      const methodIndex = PAYMENT_METHODS.findIndex((m) => m.id === rawMethod);
      const safeMethod = methodIndex !== -1 ? PAYMENT_METHODS[methodIndex] : PAYMENT_METHODS[4];
      const laneIndex = methodIndex !== -1 ? methodIndex : 4;

      let methodEntry = summary.methods.find((m) => m.methodId === safeMethod.id);
      if (!methodEntry) {
        methodEntry = {
          methodId: safeMethod.id,
          label: safeMethod.label,
          color: safeMethod.color,
          amount: 0,
          count: 0,
          laneIndex,
          icon: safeMethod.icon,
        };
        summary.methods.push(methodEntry);
      }
      methodEntry.amount += tx.amount;
      methodEntry.count += 1;
    }

    // Sort methods inside each day by amount descending
    for (const summary of map.values()) {
      summary.methods.sort((a, b) => b.amount - a.amount);
    }

    return Array.from(map.values()).sort((a, b) => a.xPercent - b.xPercent);
  }, [filteredTxs, minDate, maxDate, timeScope]);

  // Pointer Interaction Handlers for Shared Crosshair & Tooltip
  const handlePointerInteraction = (clientX: number, clientY: number) => {
    if (!surfaceRef.current || dateSummaries.length === 0) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const mouseX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const mouseY = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const xPercent = (mouseX / rect.width) * 100;

    // Find closest date summary on the X timeline
    let closest: DaySummary = dateSummaries[0];
    let minDiff = Infinity;
    for (const s of dateSummaries) {
      const diff = Math.abs(s.xPercent - xPercent);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    // Determine target lane index for Y-axis crosshair
    const laneHeight = rect.height / PAYMENT_METHODS.length;
    const targetLaneIndex = Math.min(
      Math.max(Math.floor(mouseY / laneHeight), 0),
      PAYMENT_METHODS.length - 1
    );

    // If the closest date has a payment dot in this hovered lane, align to it directly
    // Otherwise snap to the nearest payment method dot that was used on this date
    let activeLaneIndex = targetLaneIndex;
    const hasDotInTargetLane = closest.methods.some((m) => m.laneIndex === targetLaneIndex);
    if (!hasDotInTargetLane && closest.methods.length > 0) {
      let closestMethodLane = closest.methods[0].laneIndex;
      let minLaneDist = Infinity;
      for (const m of closest.methods) {
        const dist = Math.abs(m.laneIndex - targetLaneIndex);
        if (dist < minLaneDist) {
          minLaneDist = dist;
          closestMethodLane = m.laneIndex;
        }
      }
      activeLaneIndex = closestMethodLane;
    }

    const yPx = (activeLaneIndex + 0.5) * laneHeight;
    const dotXPx = (closest.xPercent / 100) * rect.width;

    // Compact tooltip sizing
    const tooltipWidth = 168;
    const tooltipHeight = 36 + closest.methods.length * 24;

    // Horizontal placement with guaranteed bounds checking to avoid screen overflow
    let tooltipX: number;
    if (dotXPx + 10 + tooltipWidth <= rect.width) {
      // Comfortably fits to the right of the dot
      tooltipX = dotXPx + 10;
    } else if (dotXPx - 10 - tooltipWidth >= 0) {
      // Comfortably fits to the left of the dot
      tooltipX = dotXPx - 10 - tooltipWidth;
    } else {
      // When centered or on narrow mobile, clamp strictly within surface boundaries
      tooltipX = Math.max(4, Math.min(dotXPx - tooltipWidth / 2, rect.width - tooltipWidth - 4));
    }

    // Vertical placement: flip above the dot if positioned in the lower half of the chart
    let tooltipY: number;
    if (yPx > rect.height * 0.52) {
      tooltipY = Math.max(4, yPx - tooltipHeight - 8);
    } else {
      tooltipY = Math.min(rect.height - tooltipHeight - 4, yPx + 8);
    }

    setActiveDateSummary(closest);
    setActiveCrosshair({
      xPercent: closest.xPercent,
      yPx,
      laneIndex: activeLaneIndex,
      tooltipX,
      tooltipY,
      tooltipWidth,
    });
  };

  const handleSurfaceMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handleSurfaceTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches.length > 0) {
      handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleSurfaceMouseLeave = () => {
    setActiveDateSummary(null);
    setActiveCrosshair(null);
  };

  const handleTypeChange = (type: "expense" | "income") => {
    setSelectedType(type);
    setHighlightedMethod(null);
    setActiveDateSummary(null);
    setActiveCrosshair(null);
  };

  return (
    <div className="space-y-3.5 select-none" ref={containerRef}>
      {/* Top Controls: Type Toggle */}
      <div className="flex items-center justify-between gap-2.5 pb-1">
        {/* Type Toggle: Expenses | Income */}
        <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded-xl border border-[#262626] self-start">
          <button
            type="button"
            onClick={() => {
              setSelectedType("expense");
              setHighlightedMethod(null);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedType === "expense"
                ? "bg-[#262626] text-rose-400 shadow-sm"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedType("income");
              setHighlightedMethod(null);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              selectedType === "income"
                ? "bg-[#262626] text-emerald-400 shadow-sm"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Horizontal Percentage Distribution Strip (Compact & Minimal) */}
      <div className="rounded-xl bg-[#181818] border border-[#242424] p-2 sm:p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] leading-tight">
          <span className="font-semibold text-[#A1A1AA] flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Payment Share</span>
          </span>
          <span className="text-[10.5px] font-mono-num text-[#71717A]">
            {formatMoney(totalAmount, settings.currency, settings.numberFormat)} · {filteredTxs.length} {filteredTxs.length === 1 ? "tx" : "txs"}
          </span>
        </div>

        {/* Slender Proportional Strip Bar */}
        <div className="w-full h-2 rounded-full bg-[#121212] overflow-hidden flex p-0.5 gap-0.5 border border-[#262626]">
          {totalAmount > 0 ? (
            distribution.map((m) => {
              if (m.percent <= 0) return null;
              const isDimmed = highlightedMethod && highlightedMethod !== m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    width: `${m.percent}%`,
                    backgroundColor: m.color,
                  }}
                  className={`h-full rounded-full transition-all duration-200 cursor-pointer ${
                    isDimmed ? "opacity-25" : "opacity-100"
                  }`}
                  onClick={() => setHighlightedMethod(highlightedMethod === m.id ? null : m.id)}
                  title={`${m.label}: ${m.percent}% (${formatMoney(m.amount, settings.currency, settings.numberFormat)})`}
                />
              );
            })
          ) : (
            <div className="w-full h-full rounded-full bg-neutral-800 opacity-40" />
          )}
        </div>

        {/* Interactive Badge Pills Fitted in Single Line */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-nowrap">
          {distribution.map((m) => {
            const isHighlighted = highlightedMethod === m.id;
            const isDimmed = highlightedMethod && !isHighlighted;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setHighlightedMethod(isHighlighted ? null : m.id)}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md border text-[10px] sm:text-[10.5px] transition cursor-pointer shrink-0 ${
                  isHighlighted
                    ? "bg-[#252525] border-white/60 shadow-sm shadow-white/10 text-white"
                    : isDimmed
                    ? "bg-[#141414] border-[#202020] text-[#52525B] opacity-40"
                    : "bg-[#141414] border-[#242424] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#333333]"
                }`}
                title={`${m.label}: ${m.percent}% (${formatMoney(m.amount, settings.currency, settings.numberFormat)})`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.color }}
                />
                <span className="font-medium text-[#D4D4D8]">{m.label}:</span>
                <span className="font-bold font-mono-num" style={{ color: isDimmed ? undefined : m.color }}>
                  {m.percent}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dot Plot Chart Container */}
      <div className="relative rounded-xl bg-[#161616] border border-[#262626] p-2.5 sm:p-4 overflow-visible">
        {filteredTxs.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-[#71717A]">
            <Wallet className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs font-semibold text-[#A1A1AA]">No {selectedType} payments found</p>
            <p className="text-[11px] text-[#71717A] mt-0.5">
              Record a transaction with a payment method to view the timeline distribution.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Y-Axis Lanes and Dot Surface */}
            <div className="relative h-52 sm:h-60 flex flex-col justify-between py-2 overflow-visible">
              {/* Horizontal Lane Guides */}
              {PAYMENT_METHODS.map((method, idx) => {
                const isSelected = highlightedMethod === method.id;
                const isDimmed = highlightedMethod && !isSelected;

                return (
                  <div
                    key={method.id}
                    className={`relative flex items-center justify-between w-full h-8 sm:h-9 rounded-lg px-1 sm:px-2 transition-colors ${
                      isSelected
                        ? "bg-white/[0.04]"
                        : idx % 2 === 0
                        ? "bg-[#181818]/40"
                        : "bg-transparent"
                    } ${isDimmed ? "opacity-30" : "opacity-100"}`}
                  >
                    {/* Y-Axis: Logos only on mobile, Logo + Label on desktop */}
                    <div className="w-6 sm:w-28 md:w-32 flex items-center gap-1.5 shrink-0 z-10 pointer-events-none">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${method.color}25`, color: method.color }}
                        title={method.subLabel ? `${method.label} (${method.subLabel})` : method.label}
                      >
                        <method.icon className="w-3 h-3" />
                      </div>
                      <span className="hidden sm:inline text-[11px] font-medium text-[#D4D4D8] truncate">
                        {method.label}
                      </span>
                    </div>

                    {/* Lane dashed reference line */}
                    <div className="flex-1 h-[1px] border-b border-dashed border-[#242424] ml-1.5 sm:ml-3" />
                  </div>
                );
              })}

              {/* Plotted Dots Surface Layer with Interactive Shared Tooltip & Crosshair */}
              <div
                ref={surfaceRef}
                onMouseMove={handleSurfaceMouseMove}
                onMouseLeave={handleSurfaceMouseLeave}
                onTouchStart={handleSurfaceTouch}
                onTouchMove={handleSurfaceTouch}
                onTouchEnd={handleSurfaceMouseLeave}
                className="absolute inset-0 left-8 sm:left-32 md:left-36 right-2 sm:right-4 pointer-events-auto cursor-crosshair overflow-visible select-none"
              >
                {/* Minimal Crosshairs & Reticle */}
                {activeCrosshair && activeDateSummary && (
                  <>
                    {/* Vertical Crosshair Line (Clean 1px guideline) */}
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-20 -translate-x-1/2"
                      style={{ left: `${Math.min(Math.max(activeCrosshair.xPercent, 1.5), 98.5)}%` }}
                    >
                      <div className="w-[1px] h-full bg-cyan-400/60" />

                      {/* Crosshair Top Date Badge */}
                      <div className="absolute -top-3.5 -translate-x-1/2 px-1.5 py-0.2 rounded bg-[#181818] border border-cyan-500/40 text-[8.5px] font-mono-num font-semibold text-cyan-300 shadow-sm whitespace-nowrap z-30">
                        {activeDateSummary.formattedDate}
                      </div>
                    </div>

                    {/* Horizontal Crosshair Line aligned with the active data point / lane */}
                    <div
                      className="absolute left-0 right-0 pointer-events-none z-20 -translate-y-1/2"
                      style={{ top: `${activeCrosshair.yPx}px` }}
                    >
                      <div className="h-[1px] w-full border-b border-dashed border-neutral-700/60" />
                      {/* Subtle, refined reticle circle on the active point */}
                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-cyan-400/80 bg-cyan-400/15 pointer-events-none"
                        style={{
                          left: `${Math.min(Math.max(activeCrosshair.xPercent, 1.5), 98.5)}%`,
                          top: "0.5px",
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Plotted Dots with Clean, Minimal Highlight Styling */}
                {dots.map((dot) => {
                  const isMethodHighlighted = !highlightedMethod || highlightedMethod === dot.methodId;
                  const isDateActive = activeDateSummary?.dateStr === dot.dateStr;
                  const isLaneActive = isDateActive && activeCrosshair?.laneIndex === dot.yLaneIndex;

                  // Y calculation based on lane index (0 to 4 across 5 lanes)
                  const lanePercent = (dot.yLaneIndex + 0.5) * (100 / PAYMENT_METHODS.length);

                  return (
                    <div
                      key={dot.id}
                      style={{
                        left: `${Math.min(Math.max(dot.xPercent, 1.5), 98.5)}%`,
                        top: `${lanePercent}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 pointer-events-none ${
                        isLaneActive
                          ? "z-30 scale-125"
                          : isDateActive
                          ? "z-20 scale-110"
                          : activeDateSummary
                          ? "opacity-35 scale-90 z-10"
                          : isMethodHighlighted
                          ? "opacity-100 scale-100 z-10"
                          : "opacity-15 scale-75 z-0"
                      }`}
                    >
                      {/* Dot point with crisp minimal rings */}
                      <div
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-[#161616] flex items-center justify-center shadow-sm transition-all duration-100 ${
                          isLaneActive
                            ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#161616]"
                            : isDateActive
                            ? "ring-1.5 ring-white/80 ring-offset-1 ring-offset-[#161616]"
                            : ""
                        }`}
                        style={{ backgroundColor: dot.methodColor }}
                      >
                        {dot.count > 1 && (
                          <span className="text-[7.5px] font-bold text-black font-mono-num leading-none">
                            {dot.count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Compact, Viewport-Bounded Tooltip */}
                {activeDateSummary && activeCrosshair && (
                  <div
                    className="absolute z-40 pointer-events-none transition-all duration-75 select-none"
                    style={{
                      left: `${activeCrosshair.tooltipX}px`,
                      top: `${activeCrosshair.tooltipY}px`,
                      width: `${activeCrosshair.tooltipWidth}px`,
                    }}
                  >
                    <div className="bg-[#121212]/95 backdrop-blur-md border border-[#282828] rounded-lg p-2 shadow-xl shadow-black/80 text-[11px] space-y-1.5">
                      {/* Header: Date + Total Inflow/Outflow */}
                      <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-[#222222]">
                        <div className="flex items-center gap-1 min-w-0">
                          <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="font-semibold text-[#F5F5F5] text-[10.5px] truncate">
                            {activeDateSummary.formattedDate}
                          </span>
                        </div>
                        <span className={`font-mono-num font-bold text-[11px] shrink-0 ${
                          selectedType === "expense" ? "text-rose-400" : "text-emerald-400"
                        }`}>
                          {formatMoney(activeDateSummary.totalAmount, settings.currency, settings.numberFormat)}
                        </span>
                      </div>

                      {/* Payment Methods Breakdown */}
                      <div className="space-y-0.5">
                        {activeDateSummary.methods.map((method) => {
                          const isTargetLane = method.laneIndex === activeCrosshair.laneIndex;

                          return (
                            <div
                              key={method.methodId}
                              className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded transition-colors ${
                                isTargetLane
                                  ? "bg-white/[0.08] text-white"
                                  : "text-[#A1A1AA]"
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: method.color }}
                                />
                                <span className="text-[10px] font-medium truncate">
                                  {method.label.split("/")[0].trim()}
                                </span>
                                {method.count > 1 && (
                                  <span className="text-[8px] font-mono-num text-[#71717A]">
                                    ×{method.count}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10.5px] font-mono-num font-semibold text-[#E4E4E7] shrink-0">
                                {formatMoney(method.amount, settings.currency, settings.numberFormat)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* X-Axis Date Ticks (Maximized space on mobile, 2-day gaps) */}
            <div className="relative border-t border-[#262626] pt-1.5 ml-8 sm:ml-32 md:ml-36 mr-2 sm:mr-4 h-6">
              {dateTicks.map((tick, i) => (
                <div
                  key={i}
                  style={{ left: `${Math.min(Math.max(tick.percent, 1.5), 98.5)}%` }}
                  className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
                >
                  <div className="w-[1px] h-1.5 bg-[#333333] -mt-1.5" />
                  <span className="text-[8px] sm:text-[9.5px] font-mono-num text-[#71717A] mt-0.5 font-medium whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              ))}
            </div>

            {/* X-Axis Title */}
            <div className="text-center pt-2 text-[9.5px] text-[#52525B] font-medium tracking-wide uppercase">
              {timeScope === "month" ? "Day of Month" : "Timeline Dates"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
