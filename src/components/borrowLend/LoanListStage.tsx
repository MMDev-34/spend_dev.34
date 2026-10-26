import React, { useState } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { formatShortDate, getToday } from "@/utils/dates";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Calendar, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Trash2, 
  FileText,
  Clock,
  AlertTriangle
} from "lucide-react";

type LoanFilterTab = "all" | "lent" | "borrowed" | "active" | "repaid";

interface LoanListStageProps {
  person: Person;
  loans: Loan[];
  initialFilter?: "all" | "lent" | "borrowed";
  settings: Settings;
  onBack: () => void;
  onSelectLoan: (loan: Loan) => void;
  onOpenRecordRepayment: (loan: Loan) => void;
  onAddNewLoan: () => void;
  onDeleteLoan: (loanId: string) => void;
}

export const LoanListStage: React.FC<LoanListStageProps> = ({
  person,
  loans,
  initialFilter = "all",
  settings,
  onBack,
  onSelectLoan,
  onOpenRecordRepayment,
  onAddNewLoan,
  onDeleteLoan,
}) => {
  const [activeTab, setActiveTab] = useState<LoanFilterTab>(initialFilter);
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);
  const todayStr = getToday();

  const avatarColors = getAvatarColors(person.name);
  const initials = getInitials(person.name);

  // Filtered loans list
  const filteredLoans = loans.filter((loan) => {
    const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
    const remaining = Math.max(0, loan.amount - repaid);
    const isSettled = remaining === 0;

    if (activeTab === "lent") return loan.direction === "lent";
    if (activeTab === "borrowed") return loan.direction === "borrowed";
    if (activeTab === "active") return !isSettled;
    if (activeTab === "repaid") return isSettled;
    return true;
  });

  // Tab counts
  const tabCounts = {
    all: loans.length,
    lent: loans.filter((l) => l.direction === "lent").length,
    borrowed: loans.filter((l) => l.direction === "borrowed").length,
    active: loans.filter((l) => l.amount - l.repayments.reduce((s, r) => s + r.amount, 0) > 0).length,
    repaid: loans.filter((l) => l.amount - l.repayments.reduce((s, r) => s + r.amount, 0) <= 0).length,
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 max-w-4xl mx-auto pb-10">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between pb-1 border-b border-[#202020]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#181818] hover:bg-[#252525] border border-[#282828] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95"
            aria-label="Back to person profile"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColors.bg} ${avatarColors.text}`}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] tracking-tight">
                {person.name}
              </h1>
              <p className="text-xs text-[#8E8E93]">Individual Loan Details</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddNewLoan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] border border-[#2E2E2E] text-[#F5F5F5] text-xs font-semibold transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
          <span>Add Loan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {(["all", "lent", "borrowed", "active", "repaid"] as const).map((tab) => {
          const label =
            tab === "all"
              ? "All Loans"
              : tab === "lent"
              ? "Lent"
              : tab === "borrowed"
              ? "Borrowed"
              : tab === "active"
              ? "Active"
              : "Repaid";
          const count = tabCounts[tab];
          const isSelected = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#282828] text-white border border-[#3E3E3E] shadow-sm font-bold"
                  : "bg-[#141414] text-[#71717A] hover:text-[#D4D4D8] border border-[#242424]"
              }`}
            >
              <span>{label}</span>
              <span className="text-[10px] font-mono-num opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Loan Cards List */}
      <div className="space-y-3">
        {filteredLoans.length === 0 ? (
          <div className="rounded-2xl bg-[#141414] border border-[#242424] p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#262626] text-[#71717A] flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-[#F5F5F5]">No loans in this category</div>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              Try switching tabs or tap &quot;Add Loan&quot; to create a new record with {person.name}.
            </p>
          </div>
        ) : (
          filteredLoans.map((loan) => {
            const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
            const remaining = Math.max(0, loan.amount - repaid);
            const isLoanSettled = remaining === 0;
            const isOverdue = !!loan.dueDate && loan.dueDate < todayStr && !isLoanSettled;
            const isLent = loan.direction === "lent";

            const progressPercent = loan.amount > 0 
              ? Math.min(100, Math.round((repaid / loan.amount) * 100)) 
              : 100;

            return (
              <div
                key={loan.id}
                onClick={() => onSelectLoan(loan)}
                className="group rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#383838] p-4 sm:p-5 space-y-3 transition-all cursor-pointer shadow-sm relative select-none"
              >
                {/* Top Row: Direction Badge + Date + Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isLent
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                      }`}
                    >
                      {isLent ? (
                        <>
                          <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                          <span>Lent</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          <span>Borrowed</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs text-[#8E8E93] font-mono-num">
                      {formatShortDate(loan.date)}
                    </span>

                    {loan.dueDate && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          isOverdue
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold"
                            : "bg-neutral-800 text-[#A1A1AA] border-[#2A2A2A]"
                        }`}
                      >
                        {isOverdue ? `Overdue (${formatShortDate(loan.dueDate)})` : `Due: ${formatShortDate(loan.dueDate)}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isLoanSettled
                          ? "bg-neutral-800 text-neutral-400 border-neutral-700"
                          : isOverdue
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {isLoanSettled ? "Repaid" : isOverdue ? "Overdue" : "Active"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors" />
                  </div>
                </div>

                {/* Amount Row: Remaining Balance & Original Amount */}
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
                      Current Balance
                    </span>
                    <div
                      className={`text-xl sm:text-2xl font-black font-mono-num tracking-tight mt-0.5 ${
                        isLoanSettled
                          ? "text-neutral-400 line-through"
                          : isLent
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {isLoanSettled
                        ? formatMoney(0, settings.currency, settings.numberFormat)
                        : formatMoney(remaining, settings.currency, settings.numberFormat)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
                      Original Amount
                    </span>
                    <div className="text-sm sm:text-base font-bold font-mono-num text-[#D4D4D8] mt-0.5">
                      {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8E8E93]">
                      Repaid {formatMoney(repaid, settings.currency, settings.numberFormat)}
                    </span>
                    <span className="font-mono-num font-bold text-[#F5F5F5]">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#242424] overflow-hidden">
                    <div
                      style={{ width: `${progressPercent}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isLoanSettled ? "bg-emerald-400" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Description Note */}
                {loan.description && (
                  <p className="text-xs text-[#A1A1AA] flex items-start gap-1.5 pt-0.5">
                    <FileText className="w-3 h-3 text-[#71717A] mt-0.5 shrink-0" />
                    <span className="truncate">{loan.description}</span>
                  </p>
                )}

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#202020]">
                  <span className="text-[11px] text-[#8E8E93] font-mono-num">
                    {loan.repayments.length} {loan.repayments.length === 1 ? "installment" : "installments"}
                  </span>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {!isLoanSettled && (
                      <button
                        type="button"
                        onClick={() => onOpenRecordRepayment(loan)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Record Repayment</span>
                      </button>
                    )}

                    {deletingLoanId === loan.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLoan(loan.id);
                            setDeletingLoanId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLoanId(null)}
                          className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingLoanId(loan.id)}
                        className="p-1 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
