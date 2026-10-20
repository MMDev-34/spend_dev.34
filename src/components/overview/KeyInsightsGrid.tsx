import React from "react";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { 
  Flame, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Award,
  Sparkles
} from "lucide-react";

export interface FinancialInsightsData {
  largestExpense: any;
  avgDailySpend: number;
  topCategory: { name: string; value: number; percentage: number } | null;
  highestSpentDay: { date: string; amount: number; topItem?: string } | null;
  highestIncomeDay: { date: string; amount: number; topItem?: string } | null;
  noSpendDaysCount: number;
  totalDaysInScope: number;
  noSpendPercentage: number;
  safeToSpendDaily: number;
  safeStatusText: string;
}

interface KeyInsightsGridProps {
  insights: FinancialInsightsData | null;
  settings: Settings;
  formatInsightDate: (dateStr: string) => string;
}

export const KeyInsightsGrid: React.FC<KeyInsightsGridProps> = ({
  insights,
  settings,
  formatInsightDate,
}) => {
  return (
    <div className="lg:col-span-6 rounded-2xl bg-[#141414] border border-[#262626] p-2.5 sm:p-4 space-y-2 sm:space-y-3 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 border-b border-[#262626]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          <h3 className="text-xs sm:text-sm font-bold text-[#F5F5F5]">Financial Insights</h3>
        </div>
        <span className="text-[9.5px] sm:text-[10.5px] font-medium text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">
          Activity Highlights
        </span>
      </div>

      {/* Insights Cards */}
      <div className="space-y-2 sm:space-y-2.5 text-xs flex-1 flex flex-col justify-between">
        {/* 2x2 Grid of Key Financial Highlights */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch">
          {/* 1. Highest Spent Day */}
          <div className="h-[74px] sm:h-[96px] bg-[#181818] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#383838] rounded-xl p-2 sm:p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#A1A1AA] truncate">Peak Spend</span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] font-medium text-[#71717A] bg-[#222222] border border-[#2D2D2D] px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded shrink-0 font-mono-num">
                {insights?.highestSpentDay ? formatInsightDate(insights.highestSpentDay.date) : "—"}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-base lg:text-lg font-bold font-mono-num text-white leading-none truncate">
                {insights?.highestSpentDay ? (
                  <>
                    <span className="text-rose-400 font-semibold mr-0.5">-</span>
                    {formatMoney(insights.highestSpentDay.amount, settings.currency, settings.numberFormat)}
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#71717A] truncate mt-0.5 sm:mt-1">
                {insights?.highestSpentDay?.topItem || (insights?.highestSpentDay ? "Peak outflow" : "No expenses")}
              </div>
            </div>
          </div>

          {/* 2. Highest Income Day */}
          <div className="h-[74px] sm:h-[96px] bg-[#181818] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#383838] rounded-xl p-2 sm:p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#A1A1AA] truncate">Peak Inflow</span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] font-medium text-[#71717A] bg-[#222222] border border-[#2D2D2D] px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded shrink-0 font-mono-num">
                {insights?.highestIncomeDay ? formatInsightDate(insights.highestIncomeDay.date) : "—"}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-base lg:text-lg font-bold font-mono-num text-white leading-none truncate">
                {insights?.highestIncomeDay ? (
                  <>
                    <span className="text-emerald-400 font-semibold mr-0.5">+</span>
                    {formatMoney(insights.highestIncomeDay.amount, settings.currency, settings.numberFormat)}
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#71717A] truncate mt-0.5 sm:mt-1">
                {insights?.highestIncomeDay?.topItem || (insights?.highestIncomeDay ? "Peak income" : "No income")}
              </div>
            </div>
          </div>

          {/* 3. Safe-to-Spend Daily Limit */}
          <div className="h-[74px] sm:h-[96px] bg-[#181818] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#383838] rounded-xl p-2 sm:p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#A1A1AA] truncate">Safe-to-Spend</span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] font-medium text-cyan-400/90 bg-cyan-500/10 border border-cyan-500/20 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded shrink-0 font-mono-num">
                Daily
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-base lg:text-lg font-bold font-mono-num text-white leading-none truncate">
                {formatMoney(insights?.safeToSpendDaily || 0, settings.currency, settings.numberFormat)}
                <span className="text-[9.5px] sm:text-[11px] font-normal text-[#71717A] ml-0.5">/ day</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#71717A] truncate mt-0.5 sm:mt-1">
                {insights?.safeStatusText}
              </div>
            </div>
          </div>

          {/* 4. No-Spend Days Counter */}
          <div className="h-[74px] sm:h-[96px] bg-[#181818] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#383838] rounded-xl p-2 sm:p-3 flex flex-col justify-between transition-colors">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#A1A1AA] truncate">No-Spend</span>
              </div>
              <span className="text-[8.5px] sm:text-[9.5px] font-medium text-violet-400/90 bg-violet-500/10 border border-violet-500/20 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded shrink-0 font-mono-num">
                {insights?.noSpendPercentage ?? 0}%
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-base lg:text-lg font-bold font-mono-num text-white leading-none truncate">
                {insights?.noSpendDaysCount ?? 0}
                <span className="text-[9.5px] sm:text-[11px] font-normal text-[#71717A] ml-0.5">/ {insights?.totalDaysInScope ?? 30}d</span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-[#71717A] truncate mt-0.5 sm:mt-1">
                {insights?.noSpendPercentage ?? 0}% zero outflow
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Top Spending Category */}
        {insights?.topCategory && (
          <div className="p-2 sm:p-3 rounded-xl bg-[#181818] hover:bg-[#1C1C1C] border border-[#262626] hover:border-[#383838] flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-[#F5F5F5] block truncate">
                  Top Category: <span className="text-amber-400">{insights.topCategory.name}</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-[#71717A] truncate block mt-0.5">
                  Accounts for largest share
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 font-mono-num pl-2 sm:pl-3">
              <span className="text-xs sm:text-sm font-bold text-white block">
                {formatMoney(insights.topCategory.value, settings.currency, settings.numberFormat)}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-semibold text-amber-400 block mt-0.5">
                {Math.round(insights.topCategory.percentage)}% of spend
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
