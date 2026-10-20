import React, { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { CategoryBudgetCard } from "@/components/budget/CategoryBudgetCard";
import { CategoryBudgetDrilldownModal } from "@/components/budget/CategoryBudgetDrilldownModal";
import { AddBudgetModal } from "@/components/budget/AddBudgetModal";
import { FinancialCalendar } from "@/components/calendar/FinancialCalendar";
import { AddRecurringModal } from "@/components/calendar/AddRecurringModal";
import { 
  calculateCategoryBudgetProgress, 
  CategoryBudgetProgress 
} from "@/utils/calculations";
import { BudgetDuration, CategoryBudget } from "@/types/plan";
import { Category } from "@/types/category";
import { 
  Target, 
  CalendarRange, 
  Plus, 
  PieChart
} from "lucide-react";

export const PlanPage: React.FC = () => {
  const categoryBudgets = useAppStore((s) => s.categoryBudgets || []);
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);

  const [activeTab, setActiveTab] = useState<"budgets" | "calendar">("budgets");
  const [filterDuration, setFilterDuration] = useState<"all" | BudgetDuration>("all");
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);

  // Drilldown Modal State
  const [drilldownBudget, setDrilldownBudget] = useState<CategoryBudget | null>(null);
  const [drilldownCategory, setDrilldownCategory] = useState<Category | null>(null);
  const [drilldownProgress, setDrilldownProgress] = useState<CategoryBudgetProgress | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Compute progress for each category budget
  const budgetProgressList = useMemo(() => {
    return categoryBudgets.map((budget) => {
      const cat = categoryMap.get(budget.categoryId) || {
        id: budget.categoryId,
        name: "Unknown",
        icon: "📦",
        color: "#71717A",
        type: "expense" as const,
        isDefault: false,
        createdAt: "",
      };

      const progress = calculateCategoryBudgetProgress(
        budget,
        transactions,
        settings.weekStartsOn
      );

      return {
        budget,
        category: cat,
        progress,
      };
    });
  }, [categoryBudgets, categoryMap, transactions, settings.weekStartsOn]);

  // Filtered by duration
  const filteredBudgets = useMemo(() => {
    if (filterDuration === "all") return budgetProgressList;
    return budgetProgressList.filter((b) => b.budget.duration === filterDuration);
  }, [budgetProgressList, filterDuration]);

  const handleOpenDrilldown = (item: {
    budget: CategoryBudget;
    category: Category;
    progress: CategoryBudgetProgress;
  }) => {
    setDrilldownBudget(item.budget);
    setDrilldownCategory(item.category);
    setDrilldownProgress(item.progress);
    setIsDrilldownOpen(true);
  };

  const handleEditBudget = (b: CategoryBudget) => {
    setEditingBudget(b);
    setIsAddBudgetOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Header Navigation & Main Action Bar */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Polished Segmented Switcher */}
        <div className="flex items-center p-0.5 bg-[#141414] rounded-lg sm:rounded-xl border border-[#262626] shadow-inner shrink-0">
          <button
            onClick={() => setActiveTab("budgets")}
            className={`flex items-center justify-center text-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === "budgets"
                ? "bg-[#242424] text-emerald-400 shadow-sm border border-[#333333]"
                : "text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1A]"
            }`}
          >
            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="text-center">Budgets</span>
            <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-mono-num ml-0.5 border ${
              activeTab === "budgets" 
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold" 
                : "bg-[#1C1C1C] text-[#A1A1AA] border-[#2E2E2E]"
            }`}>
              {categoryBudgets.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center justify-center text-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === "calendar"
                ? "bg-[#242424] text-cyan-400 shadow-sm border border-[#333333]"
                : "text-[#71717A] hover:text-[#D4D4D8] hover:bg-[#1A1A1A]"
            }`}
          >
            <CalendarRange className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden xs:inline sm:inline text-center">Calendar & Bills</span>
            <span className="xs:hidden sm:hidden text-center">Calendar</span>
          </button>
        </div>

        {/* Action Button */}
        {activeTab === "budgets" && (
          <button
            onClick={() => {
              setEditingBudget(null);
              setIsAddBudgetOpen(true);
            }}
            className="flex items-center justify-center text-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] sm:text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            <span className="text-center">Allot Budget</span>
          </button>
        )}
      </div>

      {/* View 1: Category-Wise Budgets */}
      {activeTab === "budgets" && (
        <div className="space-y-3.5">
          {/* Category Budgets Header & Filter Pills */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5">
              <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-xl border border-[#262626]">
                {(["all", "weekly", "monthly", "yearly"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilterDuration(d)}
                    className={`px-3 py-1 rounded-lg capitalize transition-all font-semibold text-xs cursor-pointer ${
                      filterDuration === d
                        ? "bg-[#242424] text-white border border-[#3A3A3A] shadow-sm font-bold"
                        : "text-[#71717A] hover:text-[#E4E4E7] hover:bg-[#1A1A1A]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <span className="text-xs text-[#71717A] shrink-0 font-mono-num font-medium">
                {filteredBudgets.length} {filteredBudgets.length === 1 ? "category budget" : "category budgets"}
              </span>
            </div>

            {/* Cards Grid - Distinctive Category Budget Cards */}
            {filteredBudgets.length === 0 ? (
              <div className="rounded-2xl bg-[#141414] border border-[#262626] p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
                  <PieChart className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#F5F5F5]">No category budgets found</h3>
                  <p className="text-xs text-[#71717A] max-w-xs mx-auto">
                    Set limits for categories like Food, Travel, or Shopping to easily monitor spending against targets.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingBudget(null);
                    setIsAddBudgetOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer mt-1"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Allot First Budget</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:gap-4">
                {filteredBudgets.map((item) => (
                  <CategoryBudgetCard
                    key={item.budget.id}
                    budget={item.budget}
                    category={item.category}
                    progress={item.progress}
                    settings={settings}
                    onOpenDrilldown={() => handleOpenDrilldown(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Financial Calendar & Recurring Bills */}
      {activeTab === "calendar" && (
        <FinancialCalendar
          settings={settings}
          onOpenAddRecurring={() => setIsAddRecurringOpen(true)}
        />
      )}

      {/* Add / Edit Budget Modal */}
      <AddBudgetModal 
        isOpen={isAddBudgetOpen} 
        onClose={() => {
          setIsAddBudgetOpen(false);
          setEditingBudget(null);
        }}
        editBudget={editingBudget}
      />

      {/* Recurring Bills Modal */}
      <AddRecurringModal 
        isOpen={isAddRecurringOpen} 
        onClose={() => setIsAddRecurringOpen(false)} 
      />

      {/* Category Budget Drilldown Transactions Modal */}
      <CategoryBudgetDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => {
          setIsDrilldownOpen(false);
          setDrilldownBudget(null);
          setDrilldownCategory(null);
          setDrilldownProgress(null);
        }}
        budget={drilldownBudget}
        category={drilldownCategory}
        progress={drilldownProgress}
        settings={settings}
        onEditBudget={handleEditBudget}
      />
    </div>
  );
};
