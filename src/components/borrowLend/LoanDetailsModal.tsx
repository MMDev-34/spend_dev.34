import React, { useState, useEffect } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { formatMoney } from "@/utils/currency";
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  Plus, 
  History,
  AlertTriangle
} from "lucide-react";

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  person: Person | undefined;
  settings: Settings;
  onOpenCustomSettle: (loan: Loan) => void;
  onDeleteLoan: (loanId: string) => void;
}

export const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({
  isOpen,
  onClose,
  loan,
  person,
  settings,
  onOpenCustomSettle,
  onDeleteLoan,
}) => {
  const deleteRepayment = useAppStore((s) => s.deleteRepayment);
  const showToast = useUIStore((s) => s.showToast);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !loan) return null;

  const totalRepaid = (loan.repayments || []).reduce((acc, r) => acc + r.amount, 0);
  const remaining = Math.max(0, loan.amount - totalRepaid);
  const isFullySettled = remaining === 0;
  const isLent = loan.direction === "lent";

  const percentageSettled = loan.amount > 0 
    ? Math.min(100, Math.round((totalRepaid / loan.amount) * 100)) 
    : 100;

  // Compute end date (if settled, last repayment date)
  const lastRepayment = (loan.repayments || []).length > 0 
    ? [...loan.repayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const endDate = isFullySettled && lastRepayment ? lastRepayment.date : null;

  // Check if overdue
  const isOverdue = !isFullySettled && loan.dueDate && new Date(loan.dueDate) < new Date(new Date().toISOString().split("T")[0]);


  const handleDeleteRepayment = (repId: string) => {
    deleteRepayment(loan.id, repId);
    showToast("Settlement record removed");
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onDeleteLoan(loan.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#262626] p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#262626] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              isLent 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {isLent ? <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F5F5] truncate">
                  {person?.name || "Unknown"}
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                  isLent 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                  {isLent ? "Lent" : "Borrowed"}
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5 truncate">
                {loan.description || (isLent ? "Money lent record" : "Money borrowed record")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#181818] border border-[#262626] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#71717A] text-[11px]">Status:</span>
            {isFullySettled ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Settled
              </span>
            ) : isOverdue ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                <AlertCircle className="w-3 h-3 stroke-[2.5]" /> Overdue
              </span>
            ) : totalRepaid > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 stroke-[2.5]" /> Partial ({percentageSettled}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-cyan-400 text-[11px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 stroke-[2.5]" /> Outstanding
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono-num text-[#A1A1AA] font-semibold">
            {percentageSettled}% Cleared
          </span>
        </div>

        {/* Financial 3-Box Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
          <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818] border border-[#262626] min-w-0">
            <span className="text-[10px] text-[#71717A] uppercase font-medium block truncate mb-0.5">
              Principal
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-[#F5F5F5] block truncate">
              {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818] border border-[#262626] min-w-0">
            <span className="text-[10px] text-[#71717A] uppercase font-medium block truncate mb-0.5">
              Settled
            </span>
            <span className="text-xs sm:text-sm md:text-base font-bold text-emerald-400 block truncate">
              {formatMoney(totalRepaid, settings.currency, settings.numberFormat)}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-[#181818] border border-[#262626] min-w-0">
            <span className="text-[10px] text-[#71717A] uppercase font-medium block truncate mb-0.5">
              {isFullySettled ? "Balance" : "Remaining"}
            </span>
            <span className={`text-xs sm:text-sm md:text-base font-bold block truncate ${
              isFullySettled ? "text-[#71717A]" : isLent ? "text-emerald-400" : "text-rose-400"
            }`}>
              {formatMoney(remaining, settings.currency, settings.numberFormat)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#1C1C1C] h-1.5 rounded-full overflow-hidden border border-[#262626]/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFullySettled ? "bg-emerald-400" : isLent ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${Math.max(4, percentageSettled)}%` }}
          />
        </div>

        {/* Timeline Dates */}
        <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] space-y-2">
          <div className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-emerald-400" />
            <span>Timeline</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
            <div>
              <span className="text-[9px] text-[#71717A] block font-sans">Start Date</span>
              <span className="font-semibold text-[#F5F5F5] text-[11px] sm:text-xs">
                {loan.date || "-"}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#71717A] block font-sans">Due Date</span>
              <span className={`font-semibold text-[11px] sm:text-xs ${isOverdue ? "text-rose-400 font-bold" : "text-[#F5F5F5]"}`}>
                {loan.dueDate || "-"}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#71717A] block font-sans">Settled Date</span>
              <span className="font-semibold text-[11px] sm:text-xs text-[#F5F5F5]">
                {endDate ? (
                  <span className="text-emerald-400 font-bold">{endDate}</span>
                ) : isFullySettled ? (
                  <span className="text-emerald-400">Done</span>
                ) : (
                  <span className="text-[#71717A]">-</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Settlement History List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Settlement History ({loan.repayments.length})</span>
            </div>

            {!isFullySettled && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCustomSettle(loan);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Custom Settle</span>
              </button>
            )}
          </div>

          {loan.repayments.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] text-center text-xs text-[#71717A]">
              No settlement payments recorded yet.
            </div>
          ) : (
            <div className="rounded-xl bg-[#181818] border border-[#262626] divide-y divide-[#262626] overflow-hidden max-h-40 overflow-y-auto">
              {loan.repayments.map((rep) => (
                <div key={rep.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#202020] transition">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F5F5F5] font-mono-num">
                        +{formatMoney(rep.amount, settings.currency, settings.numberFormat)}
                      </span>
                      <span className="text-[10px] text-[#71717A] font-mono-num">
                        {rep.date}
                      </span>
                    </div>
                    {rep.note && (
                      <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
                        {rep.note}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteRepayment(rep.id)}
                    className="p-1 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer shrink-0"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-rose-950/30"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#262626] text-[#A1A1AA] hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-rose-500/10 border border-[#262626] hover:border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {!isFullySettled && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCustomSettle(loan);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2E2E2E] text-[#F5F5F5] text-xs font-semibold transition cursor-pointer"
              >
                Custom Settle
              </button>
            )}

            {isFullySettled && (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-[#F5F5F5] text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
