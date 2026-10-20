import React, { useState } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
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
  Eye 
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

  // Aggregate figures
  const lentLoans = loans.filter((l) => l.direction === "lent");
  const borrowedLoans = loans.filter((l) => l.direction === "borrowed");

  const totalLent = lentLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalBorrowed = borrowedLoans.reduce((sum, l) => sum + l.amount, 0);

  const lentRemaining = lentLoans.reduce((sum, l) => {
    const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
    return sum + Math.max(0, l.amount - repaid);
  }, 0);

  const borrowedRemaining = borrowedLoans.reduce((sum, l) => {
    const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
    return sum + Math.max(0, l.amount - repaid);
  }, 0);

  const netRemaining = lentRemaining - borrowedRemaining;
  const isSettled = lentRemaining === 0 && borrowedRemaining === 0;

  // Chronologically sort loans (most recent first)
  const sortedLoans = [...loans].sort((a, b) => b.date.localeCompare(a.date));

  const displayedLoans = sortedLoans.filter((loan) => {
    if (historyTab === "to_take") return loan.direction === "lent";
    if (historyTab === "to_give") return loan.direction === "borrowed";
    return true;
  });

  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CO";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div 
        className="w-full sm:max-w-lg bg-[#141414] border-t sm:border border-[#262626] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-neutral-700/80" />
        </div>

        {/* Sheet Header */}
        <div className="px-4 py-3 sm:p-5 border-b border-[#242424] space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                  isSettled
                    ? "bg-neutral-800 text-neutral-400 border-neutral-700"
                    : netRemaining > 0
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#F5F5F5] truncate">
                  {person.name}
                </h3>
                <span className="text-[11px] text-[#71717A] font-mono-num">
                  {loans.length} {loans.length === 1 ? "record" : "records"} total
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Net Position Hero Banner */}
          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-[#71717A] uppercase font-semibold block">
                Net Position
              </span>
              <div className="text-sm sm:text-base font-bold font-mono-num mt-0.5">
                {isSettled ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 text-[15px]">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> All Settled · ₹0.00
                  </span>
                ) : netRemaining > 0 ? (
                  <span className="flex items-center gap-1.5 font-mono-num text-[15px]">
                    <ArrowDownLeft className="w-5 h-5 stroke-[3] text-emerald-400" />
                    <strong className="text-[15px] font-black text-white">
                      {formatMoney(netRemaining, settings.currency, settings.numberFormat)}
                    </strong>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-mono-num text-[15px]">
                    <ArrowUpRight className="w-5 h-5 stroke-[3] text-rose-400" />
                    <strong className="text-[15px] font-black text-white">
                      {formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 font-mono-num text-[10.5px] sm:text-xs">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold shadow-sm">
                <span className="text-[10px] text-emerald-400/80 font-semibold">Take:</span>
                <span>{formatMoney(lentRemaining, settings.currency, settings.numberFormat)}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 font-bold shadow-sm">
                <span className="text-[10px] text-rose-400/80 font-semibold">Give:</span>
                <span>{formatMoney(borrowedRemaining, settings.currency, settings.numberFormat)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Add Entry & Settle Balance */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => {
                onAddEntry(person.id);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1E1E1E] hover:bg-[#262626] text-[#F5F5F5] border border-[#2E2E2E] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
              <span>+ Add Entry</span>
            </button>

            {!isSettled && (
              <button
                onClick={() => {
                  onSettleContact(person, loans);
                  onClose();
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm ${
                  netRemaining > 0
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/20"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Settle Balance</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: All | To Take | To Give */}
        <div className="px-4 py-2 bg-[#161616] border-b border-[#242424] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center p-0.5 bg-[#1C1C1C] rounded-lg border border-[#282828] w-full">
            <button
              onClick={() => setHistoryTab("all")}
              className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "all"
                  ? "bg-[#282828] text-[#F5F5F5] shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <span>All</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {loans.length}
              </span>
            </button>

            <button
              onClick={() => setHistoryTab("to_take")}
              className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "to_take"
                  ? "bg-[#282828] text-emerald-400 shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>To Take</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {lentLoans.length}
              </span>
            </button>

            <button
              onClick={() => setHistoryTab("to_give")}
              className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                historyTab === "to_give"
                  ? "bg-[#282828] text-rose-400 shadow-sm"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>To Give</span>
              <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#141414] text-[#A1A1AA]">
                {borrowedLoans.length}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Entry Feed */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1F1F1F] p-1">
          {displayedLoans.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71717A] space-y-1">
              <p className="font-semibold text-[#A1A1AA]">No entries in this view</p>
              <p className="text-[11px] text-[#52525B]">
                {historyTab === "to_take"
                  ? `No money to take recorded with ${person.name}.`
                  : historyTab === "to_give"
                  ? `No money to give recorded with ${person.name}.`
                  : "No records found."}
              </p>
            </div>
          ) : (
            displayedLoans.map((loan) => {
              const isLent = loan.direction === "lent";
              const totalRepaid = loan.repayments.reduce((acc, r) => acc + r.amount, 0);
              const remaining = Math.max(0, loan.amount - totalRepaid);
              const isEntrySettled = remaining === 0;

              return (
                <div
                  key={loan.id}
                  className="p-2.5 sm:p-3 hover:bg-[#181818]/60 transition flex flex-col justify-between gap-1.5 sm:gap-2"
                >
                  {/* Row 1: Payment info on the left, Date properly at right side */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                          isLent
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {isLent ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        )}
                      </div>

                      <span
                        className={`text-xs font-bold shrink-0 ${
                          isLent ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isLent ? "To Take" : "To Give"}
                      </span>

                      <span className="text-xs sm:text-sm font-bold font-mono-num text-[#F5F5F5] shrink-0">
                        {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
                      </span>

                      {loan.description && (
                        <span className="text-[11px] text-[#A1A1AA] truncate italic min-w-0">
                          · {loan.description}
                        </span>
                      )}
                    </div>

                    {/* Date properly at right side */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono-num text-[#A1A1AA] shrink-0 ml-2">
                      <Calendar className="w-3 h-3 text-[#71717A]" />
                      <span>{loan.date}</span>
                      {loan.dueDate && (
                        <span className="text-[10px] font-mono-num px-1 py-0.2 rounded border bg-neutral-900 border-neutral-700 text-[#71717A] hidden xs:inline">
                          Due {loan.dueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Settlement status on the left, Actions (Settle, View, Delete) on the right */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {/* Settlement Status */}
                    <div className="min-w-0 flex-1 text-[11px] font-mono-num">
                      {isEntrySettled ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Fully settled</span>
                          {loan.repayments.length > 0 && (
                            <span className="text-emerald-400/70 font-normal">
                              ({loan.repayments.length} {loan.repayments.length === 1 ? "repayment" : "repayments"})
                            </span>
                          )}
                        </span>
                      ) : totalRepaid > 0 ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1.5 truncate">
                          <span className="font-bold">
                            {formatMoney(remaining, settings.currency, settings.numberFormat)} left
                          </span>
                          <span className="text-[#52525B]">·</span>
                          <span className="text-[#A1A1AA]">
                            {formatMoney(totalRepaid, settings.currency, settings.numberFormat)} settled
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#71717A] flex items-center gap-1">
                          <span className="text-[#52525B] text-[10px] uppercase font-semibold">Remaining:</span>
                          <span className="text-[#F5F5F5] font-bold">
                            {formatMoney(remaining, settings.currency, settings.numberFormat)}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Action buttons: Settle, View, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {!isEntrySettled && (
                        <button
                          onClick={() => {
                            onSettleLoan(loan);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Settle</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewLoanDetails(loan)}
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#242424] transition cursor-pointer"
                        title="View details"
                        aria-label="View loan details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {deletingLoanId === loan.id ? (
                        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-lg p-0.5">
                          <button
                            onClick={() => {
                              onDeleteLoan(loan.id);
                              setDeletingLoanId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingLoanId(null)}
                            className="px-1.5 py-0.5 text-[10px] text-[#A1A1AA] hover:text-white transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingLoanId(loan.id)}
                          className="p-1.5 rounded-lg text-[#52525B] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete entry"
                          aria-label="Delete entry"
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
    </div>
  );
};
