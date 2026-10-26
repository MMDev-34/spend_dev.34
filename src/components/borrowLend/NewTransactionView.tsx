import React, { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { Settings } from "@/types/settings";
import { LoanDirection } from "@/types/loan";
import { parseMoneyInput } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { getAvatarColors, getInitials } from "@/utils/avatarUtils";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Check, 
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Building,
  ChevronRight,
  User,
  Plus
} from "lucide-react";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank", label: "Bank", icon: Building },
];

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

interface NewTransactionViewProps {
  preselectedPersonId?: string;
  initialDirection?: LoanDirection;
  settings: Settings;
  onBack: () => void;
  onSuccess: (personId: string) => void;
}

export const NewTransactionView: React.FC<NewTransactionViewProps> = ({
  preselectedPersonId,
  initialDirection = "lent",
  settings,
  onBack,
  onSuccess,
}) => {
  const people = useAppStore((s) => s.people);
  const categories = useAppStore((s) => s.categories);
  const addPerson = useAppStore((s) => s.addPerson);
  const addLoan = useAppStore((s) => s.addLoan);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useUIStore((s) => s.showToast);

  const [direction, setDirection] = useState<LoanDirection>(initialDirection);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(preselectedPersonId || "");
  const [personName, setPersonName] = useState<string>(
    people.find((p) => p.id === preselectedPersonId)?.name || ""
  );
  const [isChangingPerson, setIsChangingPerson] = useState<boolean>(!preselectedPersonId);
  const [amountStr, setAmountStr] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [description, setDescription] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(getToday());
  const [dueDate, setDueDate] = useState<string>("");

  const selectedPerson = people.find((p) => p.id === selectedPersonId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (amount <= 0) {
      showToast("Please enter a valid transaction amount", "error");
      return;
    }

    let targetPersonId = selectedPersonId;

    if (!targetPersonId) {
      const trimmed = personName.trim();
      if (!trimmed) {
        showToast("Please select or enter a contact person", "error");
        return;
      }
      const existing = people.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        targetPersonId = existing.id;
      } else {
        const newPerson = addPerson(trimmed);
        targetPersonId = newPerson.id;
      }
    }

    const newLoan = addLoan({
      personId: targetPersonId,
      direction,
      amount,
      description: description.trim() || undefined,
      date: startDate || getToday(),
      dueDate: dueDate || undefined,
      paymentMethod: paymentMethod.toUpperCase(),
    });

    const targetPerson = people.find((p) => p.id === targetPersonId);
    const targetName = targetPerson?.name || personName;

    // When lending money, also auto-record an expense transaction tagged as 'transfer'
    const transferCat = categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer");
    const transferCatId = transferCat?.id || "cat-transfer";

    if (direction === "lent") {
      addTransaction({
        id: `tx-loan-${newLoan.id}`,
        type: "transfer",
        tag: "transfer",
        amount,
        categoryId: transferCatId,
        date: startDate || getToday(),
        note: description.trim()
          ? `${description.trim()} (Lent to: ${targetName})`
          : `Lent to ${targetName}`,
        paymentMethod: paymentMethod || settings.defaultPaymentMethod || "upi",
      });
      showToast(`Added lent record & logged transfer for ${targetName}`);
    } else {
      addTransaction({
        id: `tx-loan-${newLoan.id}`,
        type: "transfer",
        tag: "transfer",
        amount,
        categoryId: transferCatId,
        date: startDate || getToday(),
        note: description.trim()
          ? `${description.trim()} (Borrowed from: ${targetName})`
          : `Borrowed from ${targetName}`,
        paymentMethod: paymentMethod || settings.defaultPaymentMethod || "upi",
      });
      showToast(`Added borrowed record & logged transfer for ${targetName}`);
    }

    onSuccess(targetPersonId);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 max-w-xl mx-auto pb-14">
      {/* 1. Header with Back Button (Screen 5) */}
      <div className="flex items-center gap-3 pb-2 border-b border-[#1F2937]">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#121820] hover:bg-[#1E293B] border border-[#1F2937] flex items-center justify-center text-[#F5F5F5] transition cursor-pointer active:scale-95 shrink-0"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F5] truncate tracking-tight">
            New Transaction
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Add a new loan or borrowing record
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction Toggle: Red Lent vs Green Borrowed (Screen 5) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setDirection("lent")}
            className={`py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              direction === "lent"
                ? "bg-[#2B1418] text-rose-400 border-rose-500/50 shadow-sm"
                : "bg-[#0F1720] text-[#8E8E93] hover:text-white border-[#1E293B]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>Lent</span>
          </button>

          <button
            type="button"
            onClick={() => setDirection("borrowed")}
            className={`py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
              direction === "borrowed"
                ? "bg-[#0D281E] text-emerald-400 border-emerald-500/50 shadow-sm"
                : "bg-[#0F1720] text-[#8E8E93] hover:text-white border-[#1E293B]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Borrowed</span>
          </button>
        </div>

        {/* Select Person (Screen 5) */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Select Person
          </label>

          {selectedPerson && !isChangingPerson ? (
            <div
              onClick={() => setIsChangingPerson(true)}
              className="rounded-2xl bg-[#0F1720] border border-[#1E293B] hover:border-[#2A374A] p-3.5 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    getAvatarColors(selectedPerson.name).bg
                  } ${getAvatarColors(selectedPerson.name).text}`}
                >
                  {getInitials(selectedPerson.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#F5F5F5] truncate">
                    {selectedPerson.name}
                  </div>
                  <div className="text-[11px] text-[#8E8E93]">Tap to change contact</div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-[#71717A]" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-[#0F1720] border border-[#1E293B] focus-within:border-emerald-500 rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
                <User className="w-4 h-4 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Enter or search person name..."
                  value={personName}
                  onChange={(e) => {
                    setPersonName(e.target.value);
                    const match = people.find((p) => p.name.toLowerCase() === e.target.value.toLowerCase().trim());
                    setSelectedPersonId(match?.id || "");
                  }}
                  className="w-full bg-transparent text-sm text-[#F5F5F5] outline-none placeholder-[#71717A]"
                  required
                  autoFocus
                />
                {personName && (
                  <button
                    type="button"
                    onClick={() => {
                      setPersonName("");
                      setSelectedPersonId("");
                    }}
                    className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Contacts Chips */}
              {people.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold shrink-0">Recent:</span>
                  {people.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        setPersonName(p.name);
                        setIsChangingPerson(false);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer shrink-0 border ${
                        selectedPersonId === p.id
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold"
                          : "bg-[#0F1720] hover:bg-[#1A2332] text-[#A1A1AA] border-[#1E293B]"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount Input (Screen 5) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
            Amount
          </label>
          <div className="bg-[#0F1720] border border-[#1E293B] focus-within:border-emerald-500 rounded-2xl px-4 py-3 flex items-center gap-2.5 transition">
            <span className="text-2xl font-extrabold text-[#71717A] font-mono-num">{settings.currency}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full bg-transparent text-2xl font-extrabold text-[#F5F5F5] outline-none font-mono-num"
              required
            />
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr("")}
                className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Preset Chips: ₹1,000, ₹2,000, ₹5,000, ₹10,000 (Screen 5) */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmountStr(val.toString())}
                className={`py-2 px-1.5 rounded-xl text-xs font-semibold font-mono-num transition cursor-pointer border text-center ${
                  amountStr === val.toString()
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                    : "bg-[#0F1720] hover:bg-[#15202E] text-[#A1A1AA] hover:text-white border-[#1E293B]"
                }`}
              >
                {settings.currency}{val.toLocaleString("en-US")}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date (Optional) (Screen 5) */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Due Date (optional)
          </label>
          <div className="flex items-center gap-2.5 bg-[#0F1720] border border-[#1E293B] rounded-xl px-3.5 py-3 text-xs sm:text-sm text-[#F5F5F5] transition">
            <Calendar className="w-4 h-4 text-[#71717A] shrink-0" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-semibold text-[#F5F5F5] outline-none cursor-pointer font-mono-num flex-1"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="p-0.5 text-[#71717A] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Payment Method: 4 Tiles (UPI, Cash, Card, Bank) (Screen 5) */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`py-3 px-2 rounded-xl border text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center ${
                    isSelected
                      ? "bg-[#15231F] text-emerald-400 border-emerald-500/60 font-bold shadow-sm"
                      : "bg-[#0F1720] text-[#8E8E93] hover:text-white border-[#1E293B]"
                  }`}
                >
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <span className="truncate max-w-full text-[11px]">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes (Optional) (Screen 5) */}
        <div>
          <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
            Notes (optional)
          </label>
          <input
            type="text"
            placeholder="Add a note..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#0F1720] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-4 py-3 text-xs sm:text-sm text-[#F5F5F5] outline-none placeholder-[#71717A]"
          />
        </div>

        {/* Save Record Button (Screen 5) */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-bold text-sm transition shadow-lg shadow-emerald-950/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Record</span>
          </button>
        </div>
      </form>
    </div>
  );
};
