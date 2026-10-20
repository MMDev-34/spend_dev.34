import React from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { Settings } from "@/types/settings";
import { PlannedExpense, RecurringExpense } from "@/types/plan";
import { Transaction } from "@/types/transaction";
import { Loan } from "@/types/loan";
import { 
  X, 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Check, 
  Trash2, 
  Edit2, 
  Receipt, 
  Clock, 
  Target, 
  HandCoins 
} from "lucide-react";

interface DayInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  settings: Settings;
  onOpenLogExpense: (date: string) => void;
  onOpenPlanExpense: (date: string) => void;
  onEditPlan: (plan: PlannedExpense) => void;
  onEditRecurring: (rec: RecurringExpense) => void;
}

export const DayInspectorModal: React.FC<DayInspectorModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  settings,
  onOpenLogExpense,
  onOpenPlanExpense,
  onEditPlan,
  onEditRecurring,
}) => {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const loans = useAppStore((s) => s.loans);
  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const plannedExpenses = useAppStore((s) => s.plannedExpenses || []);

  const logRecurringAsTransaction = useAppStore((s) => s.logRecurringAsTransaction);
  const markPlannedExpenseAsPaid = useAppStore((s) => s.markPlannedExpenseAsPaid);
  const deletePlannedExpense = useAppStore((s) => s.deletePlannedExpense);
  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);

  if (!isOpen || !dateStr) return null;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Parse date into nice readable format
  const dateObj = new Date(`${dateStr}T00:00:00`);
  const todayStr = getToday();
  const isToday = todayStr === dateStr;
  
  const formattedDayTitle = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Filter items for this date
  const dayTransactions = transactions.filter((t) => t.date === dateStr);
  const dayPlanned = plannedExpenses.filter((p) => p.targetDate === dateStr);

  const [yearStr, monthStr, dayNumStr] = dateStr.split("-");
  const monthNum = parseInt(monthStr, 10);
  const dayNum = parseInt(dayNumStr, 10);

  const dayRecurring = recurringExpenses.filter((rec) => {
    if (rec.isPaused) return false;
    if (rec.frequency === "monthly" && rec.dueDay === dayNum) return true;
    if (rec.frequency === "yearly" && rec.dueMonth === monthNum && rec.dueDay === dayNum) return true;
    if ((rec.frequency === "weekly" || rec.frequency === "biweekly") && dateObj.getDay() === (rec.dueWeekday ?? 1)) return true;
    return false;
  });

  const dayLoans = loans.filter((l) => l.dueDate === dateStr);
  const monthStrKey = dateStr.slice(0, 7);

  const totalSpent = dayTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = dayTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPendingDue = [
    ...dayPlanned.filter((p) => !p.isPaid).map((p) => p.amount),
    ...dayRecurring.filter((r) => !(r.paidDates?.includes(dateStr) || r.paidDates?.includes(monthStrKey))).map((r) => r.amount),
  ].reduce((sum, a) => sum + a, 0);

  const totalItemsCount = dayTransactions.length + dayPlanned.length + dayRecurring.length + dayLoans.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F5F5F5] truncate font-mono-num">
                  {formattedDayTitle}
                </h3>
                {isToday && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Today
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717A] truncate">
                {totalItemsCount === 0 ? "No activities recorded" : `${totalItemsCount} total item${totalItemsCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
            aria-label="Close popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Day Stats Strip (Only if there are transactions or due commitments) */}
        {(totalSpent > 0 || totalIncome > 0 || totalPendingDue > 0) && (
          <div className="px-4 py-2 bg-[#181818]/40 border-b border-[#262626] flex items-center justify-between text-xs font-mono-num">
            {totalSpent > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#71717A]">Spent:</span>
                <span className="font-bold text-rose-400">
                  -{formatMoney(totalSpent, settings.currency, settings.numberFormat)}
                </span>
              </div>
            )}
            {totalIncome > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#71717A]">Income:</span>
                <span className="font-bold text-emerald-400">
                  +{formatMoney(totalIncome, settings.currency, settings.numberFormat)}
                </span>
              </div>
            )}
            {totalPendingDue > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#71717A]">Due/Plan:</span>
                <span className="font-bold text-cyan-400">
                  {formatMoney(totalPendingDue, settings.currency, settings.numberFormat)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-transparent">
          {totalItemsCount === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-neutral-800/40 border border-neutral-700/40 flex items-center justify-center mx-auto text-[#71717A]">
                <Receipt className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#A1A1AA] font-medium">
                Nothing scheduled or logged for this date.
              </p>
              <p className="text-[11px] text-[#71717A]">
                You can log an expense or add a planned purchase below.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. Planned Future Expenses */}
              {dayPlanned.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Planned Expenses
                  </span>

                  <div className="divide-y divide-[#262626] rounded-xl bg-[#1C1C1C] border border-[#262626] overflow-hidden text-xs">
                    {dayPlanned.map((plan) => {
                      const cat = categoryMap.get(plan.categoryId);
                      return (
                        <div key={plan.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat?.icon || "🎯"}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#F5F5F5] truncate">{plan.title}</div>
                              <div className="text-[10px] text-[#71717A] truncate">
                                {cat?.name} {plan.notes && `· ${plan.notes}`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-num font-bold text-cyan-300 text-xs">
                              {formatMoney(plan.amount, settings.currency, settings.numberFormat)}
                            </span>

                            {!plan.isPaid ? (
                              <button
                                onClick={() => {
                                  const isEarly = dateStr > todayStr;
                                  markPlannedExpenseAsPaid(plan.id, isEarly ? todayStr : dateStr);
                                  showToast(
                                    isEarly
                                      ? `Paid early! Logged on today's date (${todayStr})`
                                      : `Logged "${plan.title}" as actual expense`
                                  );
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition active:scale-95 cursor-pointer"
                                title="Mark as Paid"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Paid</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
                                <Check className="w-3 h-3" /> {plan.paidDate && plan.paidDate < plan.targetDate ? `Paid early (${plan.paidDate})` : "Paid"}
                              </span>
                            )}

                            <button
                              onClick={() => onEditPlan(plan)}
                              className="p-1 rounded text-[#71717A] hover:text-[#F5F5F5] transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => {
                                deletePlannedExpense(plan.id);
                                showToast("Planned expense removed");
                              }}
                              className="p-1 rounded text-[#71717A] hover:text-rose-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Recurring Bills Due */}
              {dayRecurring.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recurring Bills
                  </span>

                  <div className="divide-y divide-[#262626] rounded-xl bg-[#1C1C1C] border border-[#262626] overflow-hidden text-xs">
                    {dayRecurring.map((rec) => {
                      const cat = categoryMap.get(rec.categoryId);
                      const isBillPaid = Boolean(
                        rec.paidDates?.includes(dateStr) || rec.paidDates?.includes(monthStrKey)
                      );

                      return (
                        <div key={rec.id} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat?.icon || "🧾"}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#F5F5F5] truncate">{rec.title}</div>
                              <div className="text-[10px] text-[#71717A] truncate">
                                {cat?.name} · {rec.frequency}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono-num font-bold text-[#F5F5F5] text-xs">
                              {formatMoney(rec.amount, settings.currency, settings.numberFormat)}
                            </span>

                            {!isBillPaid ? (
                              <button
                                onClick={() => {
                                  const isEarly = dateStr > todayStr;
                                  logRecurringAsTransaction(
                                    rec.id, 
                                    isEarly ? todayStr : dateStr, 
                                    isEarly ? monthStrKey : undefined
                                  );
                                  showToast(
                                    isEarly
                                      ? `Paid early! Logged on today's date (${todayStr})`
                                      : `Logged "${rec.title}" as actual expense`
                                  );
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition active:scale-95 cursor-pointer"
                                title="Record as Paid"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Paid</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-medium">
                                <Check className="w-3 h-3" /> {dateStr > todayStr ? "Paid early" : "Paid"}
                              </span>
                            )}

                            <button
                              onClick={() => onEditRecurring(rec)}
                              className="p-1 rounded text-[#71717A] hover:text-[#F5F5F5] transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Loans Due */}
              {dayLoans.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <HandCoins className="w-3 h-3" /> Loans Due
                  </span>

                  <div className="divide-y divide-[#262626] rounded-xl bg-[#1C1C1C] border border-[#262626] overflow-hidden text-xs">
                    {dayLoans.map((loan) => (
                      <div key={loan.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[#F5F5F5]">
                            {loan.direction === "lent" ? "Owed to you" : "You owe"}
                          </div>
                          <div className="text-[10px] text-[#71717A]">{loan.description || "Loan"}</div>
                        </div>
                        <span className="font-mono-num font-bold text-amber-400 text-xs">
                          {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Transactions Logged */}
              {dayTransactions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1">
                    <Receipt className="w-3 h-3" /> Logged Transactions ({dayTransactions.length})
                  </span>

                  <div className="divide-y divide-[#262626] rounded-xl bg-[#1C1C1C] border border-[#262626] overflow-hidden text-xs">
                    {dayTransactions.map((t) => {
                      const cat = categoryMap.get(t.categoryId);
                      const isExpense = t.type === "expense";
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            onClose();
                            openAddModal(t.type, t);
                          }}
                          className="p-2.5 flex items-center justify-between gap-2 hover:bg-neutral-800/40 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat?.icon || "📦"}</span>
                            <div className="min-w-0">
                              <div className="font-medium text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors">
                                {t.note || cat?.name || "Transaction"}
                              </div>
                              <div className="text-[10px] text-[#71717A]">{cat?.name}</div>
                            </div>
                          </div>

                          <span className={`font-mono-num font-bold text-xs ${isExpense ? "text-[#F5F5F5]" : "text-emerald-400"}`}>
                            {isExpense ? "-" : "+"}{formatMoney(t.amount, settings.currency, settings.numberFormat)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Quick Action Bar */}
        <div className="p-4 border-t border-[#262626] bg-[#181818]/80 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              onClose();
              onOpenPlanExpense(dateStr);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-cyan-300 font-semibold text-xs border border-[#333333] transition active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Plan Expense</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenLogExpense(dateStr);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-[0.98] shadow-md shadow-emerald-950/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>
    </div>
  );
};
