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
  Calendar,
  Smartphone,
  Banknote,
  CreditCard,
  Building,
  MoreHorizontal
} from "lucide-react";

interface RecordRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  person: Person | null;
  settings: Settings;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Building },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

export const RecordRepaymentModal: React.FC<RecordRepaymentModalProps> = ({
  isOpen,
  onClose,
  loan,
  person,
  settings,
  onSuccess,
}) => {
  const addRepayment = useAppStore((s) => s.addRepayment);
  const showToast = useUIStore((s) => s.showToast);

  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(getToday());
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [note, setNote] = useState("");

  const totalRepaid = loan ? loan.repayments.reduce((acc, r) => acc + r.amount, 0) : 0;
  const remaining = loan ? Math.max(0, loan.amount - totalRepaid) : 0;
  const isLent = loan?.direction === "lent";

  useEffect(() => {
    if (isOpen && loan) {
      setAmountStr(minorUnitsToInputString(remaining));
      setDate(getToday());
      setPaymentMethod("upi");
      setNote("");

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, loan?.id, remaining, onClose]);

  if (!isOpen || !loan || !person) return null;

  const handleApplyPreset = (ratio: number) => {
    const target = Math.round(remaining * ratio);
    setAmountStr(minorUnitsToInputString(target));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (amount <= 0) {
      showToast("Please enter a valid repayment amount", "error");
      return;
    }

    if (amount > remaining) {
      showToast("Repayment amount cannot exceed remaining balance", "error");
      return;
    }

    const repaymentNote = note.trim();

    addRepayment(loan.id, {
      amount,
      date: date || getToday(),
      paymentMethod,
      note: repaymentNote || undefined,
    });

    const formattedAmt = formatMoney(amount, settings.currency, settings.numberFormat);
    if (isLent) {
      showToast(`Got back ${formattedAmt} from ${person.name}!`);
    } else {
      showToast(`Paid back ${formattedAmt} to ${person.name}!`);
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
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
              {isLent ? <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" /> : <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {isLent ? "Record Received Repayment" : "Record Sent Repayment"}
              </h3>
              <p className="text-[11px] text-[#8E8E93]">
                {person.name} · Loan of {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Outstanding Balance Banner */}
          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between">
            <span className="text-xs text-[#8E8E93] font-medium">Remaining Balance</span>
            <span className="text-sm sm:text-base font-bold font-mono-num text-[#F5F5F5]">
              {formatMoney(remaining, settings.currency, settings.numberFormat)}
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              Installment Amount ({settings.currency})
            </label>
            <div className="bg-[#181818] border border-[#262626] focus-within:border-neutral-500 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-base font-bold text-[#71717A] font-mono-num">{settings.currency}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-[#F5F5F5] outline-none font-mono-num"
                required
                autoFocus
              />
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr("")}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-1.5 pt-2">
              {[
                { label: "Full", ratio: 1.0 },
                { label: "75%", ratio: 0.75 },
                { label: "50%", ratio: 0.5 },
                { label: "25%", ratio: 0.25 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.ratio)}
                  className="flex-1 py-1 rounded-lg text-xs font-semibold bg-[#1A1A1A] hover:bg-[#252525] text-[#A1A1AA] hover:text-white border border-[#282828] transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1 text-center ${
                      isSelected
                        ? "bg-[#282828] text-white border-neutral-500 font-bold shadow-sm"
                        : "bg-[#181818] text-[#8E8E93] hover:text-white border-[#262626]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-full text-[10px]">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              Payment Date
            </label>
            <div className="flex items-center gap-2 bg-[#181818] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
              <Calendar className="w-4 h-4 text-[#71717A] shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#F5F5F5] outline-none w-full cursor-pointer font-mono-num"
                required
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
              Note / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. PhonePe transfer, Google Pay #123, Cash installment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#181818] border border-[#262626] focus:border-neutral-500 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                isLent
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/20"
                  : "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-950/20"
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Record Repayment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
