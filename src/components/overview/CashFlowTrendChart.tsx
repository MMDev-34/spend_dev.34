import React, { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Layers, AlertTriangle } from "lucide-react";
import { Settings } from "@/types/settings";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { formatMoney } from "@/utils/currency";
import { PaymentMethodsDotChart } from "./PaymentMethodsDotChart";

export interface CashFlowDataPoint {
  date: string;
  dayNum?: number;
  label: string;
  fullLabel?: string;
  spending: number;
  earning: number;
  unwanted?: number;
  net: number;
  isMonthly?: boolean;
}

interface CashFlowTrendChartProps {
  cashFlowTrendData: CashFlowDataPoint[];
  totalExpense: number;
  totalIncome: number;
  totalUnwanted?: number;
  timeScope: string;
  xAxisTicks?: string[];
  settings: Settings;
  transactions?: Transaction[];
  categories?: Category[];
  activeMonth?: string;
}

export const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  cashFlowTrendData,
  totalExpense,
  totalIncome,
  totalUnwanted = 0,
  timeScope,
  xAxisTicks,
  settings,
  transactions = [],
  categories = [],
  activeMonth = "",
}) => {
  const [activeTab, setActiveTab] = useState<"trend" | "methods">("trend");
  const [showUnwanted, setShowUnwanted] = useState<boolean>(false);

  // Dynamic scaling based on amount digit length to guarantee 1-line fit
  const spentFormatted = useMemo(
    () => formatMoney(totalExpense, settings.currency, settings.numberFormat),
    [totalExpense, settings.currency, settings.numberFormat]
  );
  const earnedFormatted = useMemo(
    () => formatMoney(totalIncome, settings.currency, settings.numberFormat),
    [totalIncome, settings.currency, settings.numberFormat]
  );
  const unwantedFormatted = useMemo(
    () => formatMoney(totalUnwanted, settings.currency, settings.numberFormat),
    [totalUnwanted, settings.currency, settings.numberFormat]
  );

  const maxDigits = useMemo(() => {
    return Math.max(
      spentFormatted.length,
      earnedFormatted.length
    );
  }, [spentFormatted, earnedFormatted]);

  if (!cashFlowTrendData.length && !transactions.length) {
    return null;
  }

  const CustomCashFlowTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      const title = data.fullLabel || (data.dayNum !== undefined ? `Day ${data.dayNum}` : String(data.label || ""));
      const isMonthly = !!data.isMonthly;

      return (
        <div className="bg-black/95 backdrop-blur-md border border-neutral-800 rounded-xl p-2.5 sm:p-3 shadow-2xl text-xs space-y-1.5 z-50">
          <div className="text-[#A1A1AA] font-semibold text-[10.5px] sm:text-[11px] pb-1 border-b border-[#262626] flex items-center justify-between gap-3">
            <span>{title}</span>
            {isMonthly && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-[#A1A1AA] border border-neutral-700 font-medium">
                Monthly Total
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 font-mono-num">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Spending</span>
            </span>
            <span className="text-rose-400 font-bold">
              {formatMoney(data.spending || 0, settings.currency, settings.numberFormat)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono-num">
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Earning</span>
            </span>
            <span className="text-blue-400 font-bold">
              {formatMoney(data.earning || 0, settings.currency, settings.numberFormat)}
            </span>
          </div>
          {(showUnwanted || (data.unwanted !== undefined && data.unwanted > 0)) && (
            <div className="flex items-center justify-between gap-4 font-mono-num">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Unwanted</span>
              </span>
              <span className="text-amber-400 font-bold">
                {formatMoney(data.unwanted || 0, settings.currency, settings.numberFormat)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 font-mono-num pt-1 border-t border-[#262626]/70 text-[10.5px]">
            <span className="text-[#71717A]">{isMonthly ? "Month Net" : "Day Net"}</span>
            <span className={`font-bold ${data.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {data.net >= 0 ? "+" : ""}{formatMoney(data.net || 0, settings.currency, settings.numberFormat)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] p-3 sm:p-4 md:p-5 space-y-3 shadow-sm">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-[#222222]">
        {/* Left: Compact segmented buttons + Small ON/OFF button */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* Segmented View Tabs (Compact) */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[#181818] rounded-xl border border-[#262626]">
            <button
              type="button"
              onClick={() => setActiveTab("trend")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "trend"
                  ? "bg-[#262626] text-[#F5F5F5] shadow-sm"
                  : "text-[#71717A] hover:text-[#D4D4D8]"
              }`}
            >
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
              <span>Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("methods")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "methods"
                  ? "bg-[#262626] text-cyan-400 shadow-sm"
                  : "text-[#71717A] hover:text-[#D4D4D8]"
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0" />
              <span>Payments</span>
            </button>
          </div>

          {/* Compact ON/OFF toggle button for unwanted money (shows summary amount when ON) */}
          {activeTab === "trend" && (
            <button
              type="button"
              onClick={() => setShowUnwanted(!showUnwanted)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer shrink-0 ${
                showUnwanted
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-950/20"
                  : "bg-[#181818] border-[#262626] text-[#71717A] hover:text-[#D4D4D8] hover:border-[#333333]"
              }`}
              title="Toggle unwanted money curve on/off"
            >
              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${showUnwanted ? "text-amber-400" : "text-[#71717A]"}`} />
              {showUnwanted ? (
                <>
                  <span className="font-mono-num font-bold text-amber-400">
                    {unwantedFormatted}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 animate-pulse" />
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-400">
                    ON
                  </span>
                </>
              ) : (
                <>
                  <span>Unwanted</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-neutral-600" />
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">
                    OFF
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Spent & Earned blocks in an equal 50/50 split (unwanted amount is shown on the toggle button) */}
        {activeTab === "trend" ? (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full sm:w-auto font-mono-num min-w-0">
            {/* Spent Block (50% Split) */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg bg-[#181818] border border-[#262626] min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0" />
                <span className="text-[#A1A1AA]">Spent:</span>
              </div>
              <span className={`font-bold text-rose-400 truncate ${maxDigits > 11 ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"}`}>
                {spentFormatted}
              </span>
            </div>

            {/* Earned Block (50% Split) */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg bg-[#181818] border border-[#262626] min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 shrink-0" />
                <span className="text-[#A1A1AA]">Earned:</span>
              </div>
              <span className={`font-bold text-blue-400 truncate ${maxDigits > 11 ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm"}`}>
                {earnedFormatted}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[#71717A] hidden sm:block">
            Timeline Dot Distribution & Method Breakdown
          </div>
        )}
      </div>

      {/* Tab 1: Continuous Cash Flow Area Chart */}
      {activeTab === "trend" && (
        <div className="pt-1 w-full overflow-hidden outline-none focus:outline-none">
          <ResponsiveContainer width="100%" height={220} className="sm:!h-[250px]">
            <AreaChart 
              key={`trend-chart-${showUnwanted ? "unwanted" : "normal"}-${cashFlowTrendData.length}-${totalUnwanted}`}
              data={cashFlowTrendData} 
              margin={{ top: 10, right: 8, left: -4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="earningGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="unwantedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1A" />
              <XAxis 
                dataKey="date" 
                ticks={xAxisTicks}
                interval={0}
                tick={{ fill: "#A1A1AA", fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                angle={0}
                textAnchor="middle"
                height={24}
                dy={6}
                tickFormatter={(dateVal) => {
                  const item = cashFlowTrendData.find((d) => d.date === dateVal);
                  return item ? item.label : dateVal;
                }}
              />
              <YAxis 
                tick={{ fill: "#A1A1AA", fontSize: 7.2 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => {
                  if (v === 0) return "0";
                  const major = Math.round(v / 100);
                  if (major >= 1000) {
                    const k = major / 1000;
                    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
                  }
                  return `${major}`;
                }}
              />
              <Tooltip 
                content={<CustomCashFlowTooltip />} 
                cursor={{ stroke: "#52525B", strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area 
                type="monotone" 
                dataKey="spending" 
                stroke="#EF4444" 
                strokeWidth={2.2} 
                fillOpacity={1} 
                fill="url(#spendingGrad)" 
                dot={false}
                activeDot={{ r: 4, fill: "#EF4444", stroke: "#000000", strokeWidth: 2 }}
                name="Spending" 
              />
              <Area 
                type="monotone" 
                dataKey="earning" 
                stroke="#3B82F6" 
                strokeWidth={2.2} 
                fillOpacity={1} 
                fill="url(#earningGrad)" 
                dot={false}
                activeDot={{ r: 4, fill: "#3B82F6", stroke: "#000000", strokeWidth: 2 }}
                name="Earning" 
              />
              {showUnwanted && (
                <Area 
                  type="monotone" 
                  dataKey="unwanted" 
                  stroke="#F59E0B" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#unwantedGrad)" 
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload || !payload.unwanted || payload.unwanted <= 0) {
                      return <g key={`dot-empty-${props.index}`} />;
                    }
                    return (
                      <circle
                        key={`dot-unwanted-${props.index}`}
                        cx={cx}
                        cy={cy}
                        r={3.5}
                        fill="#F59E0B"
                        stroke="#000000"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 4.5, fill: "#F59E0B", stroke: "#000000", strokeWidth: 2 }}
                  name="Unwanted Spend" 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab 2: Payment Methods Dot Plot Chart */}
      {activeTab === "methods" && (
        <PaymentMethodsDotChart
          transactions={transactions}
          categories={categories}
          settings={settings}
          timeScope={timeScope}
          activeMonth={activeMonth}
        />
      )}
    </div>
  );
};
