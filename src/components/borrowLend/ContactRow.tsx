import React from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { 
  ChevronRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  CheckCircle2 
} from "lucide-react";

interface ContactRowProps {
  person: Person;
  loans: Loan[];
  settings: Settings;
  onOpenDetails: (person: Person) => void;
  onSettleContact: (person: Person, loans: Loan[]) => void;
}

export const ContactRow: React.FC<ContactRowProps> = ({
  person,
  loans,
  settings,
  onOpenDetails,
  onSettleContact,
}) => {
  // Aggregate calculations
  const lentLoans = loans.filter((l) => l.direction === "lent");
  const borrowedLoans = loans.filter((l) => l.direction === "borrowed");

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

  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CO";

  return (
    <div
      onClick={() => onOpenDetails(person)}
      className="group relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-[#141414] border border-[#242424] hover:border-[#383838] hover:bg-[#181818] transition-all cursor-pointer select-none"
    >
      {/* Left: Avatar + Name + Entries count + Net Position Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
        {/* Avatar */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition ${
            isSettled
              ? "bg-neutral-800 text-neutral-400 border-neutral-700"
              : netRemaining > 0
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
          }`}
        >
          {initials}
        </div>

        {/* Identity & Net status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate group-hover:text-white transition">
              {person.name}
            </span>
            <span className="text-[10px] text-[#71717A] font-mono-num shrink-0">
              · {loans.length} {loans.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* Net position text */}
          <div className="text-[11px] font-mono-num flex items-center gap-1 mt-0.5">
            {isSettled ? (
              <span className="text-neutral-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Settled
              </span>
            ) : netRemaining > 0 ? (
              <span className="flex items-center gap-1 truncate">
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400 shrink-0" />
                <strong className="font-bold text-white text-xs sm:text-sm">
                  {formatMoney(netRemaining, settings.currency, settings.numberFormat)}
                </strong>
              </span>
            ) : (
              <span className="flex items-center gap-1 truncate">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] text-rose-400 shrink-0" />
                <strong className="font-bold text-white text-xs sm:text-sm">
                  {formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)}
                </strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Settle + Chevron */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

        {/* Quick Settle action */}
        {!isSettled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettleContact(person, loans);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm ${
              netRemaining > 0
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}
            title={`Settle balance with ${person.name}`}
          >
            <Check className="w-3 h-3 stroke-[2.5]" />
            <span>Settle</span>
          </button>
        )}

        {/* Open details chevron */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#71717A] group-hover:text-white group-hover:bg-[#222222] transition">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
