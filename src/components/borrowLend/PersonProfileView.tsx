import React, { useState, useMemo, useRef, useEffect } from "react";
import { Loan } from "@/types/loan";
import { Person } from "@/types/person";
import { Settings } from "@/types/settings";
import { formatMoney } from "@/utils/currency";
import { formatShortDate } from "@/utils/dates";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { 
  ArrowLeft, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react";

interface PersonProfileViewProps {
  person: Person;
  loans: Loan[];
  settings: Settings;
  onBack: () => void;
  onOpenNewTransaction: () => void;
  onOpenLoan: (loanId: string) => void;
}

/**
 * Formats date into DD/MM/YYYY (e.g. "10/10/2026")
 */
function formatSlashDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const dayStr = d.toString().padStart(2, "0");
  const monthStr = m.toString().padStart(2, "0");
  return `${dayStr}/${monthStr}/${y}`;
}

export const PersonProfileView: React.FC<PersonProfileViewProps> = ({
  person,
  loans,
  settings,
  onBack,
  onOpenNewTransaction,
  onOpenLoan,
}) => {
  const updatePerson = useAppStore((s) => s.updatePerson);
  const deletePerson = useAppStore((s) => s.deletePerson);
  const showToast = useUIStore((s) => s.showToast);

  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(person.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatarColors = getAvatarColors(person.name);
  const initials = getInitials(person.name);

  // Close more menu on click outside or touch outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    setEditedName(person.name);
  }, [person.name]);

  // Aggregate active lents and active borrows
  const lentLoans = useMemo(() => loans.filter((l) => l.direction === "lent"), [loans]);
  const borrowedLoans = useMemo(() => loans.filter((l) => l.direction === "borrowed"), [loans]);

  const activeLents = useMemo(() => {
    return lentLoans.filter((l) => {
      const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
      return l.amount - repaid > 0;
    });
  }, [lentLoans]);

  const activeBorrows = useMemo(() => {
    return borrowedLoans.filter((l) => {
      const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
      return l.amount - repaid > 0;
    });
  }, [borrowedLoans]);

  const totalLentRemaining = useMemo(() => {
    return activeLents.reduce((sum, l) => {
      const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      return sum + Math.max(0, l.amount - repaid);
    }, 0);
  }, [activeLents]);

  const totalBorrowedRemaining = useMemo(() => {
    return activeBorrows.reduce((sum, l) => {
      const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      return sum + Math.max(0, l.amount - repaid);
    }, 0);
  }, [activeBorrows]);

  // Net Balance & History Counts for Overview
  const netRemaining = totalLentRemaining - totalBorrowedRemaining;
  const isSettled = totalLentRemaining === 0 && totalBorrowedRemaining === 0;

  const timesBorrowed = borrowedLoans.length;
  const timesLent = lentLoans.length;
  const timesSettled = useMemo(() => {
    return loans.filter((l) => {
      const repaid = l.repayments.reduce((sum, r) => sum + r.amount, 0);
      return l.amount - repaid <= 0;
    }).length;
  }, [loans]);

  // Chronologically sort loans (most recent first)
  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => b.date.localeCompare(a.date));
  }, [loans]);

  const addedDate = person.createdAt
    ? formatShortDate(person.createdAt.split("T")[0])
    : "Recently";

  const handleSaveName = () => {
    const trimmed = editedName.trim();
    if (!trimmed) return;
    updatePerson(person.id, trimmed);
    showToast("Contact name updated", "success");
    setIsEditingName(false);
  };

  const handleDeleteUser = () => {
    deletePerson(person.id, true);
    showToast("Contact deleted", "success");
    setShowDeleteConfirm(false);
    onBack();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 max-w-6xl mx-auto pb-14">
      {/* 1. Header with Back button, Avatar, Name & Working More Options */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] border border-[#1F2937] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95 shrink-0"
            title="Back to Borrow & Lend"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${avatarColors.bg} ${avatarColors.text}`}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] truncate tracking-tight">
              {person.name}
            </h1>
            <p className="text-xs text-[#8E8E93]">Added on {addedDate}</p>
          </div>
        </div>

        {/* More options menu button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] active:scale-95 border border-[#1F2937] flex items-center justify-center text-[#8E8E93] hover:text-[#F5F5F5] transition cursor-pointer shrink-0"
            title="More options"
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-12 z-50 w-48 rounded-2xl bg-[#0F1720] border border-[#1E293B] shadow-2xl py-1.5 text-sm animate-in fade-in zoom-in-95"
            >
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setEditedName(person.name);
                  setIsEditingName(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-[#D4D4D8] hover:text-white hover:bg-[#15202E] flex items-center gap-2.5 transition cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-[#8E8E93]" />
                <span>Edit name</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition cursor-pointer border-t border-[#1E293B]/60"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete user</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F1720] border border-[#1E293B] p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#F5F5F5]">Edit Contact Name</h3>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-[#8E8E93] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#8E8E93] font-medium block">Name</label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                autoFocus
                placeholder="Enter contact name"
                className="w-full bg-[#15202E] border border-[#1E293B] focus:border-neutral-400 rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] outline-none transition"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveName();
                  } else if (e.key === "Escape") {
                    setIsEditingName(false);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-[#15202E] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveName}
                disabled={!editedName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F1720] border border-[#1E293B] p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F5F5F5]">Delete user?</h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Are you sure you want to delete <span className="text-[#F5F5F5] font-semibold">{person.name}</span>? This will permanently remove this contact and all associated loan history.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-[#15202E] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
              >
                Delete user
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Layout: 12-column Grid on Desktop (PC), Stack on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Quick Action, Active Cards, Overview */}
        <div className="lg:col-span-5 space-y-4">
          {/* Button below name to initiate a new transaction */}
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-bold text-sm transition shadow-lg shadow-emerald-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Transaction</span>
          </button>

          {/* Two Distinct Cards: 'Active Lents' and 'Active Borrows' (Without original amounts) */}
          <div className="grid grid-cols-2 gap-3 select-none">
            {/* Active Lents Card */}
            <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] p-3.5 sm:p-4 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                </span>
                <span className="text-xs font-bold truncate">Active Lents</span>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  {activeLents.length} {activeLents.length === 1 ? "active loan" : "active loans"}
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-emerald-400">
                  {formatMoney(totalLentRemaining, settings.currency, settings.numberFormat)}
                </div>
              </div>
            </div>

            {/* Active Borrows Card */}
            <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] p-3.5 sm:p-4 flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-5 h-5 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                </span>
                <span className="text-xs font-bold truncate">Active Borrows</span>
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-[#F5F5F5]">
                  {activeBorrows.length} {activeBorrows.length === 1 ? "active loan" : "active loans"}
                </div>
                <div className="text-sm sm:text-base font-extrabold font-mono-num text-rose-400">
                  {formatMoney(totalBorrowedRemaining, settings.currency, settings.numberFormat)}
                </div>
              </div>
            </div>
          </div>

          {/* Overview Box: Net Balance + History counts on right */}
          <div
            style={{ minHeight: "142.646px" }}
            className="rounded-2xl bg-[#0F1720] border border-[#1E293B] p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div
              style={{ marginBottom: "-5px" }}
              className="flex items-center justify-between"
            >
              <span className="text-xs text-[#8E8E93] font-bold uppercase tracking-wider">
                Overview
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4">
              {/* Left Side: Net Balance */}
              <div className="space-y-1 min-w-[120px] flex-1">
                <span className="text-xs text-[#8E8E93] font-medium block">Net Balance</span>
                <div
                  className={`text-2xl sm:text-3xl font-extrabold font-mono-num tracking-tight truncate ${
                    isSettled
                      ? "text-neutral-400"
                      : netRemaining > 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {isSettled
                    ? formatMoney(0, settings.currency, settings.numberFormat)
                    : netRemaining > 0
                    ? `+${formatMoney(netRemaining, settings.currency, settings.numberFormat)}`
                    : `-${formatMoney(Math.abs(netRemaining), settings.currency, settings.numberFormat)}`}
                </div>
                <div className="text-[11px] font-medium text-[#8E8E93]">
                  {isSettled
                    ? "All settled up"
                    : netRemaining > 0
                    ? "Net to receive"
                    : "Net to pay"}
                </div>
              </div>

              {/* Right Side: History stats box */}
              <div className="rounded-xl bg-[#15202E] border border-[#1E293B] px-3.5 py-2 sm:py-2.5 text-xs min-w-[120px] sm:min-w-[130px] shrink-0 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1.5 pb-1 border-b border-[#1E293B]/70">
                  history
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A1A1AA]">borrowed</span>
                    <span className="font-bold font-mono-num text-[#F5F5F5]">{timesBorrowed}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A1A1AA]">lent</span>
                    <span className="font-bold font-mono-num text-[#F5F5F5]">{timesLent}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#A1A1AA]">settled</span>
                    <span className="font-bold font-mono-num text-emerald-400">{timesSettled}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transactions List Section */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#F5F5F5] tracking-tight">
              Transactions
            </h2>
            <span className="text-xs text-[#8E8E93] font-mono-num">
              {sortedLoans.length} {sortedLoans.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {sortedLoans.length === 0 ? (
            <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-[#F5F5F5]">No transactions recorded yet</p>
              <p className="text-xs text-[#8E8E93]">
                Tap &quot;New Transaction&quot; to log your first loan with {person.name}.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] overflow-hidden divide-y divide-[#1A2332] shadow-sm">
              {sortedLoans.map((loan) => {
                const repaid = loan.repayments.reduce((sum, r) => sum + r.amount, 0);
                const remaining = Math.max(0, loan.amount - repaid);
                const isLoanSettled = remaining === 0;
                const isLent = loan.direction === "lent";

                // Status like: to pay, To receive, settled
                let statusText = "To receive";
                if (isLoanSettled) {
                  statusText = "settled";
                } else if (isLent) {
                  statusText = "To receive";
                } else {
                  statusText = "to pay";
                }

                return (
                  <div
                    key={loan.id}
                    onClick={() => onOpenLoan(loan.id)}
                    className="group flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#15202E] transition-colors cursor-pointer select-none"
                  >
                    {/* Left: Lent (red notation) or Borrowed (green notation) + date below ex 10/10/2026 */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                      {/* Direction icon */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${
                          isLent
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        }`}
                      >
                        {isLent ? (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Notation: Lent in red, Borrowed in green */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isLent ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {isLent ? "Lent" : "Borrowed"}
                          </span>
                          {loan.description && (
                            <span className="text-xs text-[#71717A] truncate">
                              · {loan.description}
                            </span>
                          )}
                        </div>

                        {/* Date when money is borrowed or lent ex: 10/10/2026 */}
                        <div className="text-xs text-[#8E8E93] font-mono-num mt-0.5">
                          {formatSlashDate(loan.date)}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount of remaining borrowed or lent money, status below, and navigation chevron */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {/* Amount of remaining borrowed or lent money */}
                        <div
                          className={`text-sm sm:text-base font-bold font-mono-num leading-tight ${
                            isLoanSettled
                              ? "text-neutral-400"
                              : isLent
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {formatMoney(remaining, settings.currency, settings.numberFormat)}
                        </div>

                        {/* Status like: to pay, To receive, settled */}
                        <div className="text-[11px] text-[#8E8E93] font-medium mt-0.5">
                          {statusText}
                        </div>
                      </div>

                      {/* Navigation chevron */}
                      <div className="text-[#71717A] group-hover:text-white transition-colors pl-0.5">
                        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
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
  );
};
