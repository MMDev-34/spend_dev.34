import React, { useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  calculateMonthlySpending, 
  calculateMonthlyIncome, 
  calculateTodaySpending,
  calculateWeeklyTotals,
  calculateCategoryTotals,
  calculateLoanSummaries
} from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { formatRelativeDate, getToday } from "@/utils/dates";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { TopCategoriesSummary } from "@/components/dashboard/TopCategoriesSummary";
import { CasinoSlotCounter } from "@/components/common/CasinoSlotCounter";
import { 
  ChevronRight, 
  Plus, 
  ArrowDownLeft, 
  Sparkles,
  ArrowRight,
  Receipt,
  Copy,
  Trash2
} from "lucide-react";
import { useRouter } from "@/app/router";
import { Transaction } from "@/types/transaction";
import { TransactionDetailsModal } from "@/components/transaction/TransactionDetailsModal";
import { ConfirmDeleteTransactionModal } from "@/components/transaction/ConfirmDeleteTransactionModal";

export const DashboardPage: React.FC = () => {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const loans = useAppStore((s) => s.loans);
  const settings = useAppStore((s) => s.settings);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const restoreTransaction = useAppStore((s) => s.restoreTransaction);
  const duplicateTransaction = useAppStore((s) => s.duplicateTransaction);

  const selectedMonth = useUIStore((s) => s.selectedMonth);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const setFocusedTransactionId = useUIStore((s) => s.setFocusedTransactionId);
  const showToast = useUIStore((s) => s.showToast);
  const { navigate } = useRouter();

  // Transaction Detail Popup State
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);

  // Filtered transactions for the selected month
  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  // Financial calculations
  const monthlySpent = useMemo(
    () => calculateMonthlySpending(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const monthlyIncome = useMemo(
    () => calculateMonthlyIncome(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const todaySpent = useMemo(
    () => calculateTodaySpending(transactions),
    [transactions]
  );

  // Category totals for current month
  const categoryTotals = useMemo(
    () => calculateCategoryTotals(transactions, categories, (t) => t.date.startsWith(selectedMonth)),
    [transactions, categories, selectedMonth]
  );

  const loanSummary = useMemo(
    () => calculateLoanSummaries(loans),
    [loans]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const todayStr = useMemo(() => getToday(), []);

  // Most recent transactions that have occurred (Today and past)
  // Limited to max 5 payments for a compact, minimal preview
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .filter((t) => t.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [transactions, todayStr]);

  const handleDuplicate = (id: string) => {
    const dup = duplicateTransaction(id);
    if (dup) {
      openAddModal(dup.type, dup);
      showToast("Transaction copied. Review and save.");
    }
  };

  const handleExecuteDelete = (t: Transaction) => {
    deleteTransaction(t.id);
    const cat = categoryMap.get(t.categoryId);
    const catName = cat?.name || "Transaction";
    const amountStr = formatMoney(t.amount, settings.currency, settings.numberFormat);
    const prefix = t.type === "expense" ? "-" : "+";

    showToast(
      `Deleted ${catName} (${prefix}${amountStr})`,
      "info",
      {
        label: "Undo",
        onClick: () => {
          restoreTransaction(t);
          showToast("Transaction restored", "success");
        },
      },
      6000
    );
  };

  const netSavings = monthlyIncome - monthlySpent;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Monthly Spending Hero Card */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
          <span>Spent This Month</span>
          <span className="text-[#71717A] font-mono-num">
            {monthTransactions.length} {monthTransactions.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Primary Hero Number */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F5F5] font-mono-num flex items-baseline">
              <CasinoSlotCounter value={formatMoney(monthlySpent, settings.currency, settings.numberFormat)} />
            </div>
            {monthlyIncome > 0 && (
              <div className="text-xs text-[#71717A] flex items-center gap-1.5">
                <span>{netSavings >= 0 ? "Saved" : "Overspend"}:</span>
                <span className={`font-mono-num font-semibold ${netSavings >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {netSavings >= 0 ? "+" : ""}{formatMoney(netSavings, settings.currency, settings.numberFormat)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Income & Today summary */}
        <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium font-mono-num">
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Income {formatMoney(monthlyIncome, settings.currency, settings.numberFormat)}</span>
          </div>

          <div className="text-[#A1A1AA] font-mono-num">
            Today: <span className="text-[#F5F5F5] font-semibold">{formatMoney(todaySpent, settings.currency, settings.numberFormat)}</span>
          </div>
        </div>

        {/* Quick action pill buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => openAddModal("expense")}
            className="flex items-center justify-center text-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-xs font-medium text-[#F5F5F5] border border-neutral-700/50 transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-center">Add Expense</span>
          </button>
          <button
            onClick={() => openAddModal("income")}
            className="flex items-center justify-center text-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-xs font-medium text-[#F5F5F5] border border-neutral-700/50 transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-center">Add Income</span>
          </button>
        </div>
      </div>

      {/* Interactive Weekly Bar Graph */}
      <WeeklyBarChart settings={settings} />

      {/* Top Categories Breakdown (Top 3) */}
      <TopCategoriesSummary categories={categoryTotals} settings={settings} />

      {/* Borrow & Lend Summary Banner */}
      {(loanSummary.owedToUser > 0 || loanSummary.userOwes > 0) && (
        <button
          onClick={() => navigate("/borrow-lend")}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#262626] hover:bg-neutral-800/40 transition text-xs group"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-[#71717A] shrink-0">Loans:</span>
            <span className="text-emerald-400 font-mono-num font-medium truncate">
              Owed {formatMoney(loanSummary.owedToUser, settings.currency, settings.numberFormat)}
            </span>
            <span className="text-[#71717A] shrink-0">·</span>
            <span className="text-rose-400 font-mono-num font-medium truncate">
              You owe {formatMoney(loanSummary.userOwes, settings.currency, settings.numberFormat)}
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-white transition shrink-0 ml-2" />
        </button>
      )}

      {/* Recent Payments Preview (Compact, minimal, max 5) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-[#71717A]" />
            <h2 className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
              Recent Payments
            </h2>
          </div>

          {transactions.length > 0 && (
            <button
              onClick={() => navigate("/transactions")}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 transition cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          /* Empty State */
          <div className="rounded-xl bg-[#141414] border border-[#262626] p-5 text-center space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
              <Receipt className="w-4 h-4" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-[#F5F5F5]">
                No spending recorded yet
              </h3>
              <p className="text-[10.5px] text-[#71717A] max-w-xs mx-auto">
                Log your first expense or income to start tracking.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button
                onClick={() => openAddModal("expense")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Log Expense</span>
              </button>

              <button
                onClick={() => openAddModal("income")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Log Income</span>
              </button>
            </div>
          </div>
        ) : (
          /* Compact Payments List (Max 5 items, reduced height) */
          <div className="rounded-xl bg-[#141414] border border-[#262626] divide-y divide-[#1F1F1F] overflow-hidden shadow-sm">
            {recentTransactions.map((t) => {
              const cat = categoryMap.get(t.categoryId);
              const isExpense = t.type === "expense";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-neutral-800/40 transition group cursor-pointer"
                  onClick={() => {
                    setSelectedTransaction(t);
                    setIsDetailsModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-xs shrink-0 group-hover:border-emerald-500/40 transition-colors">
                      {cat?.icon || "📦"}
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors leading-tight">
                          {cat?.name || "General"}
                        </span>
                        {t.isUnwanted && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold shrink-0">
                            Unwanted
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#71717A] flex items-center gap-1 mt-0.5 leading-none">
                        {t.note && (
                          <>
                            <span className="truncate text-[#A1A1AA]">{t.note}</span>
                            <span>·</span>
                          </>
                        )}
                        <span className="shrink-0 text-[#71717A]">
                          {formatRelativeDate(t.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold font-mono-num ${
                        isExpense ? "text-[#F5F5F5]" : "text-emerald-400"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatMoney(t.amount, settings.currency, settings.numberFormat)}
                    </span>

                    <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(t.id);
                        }}
                        className="p-1 rounded-md text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-700 transition"
                        title="Duplicate"
                        aria-label="Duplicate transaction"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransactionToDelete(t);
                        }}
                        className="p-1 rounded-md text-[#71717A] hover:text-rose-400 hover:bg-neutral-700 transition cursor-pointer"
                        title="Delete transaction"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Details Popup Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={(tx) => {
          setIsDetailsModalOpen(false);
          openAddModal(tx.type, tx);
        }}
        onDuplicate={(tx) => {
          handleDuplicate(tx.id);
        }}
        onDelete={(tx) => {
          handleExecuteDelete(tx);
        }}
        settings={settings}
        categories={categories}
      />

      {/* Delete Confirmation Modal (PC view & direct row deletion) */}
      <ConfirmDeleteTransactionModal
        isOpen={!!transactionToDelete}
        transaction={transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={() => {
          if (transactionToDelete) {
            handleExecuteDelete(transactionToDelete);
          }
        }}
        categoryName={transactionToDelete ? categoryMap.get(transactionToDelete.categoryId)?.name : undefined}
        categoryIcon={transactionToDelete ? categoryMap.get(transactionToDelete.categoryId)?.icon : undefined}
        currency={settings.currency}
        numberFormat={settings.numberFormat}
      />
    </div>
  );
};

