import React, { useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { CircleDot, Plus } from "lucide-react";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";

export interface CategoryChartItem {
  id: string;
  name: string;
  icon: string;
  value: number;
  percentage: number;
  count: number;
  color: string;
}

interface CategoryDonutSectionProps {
  categoryData: CategoryChartItem[];
  totalExpense: number;
  settings: Settings;
  hoveredCategory: string | null;
  setHoveredCategory: (catId: string | null) => void;
  donutQuadrant: "left" | "right";
  setDonutQuadrant: (quadrant: "left" | "right") => void;
  openAddModal: (type: "expense" | "income") => void;
}

export const CategoryDonutSection: React.FC<CategoryDonutSectionProps> = ({
  categoryData,
  totalExpense,
  settings,
  hoveredCategory,
  setHoveredCategory,
  donutQuadrant,
  setDonutQuadrant,
  openAddModal,
}) => {
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);

  // Effective active category ID: either actively hovered or pinned via click/tap
  const effectiveCategoryId = hoveredCategory || pinnedCategory;

  const activeCategoryData = useMemo(() => {
    if (!effectiveCategoryId) return null;
    return categoryData.find((c) => c.id === effectiveCategoryId) || null;
  }, [effectiveCategoryId, categoryData]);

  const handleCategoryClick = (categoryId: string, e?: any) => {
    if (pinnedCategory === categoryId) {
      setPinnedCategory(null);
      setHoveredCategory(null);
    } else {
      setPinnedCategory(categoryId);
      setHoveredCategory(categoryId);

      if (e) {
        const clientX = e?.clientX ?? e?.nativeEvent?.clientX ?? (e?.touches && e.touches[0]?.clientX);
        if (typeof clientX === "number" && clientX > 0) {
          const targetRect = (e?.target as HTMLElement)?.closest("svg")?.getBoundingClientRect();
          if (targetRect) {
            const mid = targetRect.left + targetRect.width / 2;
            setDonutQuadrant(clientX > mid ? "left" : "right");
          }
        }
      }
    }
  };

  const handleCategoryHover = (categoryId: string, e?: any) => {
    setHoveredCategory(categoryId);
    if (e) {
      const clientX = e?.clientX ?? e?.nativeEvent?.clientX ?? (e?.touches && e.touches[0]?.clientX);
      if (typeof clientX === "number" && clientX > 0) {
        const targetRect = (e?.target as HTMLElement)?.closest("svg")?.getBoundingClientRect();
        if (targetRect) {
          const mid = targetRect.left + targetRect.width / 2;
          setDonutQuadrant(clientX > mid ? "left" : "right");
        }
      }
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = (payload[0]?.payload || payload[0]) as CategoryChartItem;
    if (!item || !item.name) return null;

    return (
      <div className="bg-black border border-neutral-700 rounded-lg p-2 shadow-2xl text-[11px] space-y-0.5 min-w-[120px] pointer-events-none select-none z-[9999]">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[#222222]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-xs shrink-0">{item.icon}</span>
          <span className="font-bold text-white truncate">{item.name}</span>
        </div>
        <div className="text-emerald-400 font-bold font-mono-num text-xs pt-0.5">
          {formatMoney(item.value, settings.currency, settings.numberFormat)}
        </div>
        <div className="text-[9.5px] text-neutral-400 font-medium flex items-center justify-between gap-1">
          <span className="font-semibold text-white">{Math.round(item.percentage)}%</span>
          <span className="text-neutral-500">· {item.count} {item.count === 1 ? "entry" : "entries"}</span>
        </div>
      </div>
    );
  };

  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius } = props;
    const rawPct = props.percentage !== undefined 
      ? props.percentage 
      : (props.percent ? props.percent * 100 : 0);

    if (rawPct === undefined || rawPct <= 0) return null;

    const displayPct = rawPct < 1 ? "<1%" : `${Math.round(rawPct)}%`;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 10) * cos;
    const my = cy + (outerRadius + 10) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";

    return (
      <g>
        <circle cx={sx} cy={sy} r={1.2} fill="#71717A" />
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke="#71717A"
          strokeWidth={1}
          fill="none"
          strokeOpacity={0.75}
        />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 3}
          y={ey}
          textAnchor={textAnchor}
          fill="#D4D4D8"
          dominantBaseline="central"
          fontSize={10}
          fontWeight={600}
          fontFamily="monospace"
        >
          {displayPct}
        </text>
      </g>
    );
  };

  return (
    <div className="lg:col-span-6 rounded-2xl bg-[#141414] border border-[#262626] p-3.5 sm:p-4 space-y-3 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-[#F5F5F5]">Expense Breakdown by Category</h3>
        </div>
        <span className="text-[11px] text-[#71717A] font-mono-num">
          {categoryData.length} {categoryData.length === 1 ? "category" : "categories"}
        </span>
      </div>

      {categoryData.length === 0 ? (
        <div className="py-10 text-center space-y-3 my-auto">
          <div className="w-11 h-11 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-[#71717A]">
            <CircleDot className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#F5F5F5]">No expenses recorded for this period</h4>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              Log a few transactions in the Activity tab to unlock visual category analytics.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddModal("expense")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Expense</span>
          </button>
        </div>
      ) : (
        <div 
          className="flex flex-col items-center gap-1.5 pt-1 flex-1" 
          onMouseLeave={() => {
            if (!pinnedCategory) setHoveredCategory(null);
          }}
        >
          {/* Donut Graph with Dynamic Center Info */}
          <div className="relative w-full h-[200px] sm:h-[210px] shrink-0 flex items-center justify-center select-none">
            {/* Center Info Pod */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCategory(null);
                  setHoveredCategory(null);
                }}
                className="w-[94px] h-[94px] rounded-full bg-black border border-neutral-800 hover:border-neutral-700 shadow-xl flex flex-col items-center justify-center p-1 text-center transition-all duration-200 pointer-events-auto cursor-pointer"
                title="Click to view total spent"
              >
                <span className="text-[9px] uppercase tracking-wider text-[#71717A] font-semibold block leading-tight">Total Spent</span>
                <div className="text-xs sm:text-sm font-bold text-white font-mono-num leading-tight truncate max-w-[84px]">
                  {formatMoney(totalExpense, settings.currency, settings.numberFormat)}
                </div>
                {activeCategoryData ? (
                  <div className="text-[9.5px] text-emerald-400 font-semibold truncate max-w-[82px] leading-tight pt-0.5 animate-in fade-in duration-100">
                    {activeCategoryData.name} ({Math.round(activeCategoryData.percentage)}%)
                  </div>
                ) : (
                  <span className="text-[9px] text-[#71717A] font-medium block leading-tight pt-0.5">
                    {categoryData.length} {categoryData.length === 1 ? "category" : "categories"}
                  </span>
                )}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200} className="relative z-30">
              <PieChart margin={{ top: 15, right: 25, bottom: 15, left: 25 }}>
                <Tooltip 
                  content={<CustomTooltip />} 
                  position={{ x: undefined, y: undefined }}
                  offset={55}
                  wrapperStyle={{ zIndex: 99999, pointerEvents: 'none' }}
                />
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  minAngle={3}
                  paddingAngle={categoryData.length > 1 ? 2 : 0}
                  dataKey="value"
                  stroke="#141414"
                  strokeWidth={2}
                  labelLine={false}
                  label={renderCustomizedLabel}
                  onClick={(entry: any, index: number, e: any) => {
                    const id = entry?.id || entry?.payload?.id || categoryData[index]?.id;
                    if (id) {
                      handleCategoryClick(id, e);
                    }
                  }}
                  onMouseEnter={(entry: any, index: number, e: any) => {
                    const id = entry?.id || entry?.payload?.id || categoryData[index]?.id;
                    if (id) {
                      handleCategoryHover(id, e);
                    }
                  }}
                >
                  {categoryData.map((entry, index) => {
                    const isSelected = effectiveCategoryId === entry.id;
                    return (
                      <Cell 
                        key={`slice-${entry.id || index}`} 
                        fill={entry.color}
                        stroke={isSelected ? "#FFFFFF" : "#141414"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        opacity={effectiveCategoryId && !isSelected ? 0.35 : 1}
                        className="transition-all cursor-pointer outline-none"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          handleCategoryClick(entry.id, e);
                        }}
                        onTouchEnd={(e: any) => {
                          e.stopPropagation();
                          handleCategoryClick(entry.id, e);
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Categories Pill Grid */}
          <div className="w-full pt-2 border-t border-[#262626]/70">
            <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-1 overflow-x-auto pb-1 max-w-full justify-start sm:justify-center items-center scrollbar-none">
              {categoryData.map((item) => (
                <div 
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => handleCategoryHover(item.id)}
                  onMouseLeave={() => {
                    if (!pinnedCategory) setHoveredCategory(null);
                  }}
                  onClick={() => handleCategoryClick(item.id)}
                >
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all cursor-pointer select-none text-[10px] ${
                      effectiveCategoryId === item.id 
                        ? "bg-black border-neutral-500 text-white shadow-sm scale-[1.02]" 
                        : "bg-[#181818] border-[#262626] text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] shrink-0">{item.icon}</span>
                    <span className="font-medium text-[10px] truncate max-w-[85px] sm:max-w-[105px]">{item.name}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
