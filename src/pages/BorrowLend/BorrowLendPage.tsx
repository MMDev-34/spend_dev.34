import React, { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { calculateLoanSummaries } from "@/utils/calculations";
import { formatMoney } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { LoanDirection } from "@/types/loan";
import { ContactRow, ContactLedger } from "@/components/borrowLend/ContactRow";
import { PersonProfileView } from "@/components/borrowLend/PersonProfileView";
import { LoanDetailView } from "@/components/borrowLend/LoanDetailView";
import { RecordRepaymentView } from "@/components/borrowLend/RecordRepaymentView";
import { NewTransactionView } from "@/components/borrowLend/NewTransactionView";
import { 
  Handshake, 
  Plus, 
  X, 
  ArrowUp, 
  Search,
  SlidersHorizontal
} from "lucide-react";

type FilterTab = "all" | "lent" | "borrowed" | "settled";

export type BorrowLendView = 
  | { type: "directory" }
  | { type: "person_profile"; personId: string }
  | { type: "loan_detail"; loanId: string; personId: string }
  | { type: "record_repayment"; loanId: string; personId: string; prefillRemaining?: boolean }
  | { type: "new_transaction"; personId?: string; initialDirection?: LoanDirection; returnTo?: "directory" | "person_profile" };

export const BorrowLendPage: React.FC = () => {
  const people = useAppStore((s) => s.people);
  const loans = useAppStore((s) => s.loans);
  const settings = useAppStore((s) => s.settings);
  const deleteLoan = useAppStore((s) => s.deleteLoan);
  const deleteRepayment = useAppStore((s) => s.deleteRepayment);
  const showToast = useUIStore((s) => s.showToast);

  const todayStr = getToday();

  // Active View in Navigation Stack (Zero Popups Architecture)
  const [activeView, setActiveView] = useState<BorrowLendView>({ type: "directory" });

  // Tab & Search Filter for Directory (Screen 1)
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const summaries = useMemo(() => calculateLoanSummaries(loans), [loans]);

  // Group all loans by person into combined ledgers
  const contactLedgers = useMemo<ContactLedger[]>(() => {
    const personIdsWithLoans = new Set(loans.map((l) => l.personId));
    const allRelevantPeople = people.filter((p) => personIdsWithLoans.has(p.id));

    return allRelevantPeople.map((person) => {
      const personLoans = loans.filter((l) => l.personId === person.id);

      const lentLoans = personLoans.filter((l) => l.direction === "lent");
      const borrowedLoans = personLoans.filter((l) => l.direction === "borrowed");

      const totalLent = lentLoans.reduce((sum, l) => sum + l.amount, 0);
      const totalBorrowed = borrowedLoans.reduce((sum, l) => sum + l.amount, 0);

      const lentRepaid = lentLoans.reduce((sum, l) => {
        return sum + l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      }, 0);

      const borrowedRepaid = borrowedLoans.reduce((sum, l) => {
        return sum + l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      }, 0);

      const lentRemaining = Math.max(0, totalLent - lentRepaid);
      const borrowedRemaining = Math.max(0, totalBorrowed - borrowedRepaid);

      const netRemaining = lentRemaining - borrowedRemaining;
      const isSettled = lentRemaining === 0 && borrowedRemaining === 0;
      const totalRepaid = lentRepaid + borrowedRepaid;

      return {
        person,
        loans: personLoans,
        lentRemaining,
        borrowedRemaining,
        netRemaining,
        isSettled,
        totalLent,
        totalBorrowed,
        totalRepaid,
      };
    });
  }, [people, loans]);

  // Counts for summary cards (Screen 1)
  const peopleOweYouCount = useMemo(() => {
    return contactLedgers.filter((l) => !l.isSettled && l.netRemaining > 0).length;
  }, [contactLedgers]);

  const peopleToRepayCount = useMemo(() => {
    return contactLedgers.filter((l) => !l.isSettled && l.netRemaining < 0).length;
  }, [contactLedgers]);

  // Filter ledgers for Directory View (Screen 1: All | Lent | Borrowed | Overdue | Settled)
  const filteredLedgers = useMemo(() => {
    const list = contactLedgers.filter((ledger) => {
      if (activeTab === "lent" && (ledger.isSettled || ledger.netRemaining <= 0)) {
        return false;
      }
      if (activeTab === "borrowed" && (ledger.isSettled || ledger.netRemaining >= 0)) {
        return false;
      }
      if (activeTab === "settled" && !ledger.isSettled) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ledger.person.name.toLowerCase().includes(q);
        const matchesNote = ledger.loans.some((l) => l.description?.toLowerCase().includes(q));
        if (!matchesName && !matchesNote) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (a.isSettled && !b.isSettled) return 1;
      if (!a.isSettled && b.isSettled) return -1;
      return Math.abs(b.netRemaining) - Math.abs(a.netRemaining);
    });
  }, [contactLedgers, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: contactLedgers.length,
      lent: peopleOweYouCount,
      borrowed: peopleToRepayCount,
      settled: contactLedgers.filter((l) => l.isSettled).length,
    };
  }, [contactLedgers, peopleOweYouCount, peopleToRepayCount]);

  // -------------------------------------------------------------
  // VIEW ROUTER: Dedicated Page Architecture
  // -------------------------------------------------------------

  // 1. Stage 4: Dedicated New Transaction Page (Screen 5)
  if (activeView.type === "new_transaction") {
    return (
      <NewTransactionView
        preselectedPersonId={activeView.personId}
        initialDirection={activeView.initialDirection || "lent"}
        settings={settings}
        onBack={() => {
          if (activeView.returnTo === "person_profile" && activeView.personId) {
            setActiveView({ type: "person_profile", personId: activeView.personId });
          } else {
            setActiveView({ type: "directory" });
          }
        }}
        onSuccess={(targetPersonId) => {
          setActiveView({ type: "person_profile", personId: targetPersonId });
        }}
      />
    );
  }

  // 2. Stage 3: Dedicated Record Repayment / Settle Page (Screens 4 & 6)
  if (activeView.type === "record_repayment") {
    const targetLoan = loans.find((l) => l.id === activeView.loanId);
    const targetPerson = people.find((p) => p.id === activeView.personId);

    if (!targetLoan || !targetPerson) {
      setActiveView({ type: "directory" });
      return null;
    }

    return (
      <RecordRepaymentView
        loan={targetLoan}
        person={targetPerson}
        settings={settings}
        prefillFullRemaining={activeView.prefillRemaining}
        onBack={() => {
          setActiveView({ type: "loan_detail", loanId: activeView.loanId, personId: activeView.personId });
        }}
        onSuccess={() => {
          setActiveView({ type: "loan_detail", loanId: activeView.loanId, personId: activeView.personId });
        }}
      />
    );
  }

  // 3. Stage 2: Dedicated Individual Loan Page (Screens 3 & 7)
  if (activeView.type === "loan_detail") {
    const targetLoan = loans.find((l) => l.id === activeView.loanId);
    const targetPerson = people.find((p) => p.id === activeView.personId);

    if (!targetLoan || !targetPerson) {
      setActiveView({ type: "person_profile", personId: activeView.personId });
      return null;
    }

    return (
      <LoanDetailView
        loan={targetLoan}
        person={targetPerson}
        settings={settings}
        onBack={() => {
          setActiveView({ type: "person_profile", personId: activeView.personId });
        }}
        onSettleLoan={() => {
          setActiveView({
            type: "record_repayment",
            loanId: targetLoan.id,
            personId: targetPerson.id,
            prefillRemaining: true,
          });
        }}
        onRecordRepayment={() => {
          setActiveView({
            type: "record_repayment",
            loanId: targetLoan.id,
            personId: targetPerson.id,
            prefillRemaining: false,
          });
        }}
        onDeleteLoan={(loanId) => {
          deleteLoan(loanId);
          showToast("Loan record deleted");
          setActiveView({ type: "person_profile", personId: activeView.personId });
        }}
        onDeleteRepayment={(loanId, repaymentId) => {
          deleteRepayment(loanId, repaymentId);
          showToast("Installment deleted");
        }}
      />
    );
  }

  // 4. Stage 1: Dedicated Person Profile Page (Screens 2 & 8)
  if (activeView.type === "person_profile") {
    const targetPerson = people.find((p) => p.id === activeView.personId);
    const personLoans = loans.filter((l) => l.personId === activeView.personId);

    if (!targetPerson) {
      setActiveView({ type: "directory" });
      return null;
    }

    return (
      <PersonProfileView
        person={targetPerson}
        loans={personLoans}
        settings={settings}
        onBack={() => setActiveView({ type: "directory" })}
        onOpenNewTransaction={() => {
          setActiveView({
            type: "new_transaction",
            personId: targetPerson.id,
            returnTo: "person_profile",
          });
        }}
        onOpenLoan={(loanId) => {
          setActiveView({
            type: "loan_detail",
            loanId,
            personId: targetPerson.id,
          });
        }}
      />
    );
  }

  // 5. Screen 1: Main Borrow & Lend Overview / Directory View
  return (
    <div className="space-y-4 animate-in fade-in duration-200 max-w-6xl mx-auto pb-14">
      {/* Summary Cards: To receive & To repay (Screen 1) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 select-none">
        {/* Card 1: To receive (Dark green card matching Screen 1) */}
        <div 
          onClick={() => setActiveTab("lent")}
          className="rounded-2xl bg-[#0D281E] border border-[#143828] p-4 sm:p-5 flex flex-col justify-between shadow-sm min-h-[124px] transition hover:border-[#1E4D37] cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className="text-xs sm:text-sm font-semibold">To receive</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#22C55E] font-mono-num mt-2 tracking-tight">
              {formatMoney(summaries.owedToUser, settings.currency, settings.numberFormat)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-emerald-400/90 font-medium mt-2">
            {peopleOweYouCount} {peopleOweYouCount === 1 ? "person owes you" : "people owe you"}
          </div>
        </div>

        {/* Card 2: To repay (Dark red card matching Screen 1) */}
        <div 
          onClick={() => setActiveTab("borrowed")}
          className="rounded-2xl bg-[#2B1418] border border-[#3D1B22] p-4 sm:p-5 flex flex-col justify-between shadow-sm min-h-[124px] transition hover:border-[#52242D] cursor-pointer"
        >
          <div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className="text-xs sm:text-sm font-semibold">To repay</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#F43F5E] font-mono-num mt-2 tracking-tight">
              {formatMoney(summaries.userOwes, settings.currency, settings.numberFormat)}
            </div>
          </div>
          <div className="text-[11px] sm:text-xs text-rose-400/90 font-medium mt-2">
            {peopleToRepayCount} {peopleToRepayCount === 1 ? "person to repay" : "people to repay"}
          </div>
        </div>
      </div>

      {/* Dual Prominent Quick Actions: [+ Lend Money] and [+ Borrow Money] (Screen 1) */}
      <div className="grid grid-cols-2 gap-3 pt-0.5">
        <button
          type="button"
          onClick={() => setActiveView({ type: "new_transaction", initialDirection: "lent", returnTo: "directory" })}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#0F1720] hover:bg-[#15202E] active:scale-[0.99] border border-[#1E293B] text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] text-rose-400" />
          <span>Lend Money</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView({ type: "new_transaction", initialDirection: "borrowed", returnTo: "directory" })}
          className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#0F1720] hover:bg-[#15202E] active:scale-[0.99] border border-[#1E293B] text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] text-emerald-400" />
          <span>Borrow Money</span>
        </button>
      </div>

      {/* Search Bar & Filter Tabs (Screen 1) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F1720] border border-[#1E293B] focus:border-neutral-500 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#71717A] outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="w-10 h-10 rounded-xl bg-[#0F1720] border border-[#1E293B] flex items-center justify-center text-[#8E8E93] hover:text-white transition cursor-pointer shrink-0"
            title="Filter options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills (Screen 1: All | Lent | Borrowed | Settled) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(["all", "lent", "borrowed", "settled"] as const).map((tab) => {
            const label =
              tab === "all"
                ? "All"
                : tab === "lent"
                ? "Lent"
                : tab === "borrowed"
                ? "Borrowed"
                : "Settled";
            const count = tabCounts[tab];
            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#1E293B] text-white border border-[#334155] shadow-sm font-bold"
                    : "bg-[#0F1720] text-[#8E8E93] hover:text-[#D4D4D8] border border-[#1E293B]"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] font-mono-num opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* People List (Screen 1) */}
      <div className="rounded-2xl bg-[#0F1720] border border-[#1E293B] overflow-hidden divide-y divide-[#1A2332] shadow-sm">
        {filteredLedgers.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#15202E] border border-[#1E293B] flex items-center justify-center mx-auto text-[#71717A]">
              <Handshake className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {searchQuery ? "No matching contacts found" : "No records in this category"}
              </h3>
              <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
                {searchQuery
                  ? "Try searching with a different name or clear the search query."
                  : "Tap + Lend Money or + Borrow Money to record a loan."}
              </p>
            </div>
          </div>
        ) : (
          filteredLedgers.map((ledger) => (
            <ContactRow
              key={ledger.person.id}
              ledger={ledger}
              settings={settings}
              onOpenDetails={(p) => setActiveView({ type: "person_profile", personId: p.id })}
            />
          ))
        )}
      </div>
    </div>
  );
};
