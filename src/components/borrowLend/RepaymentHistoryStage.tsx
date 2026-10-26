import React, { useState } from "react";
import { Loan, Repayment } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { formatShortDate, getToday } from "@/utils/dates";
import { 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Calendar, 
  Check, 
  CheckCircle2, 
  Trash2, 
  Smartphone, 
  Banknote, 
  CreditCard, 
  Building, 
  MoreHorizontal,
  FileText,
  Clock
} from "lucide-react";

interface RepaymentHistoryStageProps {
  loan: Loan;
  person: Person;
  settings: Settings;
  onBack: () => void;
  onOpenRecordRepayment: () => void;
  onDeleteInstallment: (installmentId: string) => void;
}

export const RepaymentHistoryStage: React.FC<RepaymentHistoryStageProps> = ({
  loan,
  person,
  settings,
  onBack,
  onOpenRecordRepayment,
  onDeleteInstallment,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const todayStr = getToday();

  const totalRepaid = loan.repayments.reduce((acc, r) => acc + r.amount, 0);
  const remaining = Math.max(0, loan.amount - totalRepaid);
  const isSettled = remaining === 0;
  const isOverdue = !!loan.dueDate && loan.dueDate < todayStr && !isSettled;
  const isLent = loan.direction === "lent";

  const progressPercent = loan.amount > 0 
    ? Math.min(100, Math.round((totalRepaid / loan.amount) * 100)) 
    : 100;

  // Chronologically sort installments (most recent first)
  const sortedRepayments = [...loan.repayments].sort((a, b) => b.date.localeCompare(a.date));

  const getMethodIcon = (method?: string) => {
    switch (method?.toLowerCase()) {
      case "upi":
        return <Smartphone className="w-3.5 h-3.5" />;
      case "cash":
        return <Banknote className="w-3.5 h-3.5" />;
      case "card":
        return <CreditCard className="w-3.5 h-3.5" />;
      case "netbanking":
        return <Building className="w-3.5 h-3.5" />;
      default:
        return <MoreHorizontal className="w-3.5 h-3.5" />;
    }
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
            aria-label="Back to loans list"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] tracking-tight">
              Repayment History
            </h1>
            <p className="text-xs text-[#8E8E93]">
              {isLent ? "Lent to" : "Borrowed from"} <span className="text-[#F5F5F5] font-semibold">{person.name}</span>
            </p>
          </div>
        </div>

        {!isSettled && (
          <button
            type="button"
            onClick={onOpenRecordRepayment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Repayment</span>
          </button>
        )}
      </div>

      {/* Selected Loan Overview Card */}
      <div className="rounded-2xl bg-[#141414] border border-[#242424] p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isLent
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              {isLent ? (
                <>
                  <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Lent Loan</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Borrowed Loan</span>
                </>
              )}
            </span>

            <span className="text-xs text-[#8E8E93] font-mono-num">
              Started {formatShortDate(loan.date)}
            </span>

            {loan.dueDate && (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  isOverdue
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold"
                    : "bg-neutral-800 text-[#A1A1AA] border-[#2A2A2A]"
                }`}
              >
                {isOverdue ? `Overdue (${formatShortDate(loan.dueDate)})` : `Due: ${formatShortDate(loan.dueDate)}`}
              </span>
            )}
          </div>

          <div className="text-xs font-semibold">
            {isSettled ? (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Fully Repaid
              </span>
            ) : isOverdue ? (
              <span className="text-rose-400 font-bold">Payment Overdue</span>
            ) : (
              <span className="text-amber-400 font-bold">Active Agreement</span>
            )}
          </div>
        </div>

        {/* 3 Metric Figures */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-[#181818] border border-[#222222] text-center">
            <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
              Original Loan
            </span>
            <div className="text-sm sm:text-base font-bold font-mono-num text-[#F5F5F5] mt-1 truncate">
              {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-[#222222] text-center">
            <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
              Total Repaid
            </span>
            <div className="text-sm sm:text-base font-bold font-mono-num text-emerald-400 mt-1 truncate">
              {formatMoney(totalRepaid, settings.currency, settings.numberFormat)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-[#222222] text-center">
            <span className="text-[10px] text-[#8E8E93] uppercase font-semibold block tracking-wider">
              Current Balance
            </span>
            <div
              className={`text-sm sm:text-base font-bold font-mono-num mt-1 truncate ${
                isSettled ? "text-neutral-400" : isLent ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isSettled
                ? formatMoney(0, settings.currency, settings.numberFormat)
                : formatMoney(remaining, settings.currency, settings.numberFormat)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8E8E93] font-medium">Repayment Progress</span>
            <span className="font-mono-num font-bold text-[#F5F5F5]">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#242424] overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                isSettled
                  ? "bg-emerald-400"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-400"
              }`}
            />
          </div>
        </div>

        {/* Note / Description */}
        {loan.description && (
          <div className="text-xs text-[#D4D4D8] bg-[#181818] border border-[#222222] rounded-xl p-2.5 flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-[#71717A] mt-0.5 shrink-0" />
            <span>{loan.description}</span>
          </div>
        )}
      </div>

      {/* Prominent Action Button */}
      {!isSettled && (
        <div>
          <button
            type="button"
            onClick={onOpenRecordRepayment}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-bold text-sm shadow-md shadow-emerald-950/20 transition cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Record Repayment Installment</span>
          </button>
        </div>
      )}

      {/* Itemized Installments Timeline */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5]">
            Installment Payments ({loan.repayments.length})
          </h2>
          <span className="text-xs text-[#8E8E93] font-mono-num">
            {isSettled ? "Settled in full" : `Remaining: ${formatMoney(remaining, settings.currency, settings.numberFormat)}`}
          </span>
        </div>

        {loan.repayments.length === 0 ? (
          <div className="rounded-2xl bg-[#141414] border border-[#242424] p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#262626] text-[#71717A] flex items-center justify-center mx-auto">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-[#F5F5F5]">No installments recorded yet</div>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              Tap &quot;Record Repayment Installment&quot; to log a payment and update the remaining balance.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#141414] border border-[#242424] divide-y divide-[#202020] overflow-hidden">
            {sortedRepayments.map((rep, idx) => {
              const installmentNum = sortedRepayments.length - idx;

              return (
                <div
                  key={rep.id}
                  className="p-3.5 sm:p-4 hover:bg-[#181818] transition flex items-center justify-between gap-3"
                >
                  {/* Left: Index badge + Payment Method + Date + Note */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      #{installmentNum}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#F5F5F5]">
                          Payment Installment
                        </span>
                        {rep.paymentMethod && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#202020] text-[#D4D4D8] border border-[#2E2E2E]">
                            {getMethodIcon(rep.paymentMethod)}
                            <span className="capitalize">{rep.paymentMethod}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#8E8E93] font-mono-num mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[#71717A]" />
                        <span>{formatShortDate(rep.date)}</span>
                        {rep.note && (
                          <>
                            <span>·</span>
                            <span className="text-[#D4D4D8] truncate">{rep.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount + Delete */}
                  <div className="flex items-center gap-2.5 shrink-0 text-right">
                    <div className="text-sm sm:text-base font-bold font-mono-num text-emerald-400">
                      +{formatMoney(rep.amount, settings.currency, settings.numberFormat)}
                    </div>

                    {deletingId === rep.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteInstallment(rep.id);
                            setDeletingId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(rep.id)}
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete installment"
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
    </div>
  );
};
