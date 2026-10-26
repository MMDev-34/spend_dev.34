import React, { useState, useEffect } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney, parseMoneyInput, minorUnitsToInputString } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { 
  X, 
  Check, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

interface CustomSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan?: Loan | null;
  person?: Person | null;
  contactLoans?: Loan[];
  settings: Settings;
}

export const CustomSettleModal: React.FC<CustomSettleModalProps> = ({
  isOpen,
  onClose,
  loan,
  person,
  contactLoans = [],
  settings,
}) => {
  const addRepayment = useAppStore((s) => s.addRepayment);
  const settleContact = useAppStore((s) => s.settleContact);
  const showToast = useUIStore((s) => s.showToast);

  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [note, setNote] = useState("");

  // Determine mode: single-loan vs whole-contact settlement
  const isSingleLoanMode = !!loan;

  // Single-loan figures
  const singleLoanRepaid = loan ? loan.repayments.reduce((acc, r) => acc + r.amount, 0) : 0;
  const singleLoanRemaining = loan ? Math.max(0, loan.amount - singleLoanRepaid) : 0;

  // Contact-level figures
  const relevantLoans = contactLoans.length > 0 ? contactLoans : loan ? [loan] : [];
  const lentRemaining = relevantLoans
    .filter((l) => l.direction === "lent")
    .reduce((sum, l) => sum + Math.max(0, l.amount - l.repayments.reduce((rSum, r) => rSum + r.amount, 0)), 0);

  const borrowedRemaining = relevantLoans
    .filter((l) => l.direction === "borrowed")
    .reduce((sum, l) => sum + Math.max(0, l.amount - l.repayments.reduce((rSum, r) => rSum + r.amount, 0)), 0);

  const isLent = isSingleLoanMode
    ? loan?.direction === "lent"
    : borrowedRemaining > 0 && (borrowedRemaining >= lentRemaining || lentRemaining === 0)
    ? false
    : true;

  const totalPayable = isSingleLoanMode
    ? singleLoanRemaining
    : !isLent
    ? borrowedRemaining
    : lentRemaining;

  // Sync state whenever modal opens or targets change
  useEffect(() => {
    if (isOpen) {
      setAmountStr(minorUnitsToInputString(totalPayable));
      setDate(getToday());
      setPaymentMethod("upi");
      setNote("");

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, loan?.id, person?.id, totalPayable, onClose]);

  if (!isOpen) return null;

  const changeDateByDays = (deltaDays: number) => {
    try {
      const baseDate = date ? new Date(date + "T00:00:00") : new Date();
      if (isNaN(baseDate.getTime())) {
        setDate(getToday());
        return;
      }
      baseDate.setDate(baseDate.getDate() + deltaDays);
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, "0");
      const day = String(baseDate.getDate()).padStart(2, "0");
      setDate(`${year}-${month}-${day}`);
    } catch {
      setDate(getToday());
    }
  };

  const handleApplyPreset = (ratio: number) => {
    const target = Math.round(totalPayable * ratio);
    setAmountStr(minorUnitsToInputString(target));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (amount <= 0) {
      showToast("Please enter a valid settlement amount", "error");
      return;
    }

    if (amount > totalPayable) {
      showToast("Settlement amount cannot exceed outstanding balance", "error");
      return;
    }

    const settleNote = note.trim();

    if (isSingleLoanMode && loan) {
      // Single loan settlement
      addRepayment(loan.id, {
        amount,
        date: date || getToday(),
        paymentMethod,
        note: settleNote || undefined,
      });

      const contactName = person?.name || "contact";
      if (loan.direction === "borrowed") {
        showToast(`Paid back ${formatMoney(amount, settings.currency, settings.numberFormat)} to ${contactName} & logged to Activity Expenses!`);
      } else {
        showToast(`Got back ${formatMoney(amount, settings.currency, settings.numberFormat)} from ${contactName} & logged to Activity Income!`);
      }
    } else if (person) {
      // Whole contact settlement
      settleContact(person.id, amount, date || getToday(), settleNote || undefined, paymentMethod);

      if (!isLent) {
        showToast(`Paid back ${formatMoney(amount, settings.currency, settings.numberFormat)} to ${person.name} & logged to Activity Expenses!`);
      } else {
        showToast(`Got back ${formatMoney(amount, settings.currency, settings.numberFormat)} from ${person.name} & logged to Activity Income!`);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] p-4 sm:p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                isLent
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {isLent ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {isSingleLoanMode
                  ? isLent ? "Receive Loan Settlement" : "Pay Loan Settlement"
                  : isLent ? "Receive Contact Settlement" : "Pay Contact Settlement"}
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Contact: <span className="text-[#A1A1AA] font-semibold">{person?.name || "Unknown"}</span>
                {isSingleLoanMode && loan?.date && ` · Record: ${loan.date}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Snapshot */}
        <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs font-mono-num">
          <div>
            <span className="text-[10px] text-[#71717A] uppercase font-medium block">
              {isSingleLoanMode ? "Entry Outstanding" : "Contact Outstanding"}
            </span>
            <span className={`text-base font-bold ${isLent ? "text-emerald-400" : "text-rose-400"}`}>
              {formatMoney(totalPayable, settings.currency, settings.numberFormat)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#71717A] uppercase font-medium block">
              Direction
            </span>
            <span className={`text-xs font-semibold ${isLent ? "text-emerald-400" : "text-rose-400"}`}>
              {isLent ? "They owe you" : "You owe them"}
            </span>
          </div>
        </div>

        {/* Settlement Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#A1A1AA]">
              Settlement Amount ({settings.currency})
            </label>
            <div className="bg-[#181818] border border-[#262626] focus-within:border-emerald-500/50 rounded-xl p-2.5 flex items-center gap-2 transition">
              <span className="text-xs font-bold text-[#71717A] font-mono-num">{settings.currency}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-sm font-bold text-[#F5F5F5] outline-none font-mono-num"
                autoFocus
                required
              />
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr("")}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                  title="Clear amount"
                  aria-label="Clear amount"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleApplyPreset(0.25)}
                className="flex-1 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-[10px] font-semibold text-[#A1A1AA] transition cursor-pointer"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(0.5)}
                className="flex-1 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-[10px] font-semibold text-[#A1A1AA] transition cursor-pointer"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(0.75)}
                className="flex-1 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-[10px] font-semibold text-[#A1A1AA] transition cursor-pointer"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(1.0)}
                className="flex-1 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 transition cursor-pointer"
              >
                Full (100%)
              </button>
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Settlement Date
              </label>
              <div className="flex items-center justify-between gap-1.5 bg-[#181818] border border-[#262626] rounded-xl px-2 py-1.5 text-xs text-[#F5F5F5] focus-within:border-emerald-500/50 transition">
                <button
                  type="button"
                  onClick={() => changeDateByDays(-1)}
                  className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) setDate(e.target.value);
                  }}
                  className="bg-transparent text-xs font-semibold text-[#F5F5F5] outline-none w-full cursor-pointer font-mono-num px-1 py-0.5 text-center flex-1 min-w-0"
                  aria-label="Settlement Date"
                  required
                />

                <button
                  type="button"
                  onClick={() => changeDateByDays(1)}
                  className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                  title="Next Day"
                  aria-label="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Note / Memo (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch split, final payoff"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#181818] border border-[#262626] rounded-xl p-2 text-xs text-[#F5F5F5] outline-none focus:border-emerald-500/50 transition"
              />
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="space-y-1.5 pt-0.5">
            <label className="block text-[11px] font-medium text-[#A1A1AA]">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "cash", label: "Cash" },
                { id: "upi", label: "UPI" },
                { id: "bank", label: "Bank Transfer" },
                { id: "other", label: "Other" },
              ].map((mode) => {
                const isSelected = paymentMethod === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer select-none ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
                        : "bg-[#181818] border-[#262626] text-[#A1A1AA] hover:border-[#383838] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <span className="truncate block">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#71717A] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Settlement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
