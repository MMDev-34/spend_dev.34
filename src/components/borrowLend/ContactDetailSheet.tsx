import React, { useState } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { formatShortDate, getToday } from "@/utils/dates";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Check, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Eye,
  AlertCircle,
  Receipt
} from "lucide-react";

type HistoryTab = "all" | "to_take" | "to_give";

interface ContactDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  loans: Loan[];
  settings: Settings;
  onAddEntry: (personId: string) => void;
  onSettleContact: (person: Person, loans: Loan[]) => void;
  onSettleLoan: (loan: Loan) => void;
  onViewLoanDetails: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const ContactDetailSheet: React.FC<ContactDetailSheetProps> = ({
  isOpen,
  onClose,
  person,
  loans,
  settings,
  onAddEntry,
  onSettleContact,
  onSettleLoan,
  onViewLoanDetails,
  onDeleteLoan,
}) => {
  const [historyTab, setHistoryTab] = useState<HistoryTab>("all");
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

  if (!isOpen || !person) return null;

  const todayStr = getToday();
  const avatarColors = getAvatarColors(person.name);
  const initials = getInitials(person.name);

  // Aggregate figures
  const lentLoans = loans.filter((l) => l.direction === "lent");
  const borrowedLoans = loans.filter((l) => l.direction === "borrowed");

  const totalLent = lentLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalBorrowed = borrowedLoans.reduce((sum, l) => sum + l.amount, 0);

  const lentRepaid = lentLoans.reduce((sum, l) => {
    return sum + l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
  }, 0);

  const borrowedRepaid = borrowedLoans.reduce((sum, l) => {
    return sum + l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
  }, 0);

  const lentRemaining = Math.max(0, totalLent - lentRepaid);
  const borrowedRemaining = Math.max(0, totalBorrowed - borrowedRepaid);

  const netRemaining = lentRemaining - borrowedRemaining;
  const isSettled = lentRemaining === 0 && borrowedRemaining === 0;

  // Primary direction metrics for single person
  const isLentDominant = netRemaining >= 0;
  const totalPrincipal = isLentDominant ? totalLent : totalBorrowed;
  const totalRepaidAmount = isLentDominant ? lentRepaid : borrowedRepaid;
  const currentBalance = Math.abs(netRemaining);

  const progressPercent = totalPrincipal > 0 
    ? Math.min(100, Math.round((totalRepaidAmount / totalPrincipal) * 100)) 
    : isSettled ? 100 : 0;

  // Chronologically sort loans (most recent first)
  const sortedLoans = [...loans].sort((a, b) => b.date.localeCompare(a.date));

  const displayedLoans = sortedLoans.filter((loan) => {
    if (historyTab === "to_take") return loan.direction === "lent";
    if (historyTab === "to_give") return loan.direction === "borrowed";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div 
        className="w-full sm:max-w-xl bg-[#141414] border-t sm:border border-[#262626] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-neutral-700/80" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#242424] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColors.bg} ${avatarColors.text}`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#F5F5F5] truncate">
                  {person.name}
                </h3>
                <span className="text-xs text-[#8E8E93] font-mono-num flex items-center gap-1.5">
                  <span>{loans.length} {loans.length === 1 ? "record" : "records"}</span>
                  <span>·</span>
                  <span className={isSettled ? "text-emerald-400" : netRemaining > 0 ? "text-emerald-400" : "text-rose-400"}>
                    {isSettled ? "Settled" : netRemaining > 0 ? "You lent" : "You borrowed"}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 Overview Metric Cards: Total Amount | Repaid Amount | Remaining Balance */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Total Amount */}
            <div className="rounded-xl bg-[#1A1A1A] border border-[#262626] p-2.5 sm:p-3 text-center">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
                Total Amount
              </span>
              <div className="text-xs sm:text-sm font-bold font-mono-num text-[#F5F5F5] mt-1 truncate">
                {formatMoney(totalPrincipal, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Repaid Amount */}
            <div className="rounded-xl bg-[#1A1A1A] border border-[#262626] p-2.5 sm:p-3 text-center">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
                Repaid Amount
              </span>
              <div className="text-xs sm:text-sm font-bold font-mono-num text-emerald-400 mt-1 truncate">
                {formatMoney(totalRepaidAmount, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Remaining Balance */}
            <div className="rounded-xl bg-[#1A1A1A] border border-[#262626] p-2.5 sm:p-3 text-center">
              <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
                Remaining
              </span>
              <div className={`text-xs sm:text-sm font-bold font-mono-num mt-1 truncate ${
                isSettled ? "text-neutral-400" : netRemaining > 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                {isSettled
                  ? formatMoney(0, settings.currency, settings.numberFormat)
                  : formatMoney(currentBalance, settings.currency, settings.numberFormat)}
              </div>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="rounded-xl bg-[#181818] border border-[#262626] p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8E8E93] font-medium flex items-center gap-1.5">
                <span>Repayment Progress</span>
                <span className="font-bold text-[#F5F5F5] font-mono-num">({progressPercent}%)</span>
              </span>
              <span className="font-mono-num text-[11px] text-[#8E8E93]">
                {formatMoney(totalRepaidAmount, settings.currency, settings.numberFormat)} / {formatMoney(totalPrincipal, settings.currency, settings.numberFormat)}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#262626] overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  isSettled || progressPercent === 100
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                }`}
              />
            </div>
          </div>

          {/* Action Buttons: Record Repayment & Add Entry */}
          <div className="flex items-center gap-2 pt-1">
            {!isSettled ? (
              <button
                type="button"
                onClick={() => {
                  onSettleContact(person, loans);
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Record Repayment</span>
              </button>
            ) : (
              <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Fully Settled</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onAddEntry(person.id);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#1F1F1F] hover:bg-[#282828] text-white border border-[#2E2E2E] text-xs sm:text-sm font-semibold transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5] text-emerald-400" />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: All | Lent | Borrowed */}
        <div className="px-4 py-2 bg-[#161616] border-b border-[#242424] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-[#1C1C1C] rounded-lg border border-[#282828] w-full">
            <button
              onClick={() => setHistoryTab("all")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "all"
                  ? "bg-[#282828] text-[#F5F5F5] shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <span>All History</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {loans.length}
              </span>
            </button>

            <button
              onClick={() => setHistoryTab("to_take")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "to_take"
                  ? "bg-[#282828] text-emerald-400 shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>Lent</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {lentLoans.length}
              </span>
            </button>

            <button
              onClick={() => setHistoryTab("to_give")}
              className={`flex-1 py-1 px-2 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "to_give"
                  ? "bg-[#282828] text-rose-400 shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Borrowed</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {borrowedLoans.length}
              </span>
            </button>
          </div>
        </div>

        {/* Transaction History List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5">
          {displayedLoans.length === 0 ? (
            <div className="p-8 text-center text-[#71717A] text-xs">
              No transactions under this category.
            </div>
          ) : (
            displayedLoans.map((loan) => {
              const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
              const remaining = Math.max(0, loan.amount - repaid);
              const isLoanSettled = remaining === 0;
              const isOverdue = loan.dueDate && loan.dueDate < todayStr && !isLoanSettled;
              const isLent = loan.direction === "lent";

              return (
                <div
                  key={loan.id}
                  className="rounded-xl bg-[#181818] border border-[#242424] p-3 space-y-2.5 hover:border-neutral-700 transition"
                >
                  {/* Top row: Direction Badge + Date + Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
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

                    {/* Amount & Status */}
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono-num ${
                          isLoanSettled
                            ? "text-neutral-400 line-through"
                            : isLent
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
                      </div>
                      {repaid > 0 && !isLoanSettled && (
                        <div className="text-[10px] text-amber-400 font-mono-num font-medium">
                          Bal: {formatMoney(remaining, settings.currency, settings.numberFormat)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note / Description */}
                  {loan.description && (
                    <p className="text-xs text-[#D4D4D8] flex items-start gap-1.5">
                      <FileText className="w-3 h-3 text-[#71717A] mt-0.5 shrink-0" />
                      <span>{loan.description}</span>
                    </p>
                  )}

                  {/* Attached Repayment Log Entries */}
                  {loan.repayments.length > 0 && (
                    <div className="rounded-lg bg-[#141414] border border-[#222222] p-2 space-y-1">
                      <div className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider flex items-center justify-between">
                        <span>Repayments ({loan.repayments.length})</span>
                        <span className="font-mono-num text-emerald-400">
                          Total Repaid: {formatMoney(repaid, settings.currency, settings.numberFormat)}
                        </span>
                      </div>
                      {loan.repayments.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs text-[#A1A1AA] pt-0.5 font-mono-num">
                          <span className="text-[11px] truncate">{formatShortDate(r.date)} {r.note ? `· ${r.note}` : ""}</span>
                          <span className="font-semibold text-emerald-400 shrink-0">
                            +{formatMoney(r.amount, settings.currency, settings.numberFormat)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loan Actions: Record Repayment / Delete */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#202020]">
                    {!isLoanSettled && (
                      <button
                        type="button"
                        onClick={() => {
                          onSettleLoan(loan);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Record Repayment</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onViewLoanDetails(loan)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                      title="View loan details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

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
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
