import React, { useState } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Trash2, 
  Eye,
  Wallet,
  ArrowRightLeft
} from "lucide-react";

type HistoryTab = "all" | "to_take" | "to_give";

interface ContactLedgerCardProps {
  person: Person;
  loans: Loan[];
  settings: Settings;
  onAddEntry: (personId: string) => void;
  onSettleContact: (person: Person, loans: Loan[]) => void;
  onSettleLoan: (loan: Loan) => void;
  onViewLoanDetails: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const ContactLedgerCard: React.FC<ContactLedgerCardProps> = ({
  person,
  loans,
  settings,
  onAddEntry,
  onSettleContact,
  onSettleLoan,
  onViewLoanDetails,
  onDeleteLoan,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("all");
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

  // Compute aggregated portfolio figures for this person
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

  // Net remaining balance: positive means they owe user (To Take), negative means user owes them (To Give)
  const netRemaining = lentRemaining - borrowedRemaining;
  const isFullySettled = lentRemaining === 0 && borrowedRemaining === 0;

  // Chronologically sort all loans (most recent first)
  const sortedLoans = [...loans].sort((a, b) => b.date.localeCompare(a.date));

  // Filter loans based on active history tab
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
    <div className="rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#333333] transition shadow-sm overflow-hidden select-none">
      {/* 1. Card Header & Person Identity */}
      <div className="p-3.5 sm:p-4.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Avatar & Contact Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                isFullySettled
                  ? "bg-neutral-800 text-neutral-400 border-neutral-700"
                  : netRemaining > 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[#F5F5F5] truncate">
                  {person.name}
                </h3>
                <span className="text-[11px] text-[#71717A] font-mono-num">
                  {loans.length} {loans.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <p className="text-xs text-[#71717A] truncate">
                {isFullySettled
                  ? "All transactions settled with this contact"
                  : `${lentLoans.length} to take · ${borrowedLoans.length} to give`}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Add Record for this person */}
            <button
              onClick={() => onAddEntry(person.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#F5F5F5] border border-[#2E2E2E] text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
              title={`Add new borrow or lend record with ${person.name}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
              <span>Add Entry</span>
            </button>

            {/* Settle Contact Balance */}
            {!isFullySettled && (
              <button
                onClick={() => onSettleContact(person, loans)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm ${
                  netRemaining > 0
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/20"
                }`}
                title={`Settle outstanding balance with ${person.name}`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Settle Balance</span>
              </button>
            )}

            {/* Expand/Collapse Accordion */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1E1E1E] transition cursor-pointer"
              title={isExpanded ? "Collapse history" : "Expand history"}
              aria-label={isExpanded ? "Collapse history" : "Expand history"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2. Executive Net Balance Hero + Give vs Take Dual Metric Pods */}
        <div className="rounded-xl bg-[#181818] border border-[#262626] p-3 space-y-2.5">
          {/* Top Banner: Prominent Overall Net Total (Either I Give or I Take) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-[#242424]">
            <span className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">
              Net Balance Position
            </span>

            <div className="flex items-center gap-1.5 font-mono-num text-sm sm:text-base font-bold">
              {isFullySettled ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>All Settled · ₹0.00 Net</span>
                </span>
              ) : netRemaining > 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                  <span>Net: You will take</span>
                  <span className="text-base sm:text-lg font-black">
                    {formatMoney(netRemaining, settings.currency, settings.numberFormat)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400">
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  <span>Net: You will give</span>
                  <span className="text-base sm:text-lg font-black">
                    {formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dual Metric Pods: To Take (Owed to me) vs To Give (I owe) */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono-num">
            {/* Left: To Take Pod */}
            <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#71717A] uppercase font-semibold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                  <span>To Take (Owed to me)</span>
                </span>
                <span className="text-[#52525B]">{lentLoans.length} entries</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-emerald-400 truncate">
                {formatMoney(lentRemaining, settings.currency, settings.numberFormat)}
              </div>
              <div className="text-[10px] text-[#71717A] truncate">
                Total Lent: {formatMoney(totalLent, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Right: To Give Pod */}
            <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#71717A] uppercase font-semibold">
                <span className="flex items-center gap-1 text-rose-400">
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                  <span>To Give (I owe)</span>
                </span>
                <span className="text-[#52525B]">{borrowedLoans.length} entries</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-rose-400 truncate">
                {formatMoney(borrowedRemaining, settings.currency, settings.numberFormat)}
              </div>
              <div className="text-[10px] text-[#71717A] truncate">
                Total Borrowed: {formatMoney(totalBorrowed, settings.currency, settings.numberFormat)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. History Section with Tab Switcher */}
      {isExpanded && (
        <div className="border-t border-[#262626] bg-[#111111]/80">
          {/* Internal Tab Switcher */}
          <div className="px-3.5 py-2.5 bg-[#161616]/70 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center p-0.5 bg-[#1C1C1C] rounded-lg border border-[#282828] w-full sm:w-auto">
              <button
                onClick={() => setHistoryTab("all")}
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                className={`flex-1 sm:flex-none px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
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

            <span className="text-[11px] text-[#71717A] font-mono-num hidden sm:inline">
              Sorted by latest date
            </span>
          </div>

          {/* Chronological Entries List */}
          {displayedLoans.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717A] space-y-1">
              <p className="font-medium text-[#A1A1AA]">No entries in this view</p>
              <p className="text-[11px] text-[#52525B]">
                {historyTab === "to_take"
                  ? `No money to take (lent) recorded with ${person.name}.`
                  : historyTab === "to_give"
                  ? `No money to give (borrowed) recorded with ${person.name}.`
                  : "No transaction records found."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1F1F1F]">
              {displayedLoans.map((loan) => {
                const isLent = loan.direction === "lent";
                const totalRepaid = loan.repayments.reduce((acc, r) => acc + r.amount, 0);
                const remaining = Math.max(0, loan.amount - totalRepaid);
                const isEntrySettled = remaining === 0;
                const isOverdue =
                  !isEntrySettled &&
                  loan.dueDate &&
                  new Date(loan.dueDate) < new Date(new Date().toISOString().split("T")[0]);

                return (
                  <div
                    key={loan.id}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181818]/80 transition group"
                  >
                    {/* Left: Direction Badge + Amount + Date + Note + Status */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Direction Icon Badge */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                          isLent
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {isLent ? (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Row 1: Direction Label + Amount + Date */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold ${
                              isLent ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isLent ? "To Take (Lent)" : "To Give (Borrowed)"}
                          </span>

                          <span className="text-sm sm:text-base font-bold font-mono-num text-[#F5F5F5]">
                            {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
                          </span>

                          <span className="text-[11px] text-[#71717A] flex items-center gap-1 font-mono-num">
                            <Calendar className="w-3 h-3 text-[#52525B]" />
                            {loan.date}
                          </span>

                          {loan.dueDate && (
                            <span
                              className={`text-[10px] font-mono-num px-1.5 py-0.2 rounded border ${
                                isOverdue
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold"
                                  : "bg-neutral-800 border-neutral-700 text-[#71717A]"
                              }`}
                            >
                              Due: {loan.dueDate}
                            </span>
                          )}
                        </div>

                        {/* Row 2: Note / Reason (Highlighted prominently) */}
                        {loan.description ? (
                          <div className="text-xs text-[#A1A1AA] flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="truncate italic font-medium">"{loan.description}"</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#52525B] flex items-center gap-1 italic">
                            <span>No note added</span>
                          </div>
                        )}

                        {/* Row 3: Settlement Progress Status */}
                        <div className="text-[11px] font-mono-num text-[#71717A] pt-0.5">
                          {isEntrySettled ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" /> Fully settled ({loan.repayments.length}{" "}
                              {loan.repayments.length === 1 ? "repayment" : "repayments"})
                            </span>
                          ) : totalRepaid > 0 ? (
                            <span className="text-amber-400 font-medium">
                              {formatMoney(totalRepaid, settings.currency, settings.numberFormat)} settled ·{" "}
                              {formatMoney(remaining, settings.currency, settings.numberFormat)} remaining
                            </span>
                          ) : (
                            <span className="text-[#A1A1AA]">
                              Remaining to {isLent ? "take" : "give"}:{" "}
                              <strong className={isLent ? "text-emerald-400" : "text-rose-400"}>
                                {formatMoney(remaining, settings.currency, settings.numberFormat)}
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions for this specific entry */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isEntrySettled && (
                        <button
                          onClick={() => onSettleLoan(loan)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1"
                          title="Settle this specific loan entry"
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Settle Entry</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewLoanDetails(loan)}
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#242424] transition cursor-pointer"
                        title="View repayment details & history"
                        aria-label="View repayment details & history"
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
                          title="Delete this loan entry"
                          aria-label="Delete this loan entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
