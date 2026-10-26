import React, { useState } from "react";
import { Transaction } from "@/types/transaction";
import { Category } from "@/types/category";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { parseSettlementNote } from "@/utils/settlementNote";
import { isTransferOrLoan, isRealExpense, getTransferOrLoanLabel } from "@/utils/transactionClassification";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  ArrowLeft, 
  Edit2, 
  Copy, 
  Trash2, 
  Calendar, 
  Tag, 
  FileText, 
  Wallet, 
  Receipt,
  AlertTriangle
} from "lucide-react";
import { ConfirmDeleteTransactionModal } from "./ConfirmDeleteTransactionModal";

interface TransactionDetailViewProps {
  transactionId: string;
  initialTransaction?: Transaction;
  categories: Category[];
  settings: Settings;
  onBack: () => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({
  transactionId,
  initialTransaction,
  categories,
  settings,
  onBack,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const transactions = useAppStore((s) => s.transactions);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const showToast = useUIStore((s) => s.showToast);

  // Live reactive lookup from store
  const tx = transactions.find((t) => t.id === transactionId) || initialTransaction;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!tx) {
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Activity</span>
        </button>
        <div className="p-8 rounded-2xl bg-[#141414] border border-[#262626] text-center text-xs text-[#71717A]">
          Transaction not found.
        </div>
      </div>
    );
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const cat = categoryMap.get(tx.categoryId);
  const isTransfer = isTransferOrLoan(tx);
  const transferLabel = getTransferOrLoanLabel(tx) || "Transfer";
  const isExpense = isRealExpense(tx);

  // Check if this transaction is a settlement or has a structured settlement note
  const settlementInfo = parseSettlementNote(tx.note, tx.paymentMethod);

  // Formatted date
  const dateParts = (tx.date || "").split("-").map(Number);
  const formattedDate =
    dateParts.length === 3 && !dateParts.some(isNaN)
      ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : tx.date;

  const handleToggleUnwanted = () => {
    const nextVal = !tx.isUnwanted;
    updateTransaction(tx.id, { isUnwanted: nextVal });
    showToast(nextVal ? "Tagged as unwanted spend" : "Removed unwanted tag", "info");
  };

  const handleExecuteDelete = () => {
    setIsConfirmingDelete(false);
    onDelete(tx);
    onBack();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-16">
      {/* 1. Header Bar with Back Button, Compact Corner Unwanted Toggle, and Actions */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#141414] border border-[#262626] shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2B2B2B] text-xs font-bold text-[#F5F5F5] transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Activity</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Compact Corner Unwanted Toggle */}
          {isExpense && (
            <button
              type="button"
              onClick={handleToggleUnwanted}
              className={`h-8 px-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                tx.isUnwanted
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-[#1C1C1C] hover:bg-[#252525] text-[#71717A] hover:text-[#D4D4D8] border-[#2B2B2B]"
              }`}
              title={tx.isUnwanted ? "Tagged as unwanted spend (click to remove)" : "Click to mark as unwanted spend"}
              aria-label="Toggle unwanted spend"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${tx.isUnwanted ? "text-amber-400 fill-amber-400/20" : "text-[#71717A]"}`} />
              <span className="text-[11px]">{tx.isUnwanted ? "Unwanted" : "Flag"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDuplicate(tx)}
            className="p-2 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2B2B2B] text-[#A1A1AA] hover:text-[#F5F5F5] transition cursor-pointer"
            title="Duplicate"
            aria-label="Duplicate transaction"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(tx)}
            className="p-2 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2B2B2B] text-[#A1A1AA] hover:text-emerald-400 transition cursor-pointer"
            title="Edit"
            aria-label="Edit transaction"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="p-2 rounded-xl bg-[#1C1C1C] hover:bg-rose-500/10 border border-[#2B2B2B] hover:border-rose-500/30 text-[#A1A1AA] hover:text-rose-400 transition cursor-pointer"
            title="Delete"
            aria-label="Delete transaction"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Unified, Free and Merged Detail Card */}
      <div className="p-6 rounded-3xl bg-[#141414] border border-[#262626] shadow-sm space-y-5 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* Hero Section */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#2B2B2B] flex items-center justify-center text-2xl shrink-0 shadow-inner">
            {cat?.icon || "📦"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#F5F5F5]">
                {cat?.name || "General"}
              </h2>
              {isTransfer ? (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                  {transferLabel}
                </span>
              ) : isExpense ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                  Expense
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Income
                </span>
              )}
            </div>
            {!settlementInfo.isSettlement && tx.paymentMethod && (
              <span className="text-[11px] text-[#A1A1AA] uppercase font-medium tracking-wider">
                {tx.paymentMethod}
              </span>
            )}
          </div>
        </div>

        {/* Amount & Date */}
        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-extrabold font-mono-num tracking-tight text-[#F5F5F5]">
            {!isTransfer && (
              <span className={isExpense ? "text-rose-400" : "text-emerald-400"}>
                {isExpense ? "-" : "+"}
              </span>
            )}
            {formatMoney(tx.amount, settings.currency, settings.numberFormat)}
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
          (tx.note || tx.paymentMethod) && (
            <div className="space-y-4 pt-1">
              {tx.note && (
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                      Note
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 break-words">
                      {tx.note}
                    </span>
                  </div>
                </div>
              )}

              {tx.paymentMethod && (
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#13232C] border border-[#1E333F]/40 flex items-center justify-center text-[#2DD4BF] shrink-0 shadow-sm">
                    <Wallet className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-xs text-[#8E9BAC] font-normal leading-tight">
                      Payment Mode
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-[#F8FAFC] leading-snug mt-0.5 uppercase tracking-wide">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Bottom Actions */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onEdit(tx)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <Edit2 className="w-4 h-4 stroke-[2.5]" />
            <span>Edit Transaction</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteTransactionModal
        isOpen={isConfirmingDelete}
        transaction={tx}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleExecuteDelete}
        categoryName={cat?.name}
        categoryIcon={cat?.icon}
        currency={settings.currency}
        numberFormat={settings.numberFormat}
      />
    </div>
  );
};
