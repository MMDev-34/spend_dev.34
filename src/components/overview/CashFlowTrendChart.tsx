import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";

export interface CashFlowDataPoint {
  date: string;
  dayNum?: number;
  label: string;
  fullLabel?: string;
  spending: number;
  earning: number;
  net: number;
  isMonthly?: boolean;
}

interface CashFlowTrendChartProps {
  cashFlowTrendData: CashFlowDataPoint[];
  totalExpense: number;
  totalIncome: number;
  timeScope: string;
  xAxisTicks?: string[];
  settings: Settings;
}

export const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  cashFlowTrendData,
  totalExpense,
  totalIncome,
  timeScope,
  xAxisTicks,
  settings,
}) => {
  if (!cashFlowTrendData.length || (totalExpense === 0 && totalIncome === 0)) {
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
    <div className="rounded-xl sm:rounded-2xl bg-[#141414] border border-[#262626] p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3 shadow-sm">
      {/* Header & Responsive Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5]">Cash Flow Trend</h3>
          {timeScope === "all" && cashFlowTrendData[0]?.isMonthly && (
            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium" title="Multi-month/multi-year data is aggregated by month for clean trend analysis">
              Monthly View ({cashFlowTrendData.length} mo)
            </span>
          )}
        </div>

        {/* Interactive Legend with Totals */}
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono-num self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#181818] border border-[#262626]">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-[#A1A1AA]">Spent:</span>
            <span className="font-bold text-rose-400">
              {formatMoney(totalExpense, settings.currency, settings.numberFormat)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#181818] border border-[#262626]">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-[#A1A1AA]">Earned:</span>
            <span className="font-bold text-blue-400">
              {formatMoney(totalIncome, settings.currency, settings.numberFormat)}
            </span>
          </div>
        </div>
      </div>

      {/* Smooth Line Curve Area Chart */}
      <div className="pt-1 w-full overflow-hidden outline-none focus:outline-none">
        <ResponsiveContainer width="100%" height={220} className="sm:!h-[250px]">
          <AreaChart data={cashFlowTrendData} margin={{ top: 10, right: 8, left: -4, bottom: 4 }}>
            <defs>
              <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="earningGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
