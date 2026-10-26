import React, { useState, useEffect } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney, parseMoneyInput, minorUnitsToInputString } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { 
  ArrowLeft, 
  Check, 
  Calendar, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Building, 
  FileText,
  X
} from "lucide-react";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank", label: "Bank Transfer", icon: Building },
];

interface RecordRepaymentViewProps {
  loan: Loan;
  person: Person;
  settings: Settings;
  prefillFullRemaining?: boolean;
  onBack: () => void;
  onSuccess: () => void;
}

export const RecordRepaymentView: React.FC<RecordRepaymentViewProps> = ({
  loan,
  person,
  settings,
  prefillFullRemaining = false,
  onBack,
  onSuccess,
}) => {
  const addRepayment = useAppStore((s) => s.addRepayment);
  const showToast = useUIStore((s) => s.showToast);

  const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingBalance = Math.max(0, loan.amount - totalRepaid);
  const isLent = loan.direction === "lent";

  const [amountStr, setAmountStr] = useState<string>("");
  const [date, setDate] = useState<string>(getToday());
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");

  useEffect(() => {
    if (remainingBalance > 0) {
      setAmountStr(minorUnitsToInputString(remainingBalance));
    }
  }, [loan.id, remainingBalance]);

  const currentEnteredMinor = parseMoneyInput(amountStr);
  const isFullClearing = currentEnteredMinor === remainingBalance && remainingBalance > 0;

  // Preset chips: 4 values leading up to remaining balance
  const presetValues = [
    Math.round((remainingBalance / 4) / 100) * 100,
    Math.round((remainingBalance / 2) / 100) * 100,
    Math.round((remainingBalance * 0.75) / 100) * 100,
    remainingBalance,
  ].filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minorUnits = parseMoneyInput(amountStr);

    if (minorUnits <= 0) {
      showToast("Please enter a valid repayment amount", "error");
      return;
    }

    if (minorUnits > remainingBalance) {
      showToast("Amount cannot exceed the remaining balance", "error");
      return;
    }

    addRepayment(loan.id, {
      amount: minorUnits,
      date: date || getToday(),
      paymentMethod,
    });

    if (isLent) {
      showToast(`Recorded ${formatMoney(minorUnits, settings.currency, settings.numberFormat)} got back from ${person.name}!`);
    } else {
      showToast(`Recorded ${formatMoney(minorUnits, settings.currency, settings.numberFormat)} paid back to ${person.name}!`);
    }

    onSuccess();
  };

  const pageTitle = prefillFullRemaining || isFullClearing ? "Settle Loan" : "Record Repayment";
  const loanTitle = loan.description?.trim() || (isLent ? "Money Lent" : "Money Borrowed");

  return (
    <div className="max-w-xl mx-auto w-full px-3 sm:px-4 pt-1 sm:pt-2 pb-28 sm:pb-16 space-y-4 animate-in fade-in duration-200">
      {/* 1. Header with Back Button */}
      <div className="flex items-center gap-3 pb-2 border-b border-[#1F2937]">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] border border-[#1F2937] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95 shrink-0"
          title="Back to Loan Details"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] truncate tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs text-[#8E8E93]">
            {isLent ? "Receiving money from" : "Repaying money to"} {person.name}
          </p>
        </div>
      </div>

      {/* 2. Context Card (Screens 4 & 6) */}
      <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isLent
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#F5F5F5] truncate">{loanTitle}</h3>
            <p className="text-xs text-[#8E8E93] truncate">
              {person.name} · <span className={isLent ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>{isLent ? "Lent" : "Borrowed"}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer px-2 py-1"
        >
          Edit
        </button>
      </div>

      {/* 3. Repayment Form (Screens 4 & 6) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider block">
              {pageTitle === "Settle Loan" ? "Amount to settle" : "Amount"}
            </label>
            {isFullClearing && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Remaining balance
              </span>
            )}
          </div>

          <div className="bg-[#0F1720] border border-[#1E293B] focus-within:border-emerald-500 rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
            <span className="text-2xl font-extrabold text-[#71717A] font-mono-num">{settings.currency}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full bg-transparent text-2xl font-extrabold text-[#F5F5F5] outline-none font-mono-num"
              required
              autoFocus
            />
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr("")}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Settle Helper Banner (Screen 6) */}
          {isFullClearing && (
            <p className="text-xs text-emerald-400/90 font-medium">
              This will clear the remaining balance.
            </p>
          )}

          {/* Preset Chips (Screens 4 & 6) */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {presetValues.map((val) => {
              const strVal = minorUnitsToInputString(val);
              const isSelected = amountStr === strVal;

              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountStr(strVal)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold font-mono-num transition cursor-pointer text-center border ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                      : "bg-[#0F1720] hover:bg-[#15202E] text-[#A1A1AA] hover:text-white border-[#1E293B]"
                  }`}
                >
                  {formatMoney(val, settings.currency, settings.numberFormat)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method Selector (Screens 4 & 6: 4 Tiles) */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`py-3 px-2 rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center ${
                    isSelected
                      ? "bg-[#15231F] text-emerald-400 border-emerald-500/60 font-bold shadow-sm"
                      : "bg-[#0F1720] text-[#8E8E93] hover:text-white border-[#1E293B]"
                  }`}
                >
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <span className="truncate max-w-full text-[11px]">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Date
          </label>
          <div className="flex items-center gap-2.5 bg-[#0F1720] border border-[#1E293B] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-[#F5F5F5] transition">
            <Calendar className="w-4 h-4 text-[#71717A] shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
              className="bg-transparent text-xs sm:text-sm font-semibold text-[#F5F5F5] outline-none cursor-pointer font-mono-num flex-1"
              required
            />
          </div>
        </div>

        {/* Primary Save Button (Screens 4 & 6) */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-bold text-sm transition shadow-lg shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isFullClearing ? "Proceed to Pay" : "Save Repayment"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
