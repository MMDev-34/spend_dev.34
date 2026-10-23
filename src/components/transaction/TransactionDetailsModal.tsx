import React, { useState, useEffect } from "react";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
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
  CreditCard, 
  AlertTriangle
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

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const cat = categoryMap.get(transaction.categoryId);
  const isExpense = transaction.type === "expense";

  const dateParts = (transaction.date || "").split("-").map(Number);
  const formattedDate = dateParts.length === 3 && !dateParts.some(isNaN)
    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : transaction.date;

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    onClose();
    onDelete(transaction);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-details-title"
    >
      <div 
        className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-[#262626] flex items-center justify-between bg-[#181818]/60">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isExpense ? "bg-rose-400" : "bg-emerald-400"}`} />
            <h3 id="transaction-details-title" className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wider text-[11px]">
              Transaction Details
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Amount Strip */}
        <div className="p-6 text-center bg-[#181818]/30 border-b border-[#262626] space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#222222] border border-[#2E2E2E] text-2xl mb-1 shadow-inner">
            {cat?.icon || "📦"}
          </div>
          <div className="text-2xl font-black font-mono-num tracking-tight text-[#F5F5F5]">
            <span className={isExpense ? "text-rose-400" : "text-emerald-400"}>
              {isExpense ? "-" : "+"}
            </span>
            {formatMoney(transaction.amount, settings.currency, settings.numberFormat)}
          </div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isExpense 
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              {isExpense ? "Expense" : "Income"}
            </span>
            {transaction.tag === "transfer" && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-400 border-sky-500/30">
                Transfer
              </span>
            )}
          </div>
        </div>

        {/* Detailed Fields List */}
        <div className="p-4 space-y-3 divide-y divide-[#262626] text-xs">
          {/* Category */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#71717A] flex items-center gap-1.5 font-medium">
              <Tag className="w-3.5 h-3.5" /> Category
            </span>
            <span className="font-semibold text-[#F5F5F5] flex items-center gap-1">
              <span>{cat?.icon || "📦"}</span>
              <span>{cat?.name || "General"}</span>
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-[#71717A] flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" /> Date
            </span>
            <span className="font-semibold text-[#F5F5F5] font-mono-num">
              {formattedDate}
            </span>
          </div>

          {/* Note / Description */}
          {transaction.note && (
            <div className="pt-2.5 space-y-1">
              <span className="text-[#71717A] flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5" /> Note
              </span>
              <p className="p-2.5 rounded-xl bg-[#1C1C1C] border border-[#262626] text-[#E4E4E7] text-xs leading-relaxed break-words font-medium">
                {transaction.note}
              </p>
            </div>
          )}

          {/* Payment Method / Mode */}
          {transaction.paymentMethod && (
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-[#71717A] flex items-center gap-1.5 font-medium">
                <CreditCard className="w-3.5 h-3.5" /> Payment Method
              </span>
              <span className="font-semibold text-[#F5F5F5] capitalize">
                {transaction.paymentMethod}
              </span>
            </div>
          )}

          {/* Unwanted / Impulse Spend Toggle Row (Expenses only) */}
          {isExpense && (
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-[#71717A] flex items-center gap-1.5 font-medium">
                <AlertTriangle className={`w-3.5 h-3.5 ${transaction.isUnwanted ? "text-amber-400" : "text-[#71717A]"}`} />
                <span>Unwanted Spend</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !transaction.isUnwanted;
                  useAppStore.getState().updateTransaction(transaction.id, { isUnwanted: nextVal });
                  useUIStore.getState().showToast(nextVal ? "Tagged as unwanted spend" : "Removed unwanted tag");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                  transaction.isUnwanted
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-[#1C1C1C] text-[#71717A] border-[#2E2E2E] hover:text-white"
                }`}
                title="Click to toggle unwanted spend"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${transaction.isUnwanted ? "bg-amber-400" : "bg-neutral-600"}`} />
                <span>{transaction.isUnwanted ? "Tagged Unwanted" : "Mark as Unwanted"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons with Destructive Confirmation */}
        <div className="p-4 border-t border-[#262626] bg-[#181818]/70 flex items-center justify-between gap-2">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/30 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#A1A1AA] hover:text-white border border-[#333333] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-semibold transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                title="Delete Transaction"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDuplicate(transaction);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#333333] text-xs font-semibold transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Duplicate Transaction"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(transaction);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Edit Transaction"
                >
                  <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Edit</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
