import React, { useState, useEffect } from "react";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { parseSettlementNote } from "@/utils/settlementNote";
import { isTransferOrLoan, isRealExpense, getTransferOrLoanLabel } from "@/utils/transactionClassification";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  X, 
  Edit2, 
  Copy, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText, 
  Wallet, 
  Receipt,
  AlertTriangle,
  ArrowLeftRight
} from "lucide-react";

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  settings: Settings;
  categories: Category[];
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  settings,
  categories,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const transactions = useAppStore((s) => s.transactions);

  // Reset confirmation and handle escape key
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

  if (!isOpen || !transaction) return null;

  // Reactively subscribe to live transaction in store
  const liveTransaction = transactions.find((t) => t.id === transaction.id) || transaction;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const cat = categoryMap.get(liveTransaction.categoryId);
  const isTransfer = isTransferOrLoan(liveTransaction);
  const transferLabel = getTransferOrLoanLabel(liveTransaction) || "Transfer";
  const isExpense = isRealExpense(liveTransaction);

  // Check if this transaction is a settlement or has a structured settlement note
  const settlementInfo = parseSettlementNote(liveTransaction.note, liveTransaction.paymentMethod);

  const dateParts = (liveTransaction.date || "").split("-").map(Number);
  const formattedDate = dateParts.length === 3 && !dateParts.some(isNaN)
    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : liveTransaction.date;

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onClose();
    onDelete(liveTransaction);
  };

  const handleToggleUnwanted = () => {
    const nextVal = !liveTransaction.isUnwanted;
    useAppStore.getState().updateTransaction(liveTransaction.id, { isUnwanted: nextVal });
    useUIStore.getState().showToast(nextVal ? "Tagged as unwanted spend" : "Removed unwanted tag", "info");
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-details-title"
    >
      {/* Unified, free-flowing, merged card without harsh box compartments */}
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#141414] border border-[#282828] shadow-2xl p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col relative text-[#F5F5F5] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle ambient corner glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* 1. Top Header Row: Category Badge on left, Compact Unwanted Toggle & Close on right */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-lg shrink-0 shadow-inner">
              {cat?.icon || "📦"}
            </div>
            <div className="min-w-0">
              <h3 id="transaction-details-title" className="text-sm font-bold text-[#F5F5F5] truncate leading-tight">
                {cat?.name || "General"}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isTransfer ? "text-sky-400" : isExpense ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {isTransfer ? transferLabel : isExpense ? "Expense" : "Income"}
                </span>
                {!settlementInfo.isSettlement && liveTransaction.paymentMethod && (
                  <>
                    <span className="text-[#3F3F46]">·</span>
                    <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-medium">
                      {liveTransaction.paymentMethod}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top-Right Corner Controls: Compact Unwanted Button & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isExpense && (
              <button
                type="button"
                onClick={handleToggleUnwanted}
                className={`h-7 px-2 rounded-xl text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer border ${
                  liveTransaction.isUnwanted
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                    : "bg-[#1C1C1C] hover:bg-[#222222] text-[#71717A] hover:text-[#D4D4D8] border-[#2A2A2A]"
                }`}
                title={liveTransaction.isUnwanted ? "Tagged as unwanted spend (click to remove)" : "Click to mark as unwanted spend"}
                aria-label="Toggle unwanted spend"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${liveTransaction.isUnwanted ? "text-amber-400 fill-amber-400/20" : "text-[#71717A]"}`} />
                <span className="text-[10px]">{liveTransaction.isUnwanted ? "Unwanted" : "Flag"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] border border-[#2A2A2A] text-[#71717A] hover:text-[#F5F5F5] flex items-center justify-center transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Hero Amount & Date (Merged naturally without separate boxes) */}
        <div className="space-y-1 pt-1">
          <div className="text-3xl sm:text-4xl font-extrabold font-mono-num tracking-tight text-[#F5F5F5]">
            {!isTransfer && (
              <span className={isExpense ? "text-rose-400" : "text-emerald-400"}>
                {isExpense ? "-" : "+"}
              </span>
            )}
            {formatMoney(liveTransaction.amount, settings.currency, settings.numberFormat)}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#71717A] font-mono-num">
            <Calendar className="w-3.5 h-3.5 text-[#52525B]" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* 3. Structured Note Section (Matches Given Image Layout) */}
        {settlementInfo.isSettlement ? (
          <div className="space-y-4 pt-1">
            {/* Note row */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                <FileText className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                  Note
                </span>
                <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 truncate">
                  {settlementInfo.noteTitle}
                </span>
              </div>
            </div>

            {/* Type row */}
            {settlementInfo.type && (
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                  <Tag className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                    Type
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 truncate">
                    {settlementInfo.type}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Mode row */}
            {settlementInfo.paymentMode && (
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                  <Wallet className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                    Payment Mode
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 truncate">
                    {settlementInfo.paymentMode}
                  </span>
                </div>
              </div>
            )}

            {/* Optional User Memo row */}
            {settlementInfo.memo && (
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                  <Receipt className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                    Memo
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 break-words">
                    {settlementInfo.memo}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Regular Transaction Fields */
          (liveTransaction.note || liveTransaction.paymentMethod) && (
            <div className="space-y-4 pt-1">
              {liveTransaction.note && (
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                      Note
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 break-words">
                      {liveTransaction.note}
                    </span>
                  </div>
                </div>
              )}

              {liveTransaction.paymentMethod && (
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                    <Wallet className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                      Payment Mode
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 uppercase tracking-wide">
                      {liveTransaction.paymentMethod}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* 4. Action Buttons (Seamlessly anchored at the bottom) */}
        <div className="pt-2">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/30 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] text-[#A1A1AA] hover:text-white border border-[#2D2D2D] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="p-2.5 rounded-xl text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                title="Delete Transaction"
                aria-label="Delete Transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDuplicate(liveTransaction);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2D2D2D] text-[#F5F5F5] text-xs font-semibold transition active:scale-95 cursor-pointer"
                  title="Duplicate Transaction"
                >
                  <Copy className="w-3.5 h-3.5 text-[#71717A]" />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(liveTransaction);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer"
                  title="Edit Transaction"
                >
                  <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
