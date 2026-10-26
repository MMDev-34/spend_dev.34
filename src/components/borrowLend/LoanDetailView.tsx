import React, { useState, useRef, useEffect } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney, parseMoneyInput, minorUnitsToInputString } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  ArrowLeft, 
  MoreVertical,
  Wallet,
  Plus, 
  FileText,
  Pencil,
  Calendar, 
  CreditCard,
  Clock, 
  Check, 
  Trash2, 
  X,
  AlertTriangle,
  Banknote,
  Building,
  Smartphone
} from "lucide-react";

interface LoanDetailViewProps {
  loan: Loan;
  person: Person;
  settings: Settings;
  onBack: () => void;
  onSettleLoan: () => void;
  onRecordRepayment: () => void;
  onDeleteLoan: (loanId: string) => void;
  onDeleteRepayment: (loanId: string, repaymentId: string) => void;
}

/**
 * Formats date into exact style: "Oct 23, 2026"
 */
function formatImageDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Extracts clean payment method and clean note for repayment display
 */
function parseRepaymentDetails(rep: { paymentMethod?: string; note?: string }): { method: string; note: string } {
  let method = rep.paymentMethod?.trim() || "";
  let note = rep.note?.trim() || "";

  if (!method && note) {
    if (note.includes("·") || note.includes("•")) {
      const parts = note.split(/[·•]/).map((s) => s.trim());
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].toUpperCase();
        if (["UPI", "CASH", "CARD", "BANK", "STANDARD"].includes(lastPart)) {
          method = lastPart;
          note = parts.slice(0, -1).join(" · ").trim();
        } else {
          const firstPart = parts[0].toUpperCase();
          if (["UPI", "CASH", "CARD", "BANK", "STANDARD"].includes(firstPart)) {
            method = firstPart;
            note = parts.slice(1).join(" · ").trim();
          }
        }
      }
    } else {
      const upper = note.toUpperCase();
      if (upper === "UPI" || upper === "CASH" || upper === "CARD" || upper === "BANK TRANSFER") {
        method = upper;
        note = "Repayment";
      }
    }
  }

  if (!method) method = "UPI";
  if (!note) note = "Partial repayment";

  return { method, note };
}

const PAYMENT_METHODS = [
  { id: "UPI", label: "UPI", icon: Smartphone },
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "CARD", label: "Card", icon: CreditCard },
  { id: "BANK", label: "Bank Transfer", icon: Building },
];

export const LoanDetailView: React.FC<LoanDetailViewProps> = ({
  loan,
  person,
  settings,
  onBack,
  onSettleLoan,
  onRecordRepayment,
  onDeleteLoan,
  onDeleteRepayment,
}) => {
  const updateLoan = useAppStore((s) => s.updateLoan);
  const showToast = useUIStore((s) => s.showToast);

  // Dropdown & Modal States
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeRepaymentMenuId, setActiveRepaymentMenuId] = useState<string | null>(null);
  const [repToDelete, setRepToDelete] = useState<string | null>(null);

  // Edit Modal form states
  const [editAmountStr, setEditAmountStr] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editMethod, setEditMethod] = useState("UPI");
  const [editNote, setEditNote] = useState("");

  const topMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topMenuRef.current && !topMenuRef.current.contains(event.target as Node)) {
        setShowTopMenu(false);
      }
      if (activeRepaymentMenuId && !(event.target as HTMLElement).closest(".repayment-menu-container")) {
        setActiveRepaymentMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeRepaymentMenuId]);

  const isLent = loan.direction === "lent";
  const todayStr = getToday();

  // Calculations
  const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
  const remainingBalance = Math.max(0, loan.amount - totalRepaid);
  const isSettled = remainingBalance === 0;
  const isOverdue = loan.dueDate && loan.dueDate < todayStr && !isSettled;

  const progressPercent = loan.amount > 0
    ? Math.min(100, Math.round((totalRepaid / loan.amount) * 100))
    : isSettled ? 100 : 0;

  // Chronologically sort repayments (most recent first: newest on top, older below)
  const sortedRepayments = [...loan.repayments].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });

  // Determine loan title & payment method display
  const loanTitle = loan.direction === "lent" ? "Money Lent" : "Money Borrowed";
  const loanPaymentMethod = loan.paymentMethod?.toUpperCase() || "UPI";

  // Open Edit Modal
  const handleOpenEdit = () => {
    setShowTopMenu(false);
    setEditAmountStr(minorUnitsToInputString(loan.amount));
    setEditDate(loan.date || getToday());
    setEditDueDate(loan.dueDate || "");
    setEditMethod(loan.paymentMethod?.toUpperCase() || "UPI");
    setEditNote(loan.description || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAmount = parseMoneyInput(editAmountStr);
    if (newAmount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    updateLoan(loan.id, {
      amount: newAmount,
      date: editDate || getToday(),
      dueDate: editDueDate || undefined,
      paymentMethod: editMethod.toUpperCase(),
      description: editNote.trim() || undefined,
    });

    showToast("Loan details updated successfully");
    setShowEditModal(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200 pb-28 sm:pb-16">
      {/* 1. Header with Circular Back Button, Title, Subtitles, and More Menu (Aligned with Screen 2) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] active:scale-95 border border-[#1F2937] flex items-center justify-center text-white transition cursor-pointer shrink-0 shadow-sm"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-white truncate tracking-tight">
              {loanTitle}
            </h1>
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#94A3B8] mt-0.5">
              <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">
                {isLent ? `To ${person.name}` : `From ${person.name}`}
              </span>
              <span className="text-[#64748B]">•</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shrink-0 ${
                  isLent
                    ? "bg-rose-950/70 text-rose-400 border border-rose-800/40"
                    : "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                }`}
              >
                {isLent ? "Lent" : "Borrowed"}
              </span>
              <span className="text-[#64748B] hidden xs:inline">•</span>
              <span className="text-[11px] text-[#8E8E93] hidden xs:inline whitespace-nowrap">
                {formatImageDate(loan.date)}
              </span>
            </div>
          </div>
        </div>

        {/* Top More Options Button & Dropdown */}
        <div className="relative shrink-0" ref={topMenuRef}>
          <button
            type="button"
            onClick={() => setShowTopMenu(!showTopMenu)}
            className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] active:scale-95 border border-[#1F2937] flex items-center justify-center text-[#8E8E93] hover:text-white transition cursor-pointer shadow-sm"
            title="More Options"
            aria-label="More Options"
            aria-expanded={showTopMenu}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showTopMenu && (
            <div className="absolute right-0 top-12 w-44 rounded-xl bg-[#0D141F] border border-[#1E293B] shadow-2xl py-1 z-40 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#162130] flex items-center gap-2.5 transition cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit Loan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTopMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2.5 transition cursor-pointer border-t border-[#1E293B]/60"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Loan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout on PC/Laptop (lg:grid-cols-12), 1-Column Stack on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column (5 columns on desktop): Summary Card, Record Repayment Button, Loan Information */}
        <div className="lg:col-span-5 space-y-4">
          {/* 2. Compact Hero Summary Card (Reduced height, tight padding & spacing) */}
          <div className="rounded-2xl bg-[#0E1520] border border-[#1B2636] p-4 sm:p-4.5 space-y-3 shadow-lg">
            {/* Top Row: Icon + "Remaining" & Amount | Repaid % Badge */}
            <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#122825] border border-emerald-800/35 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-[#94A3B8] font-medium leading-tight">
                {isLent ? "Remaining to receive" : "Remaining to repay"}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono-num tracking-tight mt-0.5 truncate">
                {formatMoney(remainingBalance, settings.currency, settings.numberFormat)}
              </div>
            </div>
          </div>

          {/* Repaid Badge Box */}
          <div className="bg-[#112423] border border-emerald-800/35 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-center shrink-0 min-w-[62px]">
            <div className="text-emerald-400 font-extrabold text-sm sm:text-base font-mono-num leading-tight">
              {progressPercent}%
            </div>
            <div className="text-[#94A3B8] text-[10px] font-medium tracking-wide">
              Repaid
            </div>
          </div>
        </div>

        {/* Progress Bar & Sub-labels */}
        <div className="space-y-1 pt-0.5">
          <div className="w-full h-2 rounded-full bg-[#182333] overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full rounded-full bg-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono-num font-medium px-0.5">
            <span>
              {formatMoney(totalRepaid, settings.currency, settings.numberFormat)} paid
            </span>
            <span>
              {formatMoney(loan.amount, settings.currency, settings.numberFormat)} total
            </span>
          </div>
        </div>

        {/* Subtle Horizontal Divider */}
        <div className="border-t border-[#1A2637]" />

        {/* Bottom 3-Column Metrics: Total Borrowed | Amount Repaid | Remaining */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 text-left pt-0.5">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] font-medium mb-0.5 truncate">
              {isLent ? "Total Lent" : "Total Borrowed"}
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-white font-mono-num truncate">
              {formatMoney(loan.amount, settings.currency, settings.numberFormat)}
            </div>
          </div>

          <div className="border-l border-[#1A2637] pl-2 sm:pl-3 min-w-0">
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] font-medium mb-0.5 truncate">
              Amount Repaid
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-emerald-400 font-mono-num truncate">
              {formatMoney(totalRepaid, settings.currency, settings.numberFormat)}
            </div>
          </div>

          <div className="border-l border-[#1A2637] pl-2 sm:pl-3 min-w-0">
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] font-medium mb-0.5 truncate">
              Remaining
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-rose-400 font-mono-num truncate">
              {formatMoney(remainingBalance, settings.currency, settings.numberFormat)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Action Button: + Record Repayment */}
      <button
        type="button"
        onClick={onRecordRepayment}
        disabled={isSettled}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-950/20 ${
          isSettled
            ? "bg-[#16202D] text-[#64748B] border border-[#223145] cursor-not-allowed opacity-60 shadow-none"
            : "bg-[#22C55E] hover:bg-[#16A34A] active:scale-[0.99] text-[#0A0E14]"
        }`}
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        <span>{isSettled ? "Loan Fully Settled" : "Record Repayment"}</span>
      </button>

      {/* 4. "Loan Information" Card (Aligned key-values, compact spacing, neat Edit button) */}
      <div className="rounded-2xl bg-[#0E1520] border border-[#1B2636] p-4 sm:p-4.5 space-y-2.5 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2637]/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#16202D] border border-[#223145] flex items-center justify-center text-[#94A3B8]">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Loan Information
            </h2>
          </div>

          <button
            type="button"
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15202E] hover:bg-[#1C2B3E] border border-[#223348] text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer active:scale-95"
            title="Edit loan information"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>

        {/* Rows with consistent alignment and spacing */}
        <div className="space-y-2 pt-0.5 text-xs">
          {/* Row 1: Borrowed On / Lent On */}
          <div className="flex items-center justify-between gap-3 py-0.5 px-[1px] pb-[10px]">
            <div className="flex items-center gap-2 text-[#94A3B8] shrink-0 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <span>{isLent ? "Lent On" : "Borrowed On"}</span>
            </div>
            <div className="font-semibold text-white font-mono-num text-right">
              {formatImageDate(loan.date)}
            </div>
          </div>

          {/* Row 2: Payment Method */}
          <div className="flex items-center justify-between gap-3 py-0.5 border-t border-[#1A2637]/60 pt-2">
            <div className="flex items-center gap-2 text-[#94A3B8] shrink-0 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Payment Method</span>
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-md bg-[#15202E] border border-[#223348] text-slate-200 text-[11px] font-bold uppercase tracking-wider">
                {loanPaymentMethod}
              </span>
            </div>
          </div>

          {/* Row 3: Due Date (if present) */}
          {loan.dueDate && (
            <div className="flex items-center justify-between gap-3 py-0.5 border-t border-[#1A2637]/60 pt-2">
              <div className="flex items-center gap-2 text-[#94A3B8] shrink-0 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Due Date</span>
              </div>
              <div className={`font-semibold font-mono-num text-right ${isOverdue ? "text-rose-400 font-bold" : "text-white"}`}>
                {formatImageDate(loan.dueDate)} {isOverdue && <span className="text-[10px] text-rose-400 ml-1">(Overdue)</span>}
              </div>
            </div>
          )}

          {/* Row 4: Note */}
          <div className="flex items-start justify-between gap-3 py-0.5 border-t border-[#1A2637]/60 pt-2">
            <div className="flex items-center gap-2 text-[#94A3B8] shrink-0 font-medium pt-0.5">
              <FileText className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Note</span>
            </div>
            <div
              title={loan.description || "No note added"}
              className={`text-right text-xs max-w-[200px] sm:max-w-xs break-words ${
                loan.description ? "text-slate-200 font-medium" : "text-[#64748B] italic"
              }`}
            >
              {loan.description || "No note added"}
            </div>
          </div>
        </div>
      </div>

        </div>

        {/* Right Column (7 columns on desktop): Repayment History Section */}
        <div className="lg:col-span-7 space-y-4">
          {/* 5. "Repayment History" Card (Clean alignment, no awkward truncation, responsive) */}
          <div className="rounded-2xl bg-[#0E1520] border border-[#1B2636] p-4 sm:p-4.5 space-y-3 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1A2637]/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#16202D] border border-[#223145] flex items-center justify-center text-[#94A3B8]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Repayment History
                </h2>
              </div>

              <div className="text-[11px] sm:text-xs text-[#94A3B8] font-mono-num font-medium">
                {sortedRepayments.length} {sortedRepayments.length === 1 ? "payment" : "payments"} • {formatMoney(totalRepaid, settings.currency, settings.numberFormat)}
              </div>
            </div>

            {/* Repayment Timeline List */}
            {sortedRepayments.length === 0 ? (
              <div className="py-7 text-center text-[#64748B] text-xs space-y-1">
                <p className="font-medium">No repayments recorded yet.</p>
                <p className="text-[11px] text-[#475569]">
                  Tap &quot;Record Repayment&quot; above to log the first installment.
                </p>
              </div>
            ) : (
              <div className="relative pt-1 space-y-0.5">
                {sortedRepayments.map((rep, idx) => {
                  const isLast = idx === sortedRepayments.length - 1;
                  const { method } = parseRepaymentDetails(rep);
                  const isMenuOpen = activeRepaymentMenuId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      className="relative flex items-center justify-between py-2.5 sm:py-3 group hover:bg-[#121A26]/50 rounded-xl px-2 transition-colors gap-2"
                    >
                      {/* Vertical connecting line between icons */}
                      {!isLast && (
                        <div
                          className="absolute left-[20px] top-[28px] bottom-0 w-[2px] bg-emerald-700/35"
                          style={{ height: "calc(100% - 6px)" }}
                        />
                      )}

                      {/* Left: Checkmark Icon & Details (amount + method badge + note) */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 z-10">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-400 text-[#0A0E14] flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-white font-mono-num leading-tight">
                            {formatMoney(rep.amount, settings.currency, settings.numberFormat)}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 mt-0.5 min-w-0">
                            <span className="px-1.5 py-0.2 rounded bg-[#15202E] border border-[#223348] text-slate-300 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                              {method}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Date & Dropdown Menu (Guaranteed no wrap or squishing) */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-10 repayment-menu-container">
                        <span className="text-[11px] sm:text-xs text-[#94A3B8] font-medium font-mono-num whitespace-nowrap">
                          {formatImageDate(rep.date)}
                        </span>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveRepaymentMenuId(isMenuOpen ? null : rep.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-white hover:bg-[#1A2637] transition cursor-pointer"
                            title="Options"
                            aria-label="Repayment options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-8 w-40 rounded-xl bg-[#0D141F] border border-[#1E293B] shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRepaymentMenuId(null);
                                  setRepToDelete(rep.id);
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-400" />
                                <span>Delete Payment</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Edit Loan Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-[#0D141F] border border-[#1E293B] shadow-2xl overflow-hidden p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1A2637]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">Edit Loan Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#1A2637] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              {/* Principal Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Principal Amount ({settings.currency})
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editAmountStr}
                  onChange={(e) => setEditAmountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E2B] border border-[#223348] text-white font-mono-num font-bold text-sm sm:text-base focus:outline-none focus:border-emerald-500 transition"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {isLent ? "Date Lent" : "Date Borrowed"}
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E2B] border border-[#223348] text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              {/* Due Date (Optional) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E2B] border border-[#223348] text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditMethod(m.id)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                        editMethod === m.id
                          ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                          : "bg-[#141E2B] text-slate-300 border-[#223348] hover:border-slate-500"
                      }`}
                    >
                      <m.icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note / Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Dinner, rent, split payment..."
                  className="w-full px-3 py-2 rounded-xl bg-[#141E2B] border border-[#223348] text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#16202D] hover:bg-[#1E2E42] text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Loan Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D141F] border border-[#1E293B] shadow-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Delete Loan Record?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will permanently remove this loan and all its {loan.repayments.length} repayment entries.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#16202D] hover:bg-[#1E2E42] text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteLoan(loan.id);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Delete Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Delete Repayment Confirmation Modal */}
      {repToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D141F] border border-[#1E293B] shadow-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Delete Installment?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you sure you want to remove this repayment installment?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRepToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#16202D] hover:bg-[#1E2E42] text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRepayment(loan.id, repToDelete);
                  setRepToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
