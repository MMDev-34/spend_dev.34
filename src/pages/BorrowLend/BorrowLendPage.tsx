import React, { useState, useMemo, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { calculateLoanSummaries } from "@/utils/calculations";
import { formatMoney, parseMoneyInput } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { Loan, LoanDirection } from "@/types/loan";
import { Person } from "@/types/person";
import { ContactRow } from "@/components/borrowLend/ContactRow";
import { ContactDetailSheet } from "@/components/borrowLend/ContactDetailSheet";
import { LoanDetailsModal } from "@/components/borrowLend/LoanDetailsModal";
import { CustomSettleModal } from "@/components/borrowLend/CustomSettleModal";
import { 
  Handshake, 
  Plus, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronLeft,
  ChevronRight,
  Search,
  Scale
} from "lucide-react";

type FilterTab = "all" | "owed_to_me" | "i_owe";

export const BorrowLendPage: React.FC = () => {
  const people = useAppStore((s) => s.people);
  const loans = useAppStore((s) => s.loans);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const addPerson = useAppStore((s) => s.addPerson);
  const addLoan = useAppStore((s) => s.addLoan);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const deleteLoan = useAppStore((s) => s.deleteLoan);
  const showToast = useUIStore((s) => s.showToast);

  // Tab & Search Filter
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Bottom Sheet for Contact Loan History
  const [activeSheetPerson, setActiveSheetPerson] = useState<Person | null>(null);

  // Add Loan Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [direction, setDirection] = useState<LoanDirection>("lent");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [personName, setPersonName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(getToday());
  const [dueDate, setDueDate] = useState("");

  // Detail Modal & Custom Settle Modal States
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Settlement Modal targets
  const [settleTargetLoan, setSettleTargetLoan] = useState<Loan | null>(null);
  const [settleTargetPerson, setSettleTargetPerson] = useState<Person | null>(null);
  const [settleContactLoans, setSettleContactLoans] = useState<Loan[]>([]);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  useEffect(() => {
    if (isAddModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsAddModalOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isAddModalOpen]);

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const summaries = useMemo(() => calculateLoanSummaries(loans), [loans]);

  // Group all loans by personId into combined ledgers
  const contactLedgers = useMemo(() => {
    const personIdsWithLoans = new Set(loans.map((l) => l.personId));
    const allRelevantPeople = people.filter((p) => personIdsWithLoans.has(p.id));

    return allRelevantPeople.map((person) => {
      const personLoans = loans.filter((l) => l.personId === person.id);

      const lentRemaining = personLoans
        .filter((l) => l.direction === "lent")
        .reduce((sum, l) => {
          const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
          return sum + Math.max(0, l.amount - repaid);
        }, 0);

      const borrowedRemaining = personLoans
        .filter((l) => l.direction === "borrowed")
        .reduce((sum, l) => {
          const repaid = l.repayments.reduce((rSum, r) => rSum + r.amount, 0);
          return sum + Math.max(0, l.amount - repaid);
        }, 0);

      const netRemaining = lentRemaining - borrowedRemaining;
      const isSettled = lentRemaining === 0 && borrowedRemaining === 0;

      return {
        person,
        loans: personLoans,
        lentRemaining,
        borrowedRemaining,
        netRemaining,
        isSettled,
      };
    });
  }, [people, loans]);

  // Filter ledgers based on activeTab and searchQuery
  const filteredLedgers = useMemo(() => {
    return contactLedgers.filter((ledger) => {
      // 1. Tab filter
      if (activeTab === "owed_to_me" && (ledger.isSettled || ledger.netRemaining <= 0)) {
        return false;
      }
      if (activeTab === "i_owe" && (ledger.isSettled || ledger.netRemaining >= 0)) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ledger.person.name.toLowerCase().includes(q);
        const matchesNote = ledger.loans.some((l) => l.description?.toLowerCase().includes(q));
        if (!matchesName && !matchesNote) return false;
      }

      return true;
    });
  }, [contactLedgers, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const owedToMe = contactLedgers.filter((l) => !l.isSettled && l.netRemaining > 0).length;
    const iOwe = contactLedgers.filter((l) => !l.isSettled && l.netRemaining < 0).length;
    return {
      all: contactLedgers.length,
      owed_to_me: owedToMe,
      i_owe: iOwe,
    };
  }, [contactLedgers]);

  // Handlers for Add Record Form
  const handleOpenAddModalForPerson = (personId?: string) => {
    if (personId) {
      setSelectedPersonId(personId);
      setPersonName("");
    } else {
      setSelectedPersonId("");
      setPersonName("");
    }
    setAmountStr("");
    setDescription("");
    setStartDate(getToday());
    setDueDate("");
    setIsAddModalOpen(true);
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);
    if (amount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    let targetPersonId = selectedPersonId;
    if (!targetPersonId) {
      if (!personName.trim()) {
        showToast("Please select or enter a contact name", "error");
        return;
      }
      const newPerson = addPerson(personName.trim());
      targetPersonId = newPerson.id;
    }

    addLoan({
      personId: targetPersonId,
      direction,
      amount,
      description: description.trim() || undefined,
      date: startDate || getToday(),
      dueDate: dueDate || undefined,
    });

    const targetName = peopleMap.get(targetPersonId)?.name || personName;

    // When lending money, also auto-record an expense transaction tagged as 'transfer'
    if (direction === "lent") {
      const transferCat = categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer");
      const defaultCat = transferCat || categories.find((c) => c.type === "expense" || c.type === "both");
      addTransaction({
        type: "expense",
        tag: "transfer",
        amount,
        categoryId: defaultCat?.id || "cat-transfer",
        date: startDate || getToday(),
        note: description.trim()
          ? `${description.trim()} (Lent to: ${targetName})`
          : `Lent to ${targetName}`,
        paymentMethod: settings.defaultPaymentMethod || "upi",
      });
      showToast(`Added lent record & logged expense for ${targetName}`);
    } else {
      showToast(`Added borrowed record from ${targetName}`);
    }
    setIsAddModalOpen(false);
    setAmountStr("");
    setPersonName("");
    setSelectedPersonId("");
    setDescription("");
    setStartDate(getToday());
    setDueDate("");
  };

  // Date steppers
  const changeStartDateByDays = (deltaDays: number) => {
    try {
      const baseDate = startDate ? new Date(startDate + "T00:00:00") : new Date();
      if (isNaN(baseDate.getTime())) {
        setStartDate(getToday());
        return;
      }
      baseDate.setDate(baseDate.getDate() + deltaDays);
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, "0");
      const day = String(baseDate.getDate()).padStart(2, "0");
      setStartDate(`${year}-${month}-${day}`);
    } catch {
      setStartDate(getToday());
    }
  };

  const changeDueDateByDays = (deltaDays: number) => {
    try {
      const baseDate = dueDate ? new Date(dueDate + "T00:00:00") : new Date();
      if (isNaN(baseDate.getTime())) {
        setDueDate(getToday());
        return;
      }
      baseDate.setDate(baseDate.getDate() + deltaDays);
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, "0");
      const day = String(baseDate.getDate()).padStart(2, "0");
      setDueDate(`${year}-${month}-${day}`);
    } catch {
      setDueDate(getToday());
    }
  };

  // Settlement Triggers
  const handleSettleContact = (person: Person, personLoans: Loan[]) => {
    setSettleTargetPerson(person);
    setSettleTargetLoan(null);
    setSettleContactLoans(personLoans);
    setIsSettleModalOpen(true);
  };

  const handleSettleSingleLoan = (loan: Loan) => {
    const person = peopleMap.get(loan.personId) || null;
    setSettleTargetPerson(person);
    setSettleTargetLoan(loan);
    setSettleContactLoans([loan]);
    setIsSettleModalOpen(true);
  };

  const handleOpenLoanDetails = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsDetailsOpen(true);
  };

  const selectedPerson = selectedLoan ? peopleMap.get(selectedLoan.personId) : undefined;
  const activeSheetLoans = activeSheetPerson
    ? loans.filter((l) => l.personId === activeSheetPerson.id)
    : [];

  const netBalanceFormatted = `${summaries.netBalance >= 0 ? "+" : ""}${formatMoney(
    summaries.netBalance,
    settings.currency,
    settings.numberFormat
  )}`;
  const userOwesFormatted = formatMoney(
    summaries.userOwes,
    settings.currency,
    settings.numberFormat
  );
  const owedToUserFormatted = formatMoney(
    summaries.owedToUser,
    settings.currency,
    settings.numberFormat
  );

  // Dynamically decrease text size as amount string gets longer to prevent clipping/truncation
  const getDynamicAmountSize = (text: string) => {
    const len = text.length;
    if (len >= 18) return "text-[9px] sm:text-[10px] md:text-xs";
    if (len >= 15) return "text-[10px] sm:text-[11px] md:text-xs";
    if (len >= 12) return "text-[11px] sm:text-xs md:text-sm";
    if (len >= 9) return "text-xs sm:text-sm md:text-base";
    if (len >= 7) return "text-[13px] sm:text-base md:text-lg";
    return "text-sm sm:text-lg md:text-xl";
  };

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* 1. Slim Inline Horizontal Strip: [ Net | - | + ] */}
      <div className="rounded-xl sm:rounded-2xl bg-[#141414] border border-[#242424] p-2.5 sm:p-3.5 shadow-sm select-none">
        <div className="grid grid-cols-3 divide-x divide-[#242424] items-center text-center">
          {/* Net Position */}
          <div className="min-w-0 px-1 sm:px-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-[9px] sm:text-[10.5px] text-[#A1A1AA] uppercase font-semibold tracking-wider flex items-center justify-center gap-1 whitespace-nowrap">
              <Scale className="w-3 h-3 text-[#71717A] shrink-0 hidden sm:inline-block" />
              <span>Net Balance</span>
            </span>
            <div
              title={netBalanceFormatted}
              className={`${getDynamicAmountSize(netBalanceFormatted)} font-mono-num font-bold tracking-tight truncate max-w-full mt-1 text-[#F5F5F5]`}
            >
              {netBalanceFormatted}
            </div>
          </div>

          {/* - You Owe */}
          <div className="min-w-0 px-1 sm:px-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-[9px] sm:text-[10.5px] text-rose-400/90 uppercase font-semibold tracking-wider flex items-center justify-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>You Owe (-)</span>
            </span>
            <div
              title={userOwesFormatted}
              className={`${getDynamicAmountSize(userOwesFormatted)} font-mono-num font-bold text-rose-400 tracking-tight truncate max-w-full mt-1`}
            >
              {userOwesFormatted}
            </div>
          </div>

          {/* + Owed to Me */}
          <div className="min-w-0 px-1 sm:px-3 flex flex-col items-center justify-center text-center">
            <span className="font-sans text-[9px] sm:text-[10.5px] text-emerald-400/90 uppercase font-semibold tracking-wider flex items-center justify-center gap-1 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>Owed to Me (+)</span>
            </span>
            <div
              title={owedToUserFormatted}
              className={`${getDynamicAmountSize(owedToUserFormatted)} font-mono-num font-bold text-emerald-400 tracking-tight truncate max-w-full mt-1`}
            >
              {owedToUserFormatted}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs: All (4) | Owed to me (2) | I owe (1) + Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* 3 Tabs Segmented Control */}
        <div className="flex items-center p-0.5 bg-[#141414] rounded-xl border border-[#242424] overflow-x-auto scrollbar-none shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-[#242424] text-[#F5F5F5] shadow-sm"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#1A1A1A] text-[#A1A1AA]">
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("owed_to_me")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === "owed_to_me"
                ? "bg-[#242424] text-emerald-400 shadow-sm"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Owed to me</span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#1A1A1A] text-[#A1A1AA]">
              {tabCounts.owed_to_me}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("i_owe")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === "i_owe"
                ? "bg-[#242424] text-rose-400 shadow-sm"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>I owe</span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded-full bg-[#1A1A1A] text-[#A1A1AA]">
              {tabCounts.i_owe}
            </span>
          </button>
        </div>

        {/* Action Button: Track Record */}
        <button
          onClick={() => handleOpenAddModalForPerson()}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Track Record</span>
        </button>
      </div>

      {/* Search Input */}
      {contactLedgers.length > 0 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contacts or notes (e.g. MM, Lunch)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-[#242424] focus:border-emerald-500/50 rounded-xl pl-9 pr-8 py-2 text-xs text-[#F5F5F5] outline-none placeholder:text-[#52525B] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#71717A] hover:text-[#F5F5F5]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3. Minimal Ledger Rows List */}
      {filteredLedgers.length === 0 ? (
        <div className="rounded-2xl bg-[#141414] border border-[#242424] p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
            <Handshake className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F5F5F5]">
              {searchQuery ? "No matching contacts found" : "No records in this tab"}
            </h3>
            <p className="text-xs text-[#71717A] max-w-sm mx-auto">
              {searchQuery
                ? `No contact or note matched "${searchQuery}".`
                : activeTab === "owed_to_me"
                ? "No active debts currently owed to you."
                : activeTab === "i_owe"
                ? "No active debts you currently owe."
                : "Add your first borrow or lend transaction to track."}
            </p>
          </div>
          <button
            onClick={() => handleOpenAddModalForPerson()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Record</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLedgers.map((ledger) => (
            <ContactRow
              key={ledger.person.id}
              person={ledger.person}
              loans={ledger.loans}
              settings={settings}
              onOpenDetails={(person) => setActiveSheetPerson(person)}
              onSettleContact={(person, personLoans) => handleSettleContact(person, personLoans)}
            />
          ))}
        </div>
      )}

      {/* 4. Contact Detail Bottom Sheet */}
      <ContactDetailSheet
        isOpen={!!activeSheetPerson}
        onClose={() => setActiveSheetPerson(null)}
        person={activeSheetPerson}
        loans={activeSheetLoans}
        settings={settings}
        onAddEntry={(personId) => handleOpenAddModalForPerson(personId)}
        onSettleContact={(person, personLoans) => handleSettleContact(person, personLoans)}
        onSettleLoan={(loan) => handleSettleSingleLoan(loan)}
        onViewLoanDetails={(loan) => handleOpenLoanDetails(loan)}
        onDeleteLoan={(loanId) => {
          deleteLoan(loanId);
          showToast("Loan record deleted");
        }}
      />

      {/* 5. Add Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#242424] p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">Track Borrow or Lend Record</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3.5">
              {/* Direction Selector */}
              <div className="flex items-center p-1 bg-[#181818] rounded-xl border border-[#262626]">
                <button
                  type="button"
                  onClick={() => setDirection("lent")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    direction === "lent"
                      ? "bg-[#262626] text-emerald-400 shadow-sm"
                      : "text-[#71717A] hover:text-white"
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>I Lent Money</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("borrowed")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    direction === "borrowed"
                      ? "bg-[#262626] text-rose-400 shadow-sm"
                      : "text-[#71717A] hover:text-white"
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>I Borrowed Money</span>
                </button>
              </div>

              {/* Contact Selection */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Contact Person
                </label>
                {people.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPersonId}
                      onChange={(e) => {
                        setSelectedPersonId(e.target.value);
                        if (e.target.value) setPersonName("");
                      }}
                      className="w-full bg-[#181818] border border-[#262626] rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none"
                    >
                      <option value="">-- Choose existing or enter new below --</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {!selectedPersonId && (
                      <input
                        type="text"
                        placeholder="Or enter new person name"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-[#181818] border border-[#262626] rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none"
                        required={!selectedPersonId}
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Contact's name"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-[#181818] border border-[#262626] rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none"
                    required
                    autoFocus
                  />
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Amount ({settings.currency})
                </label>
                <div className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#71717A] font-mono-num">{settings.currency}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-[#F5F5F5] outline-none font-mono-num"
                    required
                  />
                  {amountStr && (
                    <button
                      type="button"
                      onClick={() => setAmountStr("")}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition cursor-pointer shrink-0 flex items-center gap-1 active:scale-95"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Note / Purpose */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  Note / Reason (What was this for?)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch Share, Emergency cash, Rent split"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] rounded-xl p-2.5 text-xs text-[#F5F5F5] outline-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                    Date
                  </label>
                  <div className="flex items-center justify-between gap-1.5 bg-[#181818] border border-[#262626] rounded-xl px-2 py-1.5 text-xs text-[#F5F5F5] focus-within:border-emerald-500/50 transition">
                    <button
                      type="button"
                      onClick={() => changeStartDateByDays(-1)}
                      className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        if (e.target.value) setStartDate(e.target.value);
                      }}
                      className="bg-transparent text-xs font-semibold text-[#F5F5F5] outline-none w-full cursor-pointer font-mono-num px-1 py-0.5 text-center flex-1 min-w-0"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => changeStartDateByDays(1)}
                      className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                    Due Date (Optional)
                  </label>
                  <div className="flex items-center justify-between gap-1.5 bg-[#181818] border border-[#262626] rounded-xl px-2 py-1.5 text-xs text-[#F5F5F5] focus-within:border-emerald-500/50 transition">
                    <button
                      type="button"
                      onClick={() => changeDueDateByDays(-1)}
                      className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-[#F5F5F5] outline-none w-full cursor-pointer font-mono-num px-1 py-0.5 text-center flex-1 min-w-0"
                    />

                    <button
                      type="button"
                      onClick={() => changeDueDateByDays(1)}
                      className="p-1 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Loan Details Modal */}
      <LoanDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
        person={selectedPerson}
        settings={settings}
        onOpenCustomSettle={(loan) => handleSettleSingleLoan(loan)}
        onDeleteLoan={(id) => {
          deleteLoan(id);
          showToast("Record deleted");
        }}
      />

      {/* 7. Custom Settlement Modal */}
      <CustomSettleModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSettleTargetLoan(null);
          setSettleTargetPerson(null);
          setSettleContactLoans([]);
        }}
        loan={settleTargetLoan}
        person={settleTargetPerson}
        contactLoans={settleContactLoans}
        settings={settings}
      />
    </div>
  );
};
