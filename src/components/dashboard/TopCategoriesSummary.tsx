import React from "react";
import { CategoryTotal } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { Settings } from "@/types/settings";
import { ChevronRight, Layers } from "lucide-react";
import { useRouter } from "@/app/router";

interface TopCategoriesSummaryProps {
  categories: CategoryTotal[];
  settings: Settings;
}

export const TopCategoriesSummary: React.FC<TopCategoriesSummaryProps> = ({
  categories,
  settings,
}) => {
  const { navigate } = useRouter();
  const topThree = categories.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#141414] border border-[#262626] p-5 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
            Top Categories
          </h3>
        </div>

        <button
          onClick={() => navigate("/overview")}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 transition"
        >
          <span>All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {topThree.map((item) => (
          <div
            key={item.categoryId}
            onClick={() => navigate("/transactions")}
            className="group cursor-pointer space-y-1.5 p-1 rounded-xl hover:bg-neutral-800/30 transition"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">{item.categoryIcon}</span>
                <span className="font-semibold text-[#F5F5F5] group-hover:text-emerald-400 transition-colors">
                  {item.categoryName}
                </span>
                <span className="text-[11px] text-[#71717A]">
                  · {item.count} {item.count === 1 ? "expense" : "expenses"}
                </span>
              </div>

              <div className="text-right font-mono-num">
                <span className="font-semibold text-[#F5F5F5]">
                  {formatMoney(item.total, settings.currency, settings.numberFormat)}
                </span>
                <span className="text-[11px] text-[#71717A] ml-2">
                  {Math.round(item.percentage)}%
                </span>
              </div>
            </div>

            {/* Horizontal Mini Bar */}
            <div className="w-full bg-[#1C1C1C] h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 group-hover:brightness-110"
                style={{
                  width: `${Math.min(100, Math.max(8, item.percentage))}%`,
                  backgroundColor: item.categoryColor || "#3B82F6",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
