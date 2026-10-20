import React, { useEffect } from "react";
import { Transaction } from "@/types/transaction";
import { formatMoney } from "@/utils/currency";
import { NumberFormatType } from "@/types/settings";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDeleteTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName?: string;
  categoryIcon?: string;
  currency: string;
  numberFormat?: NumberFormatType;
}

export const ConfirmDeleteTransactionModal: React.FC<ConfirmDeleteTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirm,
  categoryName = "General",
  categoryIcon = "📦",
  currency,
  numberFormat = "comma",
}) => {
  useEffect(() => {
    if (isOpen) {
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

  const isExpense = transaction.type === "expense";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-desc"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/70">
          <div className="flex items-center gap-2 text-rose-400">
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <h3 id="confirm-delete-title" className="text-sm font-bold text-[#F5F5F5]">
              Delete Transaction?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Cancel deletion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p id="confirm-delete-desc" className="text-xs text-[#A1A1AA] leading-relaxed">
            Are you sure you want to delete this record? An <span className="text-[#F5F5F5] font-semibold">Undo</span> option will be available immediately if deleted by mistake.
          </p>

          {/* Transaction Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-base shrink-0">
                {categoryIcon}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-[#F5F5F5] truncate block">
                  {categoryName}
                </span>
                <span className="text-[11px] text-[#71717A] truncate block font-mono-num">
                  {transaction.date} {transaction.note ? `· ${transaction.note}` : ""}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 font-mono-num">
              <span
                className={`text-sm font-bold ${
                  isExpense ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {isExpense ? "-" : "+"}
                {formatMoney(transaction.amount, currency, numberFormat)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#262626] bg-[#181818]/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#333333] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
