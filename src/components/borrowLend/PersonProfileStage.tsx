import React, { useState } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Check, 
  CheckCircle2, 
  MoreHorizontal, 
  ChevronRight,
  Trash2,
  Edit2
} from "lucide-react";

interface PersonProfileStageProps {
  person: Person;
  loans: Loan[];
  settings: Settings;
  onBack: () => void;
  onNavigateToLoans: (filter: "all" | "lent" | "borrowed") => void;
  onOpenRecordRepayment: () => void;
  onAddNewLoan: () => void;
  onSettleAll: () => void;
  onDeletePerson: () => void;
}

export const PersonProfileStage: React.FC<PersonProfileStageProps> = ({
  person,
  loans,
  settings,
  onBack,
  onNavigateToLoans,
  onOpenRecordRepayment,
  onAddNewLoan,
  onSettleAll,
  onDeletePerson,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarColors = getAvatarColors(person.name);
  const initials = getInitials(person.name);

  // Separate Lent and Borrowed Loans
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

  // Conversational summary narrative matching reference image
  let narrativeText = `All settled up with ${person.name}.`;
  if (lentRemaining > 0 && borrowedRemaining > 0) {
    if (netRemaining > 0) {
      narrativeText = `${person.name} owes you ${formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)} more than you owe them.`;
    } else if (netRemaining < 0) {
      narrativeText = `You owe ${person.name} ${formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)} more than they owe you.`;
    } else {
      narrativeText = `Mutual balance is equalized (${formatMoney(lentRemaining, settings.currency, settings.numberFormat)} each).`;
    }
  } else if (lentRemaining > 0) {
    narrativeText = `${person.name} owes you ${formatMoney(lentRemaining, settings.currency, settings.numberFormat)}.`;
  } else if (borrowedRemaining > 0) {
    narrativeText = `You owe ${person.name} ${formatMoney(borrowedRemaining, settings.currency, settings.numberFormat)}.`;
  }

  const netSign = netRemaining > 0 ? "+" : "";

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl mx-auto pb-10">
      {/* Top Header: [←] Avatar + Name + "Person overview" + [···] */}
      <div className="flex items-center justify-between pb-1 relative">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#181818] hover:bg-[#252525] border border-[#282828] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95"
            aria-label="Back to people list"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColors.bg} ${avatarColors.text}`}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] tracking-tight">
                {person.name}
              </h1>
              <p className="text-xs text-[#8E8E93]">Person overview</p>
            </div>
          </div>
        </div>

        {/* More Options Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="w-9 h-9 rounded-full bg-[#181818] hover:bg-[#252525] border border-[#282828] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1.5 z-30 w-48 rounded-xl bg-[#1C1C1C] border border-[#2E2E2E] shadow-2xl p-1.5 space-y-1 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {!isSettled && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onSettleAll();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-[#262626] transition cursor-pointer text-left"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Settle Mutual Balance</span>
                </button>
              )}

              {confirmDelete ? (
                <div className="p-2 space-y-1.5">
                  <p className="text-[11px] text-rose-400 font-medium">Delete contact and all loans?</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDeletePerson();
                      }}
                      className="flex-1 py-1 rounded bg-rose-500 text-white text-xs font-bold"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-1 rounded bg-neutral-800 text-neutral-300 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-[#262626] transition cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Contact</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. Net Balance Hero Section (Exact Reference Image Style) */}
      <div className="space-y-1 pt-2">
        <span className="text-xs sm:text-sm font-semibold text-[#8E8E93] tracking-wider block">
          Net balance
        </span>
        <div
          className={`text-4xl sm:text-5xl font-extrabold font-mono-num tracking-tight ${
            isSettled
              ? "text-neutral-400"
              : netRemaining > 0
              ? "text-[#22C55E]"
              : "text-[#EF4444]"
          }`}
        >
          {isSettled
            ? formatMoney(0, settings.currency, settings.numberFormat)
            : `${netSign}${formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)}`}
        </div>
        <p className="text-xs sm:text-sm text-[#8E8E93] pt-1">
          {narrativeText}
        </p>
      </div>

      {/* 2. Bilateral Breakdown Row (They owe you | You owe them) */}
      <div className="grid grid-cols-2 gap-4 pt-1 pb-1">
        <div>
          <span className="text-xs sm:text-sm font-semibold text-[#8E8E93] block">
            They owe you
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#22C55E] font-mono-num mt-1">
            {formatMoney(lentRemaining, settings.currency, settings.numberFormat)}
          </div>
        </div>

        <div>
          <span className="text-xs sm:text-sm font-semibold text-[#8E8E93] block">
            You owe them
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#EF4444] font-mono-num mt-1">
            {formatMoney(borrowedRemaining, settings.currency, settings.numberFormat)}
          </div>
        </div>
      </div>

      {/* 3. Consolidated Lent and Borrowed Overview Cards (Side by Side) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 select-none">
        {/* Card 1: ↗ Lent Card */}
        <div
          onClick={() => onNavigateToLoans("lent")}
          className="group rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#383838] p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer shadow-sm relative active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>Lent</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors" />
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#F5F5F5] tracking-tight">
                {lentLoans.length} {lentLoans.length === 1 ? "loan" : "loans"}
              </div>
              <div className="text-xs text-[#8E8E93] mt-1 font-mono-num">
                {formatMoney(totalLent, settings.currency, settings.numberFormat)} originally
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#222222] mt-3">
            <div className="text-sm sm:text-base font-extrabold text-[#22C55E] font-mono-num">
              {formatMoney(lentRemaining, settings.currency, settings.numberFormat)} remaining
            </div>
          </div>
        </div>

        {/* Card 2: ↙ Borrowed Card */}
        <div
          onClick={() => onNavigateToLoans("borrowed")}
          className="group rounded-2xl bg-[#141414] border border-[#242424] hover:border-[#383838] p-4 sm:p-5 flex flex-col justify-between transition-all cursor-pointer shadow-sm relative active:scale-[0.99]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                <span>Borrowed</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors" />
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black text-[#F5F5F5] tracking-tight">
                {borrowedLoans.length} {borrowedLoans.length === 1 ? "loan" : "loans"}
              </div>
              <div className="text-xs text-[#8E8E93] mt-1 font-mono-num">
                {formatMoney(totalBorrowed, settings.currency, settings.numberFormat)} originally
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#222222] mt-3">
            <div className="text-sm sm:text-base font-extrabold text-[#EF4444] font-mono-num">
              {formatMoney(borrowedRemaining, settings.currency, settings.numberFormat)} remaining
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => onNavigateToLoans("all")}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#181818] hover:bg-[#202020] border border-[#262626] hover:border-[#333333] transition cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-[#F5F5F5]">
              View All Loan Details &amp; History
            </span>
            <span className="text-xs text-[#71717A] font-mono-num">
              ({loans.length} {loans.length === 1 ? "agreement" : "agreements"})
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition" />
        </button>

        <div className="flex items-center gap-2.5">
          {!isSettled && (
            <button
              type="button"
              onClick={onOpenRecordRepayment}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-bold text-sm shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Record Repayment</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddNewLoan}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] active:scale-[0.98] text-[#F5F5F5] border border-[#2E2E2E] font-semibold text-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-emerald-400" />
            <span>Add New Loan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
