import React, { useState, useEffect, useRef } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAppStore } from "@/stores/appStore";
import { TransactionType } from "@/types/transaction";
import { parseMoneyInput } from "@/utils/currency";
import { getToday } from "@/utils/dates";
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  MoreHorizontal,
  Calendar as CalendarIcon,
  User,
  AlertTriangle
} from "lucide-react";

interface DateOption {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;  // e.g. 5
  weekday: string; // e.g. thu
  isToday: boolean;
}

const PRESET_AMOUNTS = [
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 500, label: "500" },
  { value: 1000, label: "1,000" },
];

export const AddPaymentModal: React.FC = () => {
  const isAddModalOpen = useUIStore((s) => s.isAddModalOpen);
  const initialType = useUIStore((s) => s.addModalInitialType);
  const prefill = useUIStore((s) => s.addModalPrefill);
  const closeAddModal = useUIStore((s) => s.closeAddModal);
  const showToast = useUIStore((s) => s.showToast);

  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const people = useAppStore((s) => s.people);
  const addPerson = useAppStore((s) => s.addPerson);
  const addLoan = useAppStore((s) => s.addLoan);

  const [type, setType] = useState<TransactionType>("expense");
  const [amountStr, setAmountStr] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(getToday());
  const [description, setDescription] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [showPersonSuggestions, setShowPersonSuggestions] = useState<boolean>(false);
  const [paymentAccount, setPaymentAccount] = useState<string>("upi");
  const [isUnwanted, setIsUnwanted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Compact dropdown states
  const [showCategoryMenu, setShowCategoryMenu] = useState<boolean>(false);
  const [showAccountMenu, setShowAccountMenu] = useState<boolean>(false);

  // Dedicated interactive calendar modal state
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

  const dateListRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const transferToRef = useRef<HTMLDivElement>(null);

  // Normalize payment method to one of the 5 requested types
  const normalizePaymentAccount = (acc?: string): string => {
    if (!acc) return "upi";
    const lower = acc.toLowerCase();
    if (lower === "upi") return "upi";
    if (lower === "cash") return "cash";
    if (lower.includes("card") || lower === "credit_card" || lower === "debit_card") return "card";
    if (lower.includes("bank") || lower === "netbanking" || lower === "icici" || lower === "hdfc") return "netbanking";
    if (lower === "other") return "other";
    return "upi";
  };

  // Generate recent 14 days ending today
  const generateDateOptions = (): DateOption[] => {
    const dates: DateOption[] = [];
    const today = new Date();
    
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const dayNum = d.getDate();
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      dates.push({
        dateStr,
        dayNum,
        weekday,
        isToday: i === 0,
      });
    }
    return dates;
  };

  const [dateOptions] = useState<DateOption[]>(generateDateOptions);

  // Sync state when opening modal
  useEffect(() => {
    if (isAddModalOpen) {
      const targetType = (prefill ? (prefill.tag === "transfer" ? "transfer" : prefill.type) : initialType) || "expense";
      const transferCat = categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer");

      if (prefill) {
        setType(targetType);
        setAmountStr(prefill.amount ? (prefill.amount / 100).toString() : "");
        if (targetType === "transfer") {
          setSelectedCategoryId(transferCat?.id || "cat-transfer");
        } else {
          setSelectedCategoryId(prefill.categoryId || "");
        }
        setDate(prefill.date || getToday());
        const toMatch = prefill.note?.match(/\(To:\s*(.*?)\)/);
        if (toMatch && toMatch[1]) {
          setTransferTo(toMatch[1].trim());
          setDescription(prefill.note?.replace(/\(To:\s*.*?\)/, "").trim() || "");
        } else {
          setDescription(prefill.note || "");
          setTransferTo("");
        }
        setPaymentAccount(normalizePaymentAccount(prefill.paymentMethod || settings.defaultPaymentMethod));
        setIsUnwanted(Boolean(prefill.isUnwanted));
      } else {
        setType(targetType);
        setAmountStr("");
        setDate(getToday());
        setDescription("");
        setTransferTo("");
        setPaymentAccount(normalizePaymentAccount(settings.defaultPaymentMethod));
        setIsUnwanted(false);

        if (targetType === "transfer") {
          setSelectedCategoryId(transferCat?.id || "cat-transfer");
        } else {
          const filtered = categories.filter((c) => (c.type === targetType || c.type === "both") && c.name.toLowerCase() !== "transfer");
          setSelectedCategoryId(filtered[0]?.id || "");
        }
      }
      setError("");
      setShowCategoryMenu(false);
      setShowAccountMenu(false);
      setShowPersonSuggestions(false);
      setShowCalendarModal(false);

      // Initialize calendar view date
      const parts = (prefill?.date || getToday()).split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      } else {
        const now = new Date();
        setCalendarYear(now.getFullYear());
        setCalendarMonth(now.getMonth());
      }

      // Auto-scroll date list to selected date
      setTimeout(() => {
        const activeDateEl = dateListRef.current?.querySelector("[data-selected='true']");
        if (activeDateEl) {
          activeDateEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }, 100);

      // Focus amount input smoothly on desktop without forcing window-level jump
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        setTimeout(() => {
          amountInputRef.current?.focus({ preventScroll: true });
          amountInputRef.current?.select();
        }, 150);
      }
    }
  }, [isAddModalOpen, initialType, prefill, categories, settings.defaultPaymentMethod]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isAddModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isAddModalOpen]);

  // Close menus on outside click or Escape
  useEffect(() => {
    if (!isAddModalOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setShowCategoryMenu(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setShowAccountMenu(false);
      }
      if (transferToRef.current && !transferToRef.current.contains(target)) {
        setShowPersonSuggestions(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCalendarModal) {
          setShowCalendarModal(false);
        } else if (showCategoryMenu) {
          setShowCategoryMenu(false);
        } else if (showAccountMenu) {
          setShowAccountMenu(false);
        } else {
          closeAddModal();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAddModalOpen, showCategoryMenu, showAccountMenu, showCalendarModal, closeAddModal]);

  if (!isAddModalOpen) return null;

  // Selected Category Object
  const defaultTransferCat = categories.find((c) => c.id === "cat-transfer" || c.name.toLowerCase() === "transfer") || {
    id: "cat-transfer",
    name: "Transfer",
    icon: "🔄",
    color: "#0EA5E9",
    type: "both" as const,
    isDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const selectedCategory = type === "transfer"
    ? (categories.find((c) => c.id === selectedCategoryId) || defaultTransferCat)
    : (categories.find((c) => c.id === selectedCategoryId) || categories[0] || {
        id: "default",
        name: "Food & Dining",
        icon: "🍔",
      });

  // Payment method accounts: strictly the 5 requested options with no extraneous text
  const paymentAccounts = [
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Credit/Debit Card", icon: CreditCard },
    { id: "netbanking", label: "Net Banking", icon: Building },
    { id: "other", label: "Other", icon: MoreHorizontal },
  ];

  const currentAccountObj = paymentAccounts.find((a) => a.id === paymentAccount) || paymentAccounts[0];

  // Theme accent colors based on selected tab
  const getThemeColor = () => {
    switch (type) {
      case "expense":
        return {
          pillBorder: "border-[#FF4D4D]",
          pillText: "text-[#FF4D4D]",
          pillBg: "bg-[#2A1414]",
          amountText: "text-[#FF4D4D]",
          dateSelectedBorder: "border-[#FF4D4D]",
          dateSelectedText: "text-[#FF4D4D]",
          dateSelectedBg: "bg-[#2A1414]/60",
          submitBtn: "bg-[#FF4D4D] hover:bg-[#FF3838] active:scale-[0.99] text-white shadow-rose-950/40",
        };
      case "income":
        return {
          pillBorder: "border-emerald-500",
          pillText: "text-emerald-400",
          pillBg: "bg-emerald-950/30",
          amountText: "text-emerald-400",
          dateSelectedBorder: "border-emerald-500",
          dateSelectedText: "text-emerald-400",
          dateSelectedBg: "bg-emerald-950/40",
          submitBtn: "bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black shadow-emerald-950/40",
        };
      case "transfer":
        return {
          pillBorder: "border-sky-500",
          pillText: "text-sky-400",
          pillBg: "bg-sky-950/30",
          amountText: "text-sky-400",
          dateSelectedBorder: "border-sky-500",
          dateSelectedText: "text-sky-400",
          dateSelectedBg: "bg-sky-950/40",
          submitBtn: "bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-white shadow-sky-950/40",
        };
    }
  };

  const theme = getThemeColor();

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minorUnits = parseMoneyInput(amountStr);

    if (minorUnits <= 0) {
      setError("Please enter a valid amount");
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedCategoryId && categories.length > 0) {
      setError("Please pick a category");
      return;
    }

    if (type === "transfer") {
      const recipientName = transferTo.trim();
      if (!recipientName) {
        setError("Please enter who you are transferring to");
        return;
      }

      // Find or create person contact
      let targetPerson = people.find(
        (p) => p.name.toLowerCase() === recipientName.toLowerCase()
      );
      if (!targetPerson) {
        targetPerson = addPerson(recipientName);
      }

      // Automatically create a 'lent' loan record for Borrow & Lend ledger
      addLoan({
        personId: targetPerson.id,
        direction: "lent",
        amount: minorUnits,
        description: description.trim() || `Transfer to ${targetPerson.name}`,
        date,
      });

      // Record transfer transaction
      const noteText = description.trim()
        ? `${description.trim()} (To: ${targetPerson.name})`
        : `Transfer to ${targetPerson.name}`;

      const transferCatId = defaultTransferCat.id;

      if (prefill && prefill.id) {
        updateTransaction(prefill.id, {
          type: "transfer",
          tag: "transfer",
          amount: minorUnits,
          categoryId: transferCatId,
          date,
          note: noteText,
          paymentMethod: paymentAccount,
        });
        showToast(`Transfer updated & logged as lent to ${targetPerson.name}`);
      } else {
        addTransaction({
          type: "transfer",
          tag: "transfer",
          amount: minorUnits,
          categoryId: transferCatId,
          date,
          note: noteText,
          paymentMethod: paymentAccount,
        });
        showToast(`Transfer to ${targetPerson.name} recorded & added to Lent`);
      }
    } else {
      if (prefill && prefill.id) {
        updateTransaction(prefill.id, {
          type,
          tag: undefined,
          amount: minorUnits,
          categoryId: selectedCategoryId || categories[0]?.id || "general",
          date,
          note: description.trim() || undefined,
          paymentMethod: paymentAccount,
          isUnwanted: type === "expense" ? isUnwanted : false,
        });
        showToast("Transaction updated");
      } else {
        addTransaction({
          type,
          tag: undefined,
          amount: minorUnits,
          categoryId: selectedCategoryId || categories[0]?.id || "general",
          date,
          note: description.trim() || undefined,
          paymentMethod: paymentAccount,
          isUnwanted: type === "expense" ? isUnwanted : false,
        });
        showToast(type === "expense" ? "Expense added" : "Income added");
      }
    }

    if (settings.hapticFeedback !== false && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(25);
    }

    closeAddModal();
  };

  const filteredCategories = categories.filter((c) => {
    if (type === "transfer") {
      return c.id === "cat-transfer" || c.name.toLowerCase() === "transfer";
    }
    return (c.type === type || c.type === "both") && c.name.toLowerCase() !== "transfer";
  });

  // Calendar Picker Helpers
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const today = new Date();
    // Do not navigate past current month if future dates are not allowed
    if (calendarYear === today.getFullYear() && calendarMonth >= today.getMonth()) {
      return;
    }
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const openCalendarModal = () => {
    const parts = (date || getToday()).split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      setCalendarYear(parts[0]);
      setCalendarMonth(parts[1] - 1);
    }
    setShowCalendarModal(true);
  };

  // Calendar Day Generation
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sun

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAddModal();
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-[#141414] border border-[#242424] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] my-auto animate-in fade-in"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-[#242424]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-[#FF4D4D]' : type === 'income' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
            <h3 className="text-sm font-bold text-[#F5F5F5]">
              {prefill?.id ? "Edit Payment Record" : "Add Payment Record"}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeAddModal}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Transaction Type Pill Tabs (Expense, Income, Transfer) */}
        <div className="flex items-center justify-center gap-2.5 px-4 pt-3 pb-2.5">
          {(["expense", "income", "transfer"] as TransactionType[]).map((tabType) => {
            const isSelected = type === tabType;
            const label = tabType.charAt(0).toUpperCase() + tabType.slice(1);

            return (
              <button
                key={tabType}
                type="button"
                onClick={() => {
                  setType(tabType);
                  setShowCategoryMenu(false);
                  if (tabType === "transfer") {
                    setSelectedCategoryId(defaultTransferCat.id);
                  } else {
                    const validCats = categories.filter(
                      (c) => (c.type === tabType || c.type === "both") && c.name.toLowerCase() !== "transfer"
                    );
                    if (
                      validCats.length > 0 &&
                      (!validCats.some((c) => c.id === selectedCategoryId) || selectedCategoryId === defaultTransferCat.id)
                    ) {
                      setSelectedCategoryId(validCats[0].id);
                    }
                  }
                }}
                className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer border text-center ${
                  isSelected
                    ? `${theme.pillBorder} ${theme.pillText} ${theme.pillBg} shadow-sm`
                    : "bg-[#181818] border-[#262626] text-[#71717A] hover:text-[#D4D4D8]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 space-y-3.5">
          {/* 2. Horizontal Date Selector with 100% Reliable Interactive Calendar Trigger */}
          <div className="flex items-center gap-2 pt-1">
            {/* Interactive Calendar button */}
            <button
              type="button"
              onClick={openCalendarModal}
              className={`shrink-0 flex flex-col items-center justify-center w-12 h-[52px] rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                !dateOptions.some((d) => d.dateStr === date)
                  ? `${theme.dateSelectedBorder} ${theme.dateSelectedBg} ${theme.dateSelectedText} shadow-sm`
                  : "bg-[#181818] border-[#262626] text-[#A1A1AA] hover:text-white hover:bg-[#202020]"
              }`}
              title="Open calendar to pick any date"
              aria-label="Open calendar"
            >
              <CalendarIcon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] uppercase font-semibold">Cal</span>
            </button>

            {/* Scrollable horizontal date cards */}
            <div 
              ref={dateListRef}
              className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
            >
              {/* If custom date chosen from calendar is not in the recent list, display it first */}
              {!dateOptions.some((d) => d.dateStr === date) && (
                <button
                  type="button"
                  data-selected="true"
                  onClick={() => setDate(date)}
                  className={`shrink-0 flex flex-col items-center justify-center min-w-[50px] py-1.5 px-2 rounded-2xl transition-all cursor-pointer border ${theme.dateSelectedBorder} ${theme.dateSelectedBg} shadow-sm`}
                >
                  <span className={`text-base font-bold leading-tight ${theme.dateSelectedText}`}>
                    {new Date(date + "T00:00:00").getDate()}
                  </span>
                  <span className={`text-[10px] uppercase font-semibold tracking-wider mt-0.5 ${theme.dateSelectedText}`}>
                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }).toLowerCase()}
                  </span>
                </button>
              )}

              {dateOptions.map((item) => {
                const isSelected = date === item.dateStr;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => setDate(item.dateStr)}
                    className={`shrink-0 flex flex-col items-center justify-center min-w-[50px] py-1.5 px-2 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? `${theme.dateSelectedBorder} ${theme.dateSelectedBg} shadow-sm`
                        : "border-transparent hover:bg-[#181818]"
                    }`}
                  >
                    <span className={`text-base font-bold leading-tight ${isSelected ? theme.dateSelectedText : "text-[#E4E4E7]"}`}>
                      {item.dayNum}
                    </span>
                    <span className={`text-[10px] uppercase font-semibold tracking-wider mt-0.5 ${isSelected ? theme.dateSelectedText : "text-[#71717A]"}`}>
                      {item.weekday}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Large Amount Display & Quick Amount Preset Chips */}
          <div className="py-2 text-center flex flex-col items-center justify-center">
            {/* Center Rupee symbol and amount together with 4-8px gap (gap-1.5 = 6px, gap-2 = 8px) */}
            <div className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 text-5xl sm:text-6xl font-light tracking-tight font-mono-num ${theme.amountText}`}>
              <span className="text-4xl sm:text-5xl font-normal opacity-90 select-none shrink-0 leading-none">
                {settings.currency || "₹"}
              </span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (error) setError("");
                }}
                style={{
                  width: `${Math.max(1, amountStr.length || 1)}ch`,
                  minWidth: "1ch",
                  maxWidth: "280px",
                }}
                className={`bg-transparent text-left font-light tracking-tight font-mono-num outline-none ${theme.amountText} placeholder-neutral-700 p-0 m-0 leading-none`}
                autoComplete="off"
                aria-label="Amount"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium mt-1 animate-in fade-in">
                {error}
              </p>
            )}

            {/* Quick Amount Preset Chips (₹50, ₹100, ₹200, ₹500, ₹1,000) */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-3 pb-1 overflow-x-auto no-scrollbar max-w-full px-1">
              {PRESET_AMOUNTS.map((preset) => {
                const currentNum = parseFloat(amountStr.replace(/,/g, "")) || 0;
                const isSelected = currentNum === preset.value;

                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setAmountStr(preset.value.toString());
                      if (error) setError("");
                      amountInputRef.current?.focus();
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono-num transition cursor-pointer border select-none active:scale-95 ${
                      isSelected
                        ? `${theme.pillBorder} ${theme.pillBg} ${theme.pillText} shadow-sm font-bold scale-105`
                        : "bg-[#181818] border-[#282828] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#222222]"
                    }`}
                  >
                    {settings.currency || "₹"}{preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Category & Payment Method Dropdown Selectors (Max 4 rows with scroll) */}
          <div className="space-y-3">
            {/* Category Dropdown (Max 4 rows, scroll for additional) */}
            <div ref={categoryMenuRef} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                  Category
                </label>
                {type === "transfer" && (
                  <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    Set to Transfer
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (type === "transfer") return;
                  setShowCategoryMenu(!showCategoryMenu);
                  setShowAccountMenu(false);
                }}
                disabled={type === "transfer"}
                aria-disabled={type === "transfer"}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition text-left ${
                  type === "transfer"
                    ? "bg-[#181818] border-sky-500/30 cursor-default select-none"
                    : "bg-[#181818] border-[#262626] hover:border-neutral-700 active:scale-[0.99] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-lg">{selectedCategory.icon || "🔄"}</span>
                  <span className="text-sm font-semibold text-[#F5F5F5] truncate">{selectedCategory.name}</span>
                  {type === "transfer" && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-full">
                      Transfer
                    </span>
                  )}
                </div>
                {type === "transfer" ? (
                  <Check className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <ChevronDown className={`w-4 h-4 text-[#71717A] transition-transform duration-200 ${showCategoryMenu ? "rotate-180 text-white" : ""}`} />
                )}
              </button>

              {/* In-Flow Category List: Displays maximum 4 rows with vertical scroll */}
              {showCategoryMenu && type !== "transfer" && (
                <div className="mt-1.5 max-h-[172px] overflow-y-auto overscroll-contain bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-1.5 space-y-1 animate-in fade-in duration-150">
                  {filteredCategories.map((cat) => {
                    const isSel = selectedCategoryId === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setShowCategoryMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                          isSel
                            ? "bg-[#282828] text-white font-semibold ring-1 ring-emerald-500/40"
                            : "text-[#D4D4D8] hover:bg-[#222222] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-base shrink-0">{cat.icon}</span>
                          <span className="text-sm font-medium text-[#F5F5F5] truncate">{cat.name}</span>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Dropdown (Max 4 rows, scroll for additional, no extraneous text) */}
            <div ref={accountMenuRef} className="space-y-1">
              <label className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block px-1">
                Payment Method
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowAccountMenu(!showAccountMenu);
                  setShowCategoryMenu(false);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#262626] hover:border-neutral-700 active:scale-[0.99] transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <currentAccountObj.icon className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                  <span className="text-sm font-semibold text-[#F5F5F5] truncate">{currentAccountObj.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#71717A] transition-transform duration-200 ${showAccountMenu ? "rotate-180 text-white" : ""}`} />
              </button>

              {/* In-Flow Payment Method List: Displays maximum 4 rows with vertical scroll */}
              {showAccountMenu && (
                <div className="mt-1.5 max-h-[172px] overflow-y-auto overscroll-contain bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-1.5 space-y-1 animate-in fade-in duration-150">
                  {paymentAccounts.map((acc) => {
                    const Icon = acc.icon;
                    const isSel = paymentAccount === acc.id;

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setPaymentAccount(acc.id);
                          setShowAccountMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isSel
                            ? "bg-[#282828] text-white font-semibold ring-1 ring-emerald-500/40"
                            : "text-[#D4D4D8] hover:bg-[#222222] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                          <span className="font-semibold text-sm text-[#F5F5F5] truncate">{acc.label}</span>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transfer to Input Field (Only for Transfer tab) */}
          {type === "transfer" && (
            <div ref={transferToRef} className="space-y-1 relative">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                  Transfer to <span className="text-sky-400 font-normal lowercase">(auto-logged as lent)</span>
                </label>
                <span className="text-[10px] text-rose-400 font-semibold">*required</span>
              </div>
              <div className="bg-[#181818] border border-[#242424] focus-within:border-sky-500 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition">
                <User className="w-4 h-4 text-sky-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Recipient name (e.g., Alex, Rahul)..."
                  value={transferTo}
                  onChange={(e) => {
                    setTransferTo(e.target.value);
                    if (error) setError("");
                    setShowPersonSuggestions(true);
                  }}
                  onFocus={() => setShowPersonSuggestions(true)}
                  className="w-full bg-transparent text-sm text-[#F5F5F5] outline-none placeholder-[#71717A]"
                  maxLength={50}
                  autoComplete="off"
                />
                {transferTo && (
                  <button
                    type="button"
                    onClick={() => {
                      setTransferTo("");
                      setShowPersonSuggestions(false);
                    }}
                    className="text-[#71717A] hover:text-[#F5F5F5] p-1 cursor-pointer"
                    aria-label="Clear recipient name"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown from existing contacts */}
              {showPersonSuggestions && people.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-[170px] overflow-y-auto overscroll-contain bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-1.5 shadow-2xl space-y-1 animate-in fade-in duration-150">
                  <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Existing Contacts
                  </div>
                  {people
                    .filter(
                      (p) => !transferTo.trim() || p.name.toLowerCase().includes(transferTo.trim().toLowerCase())
                    )
                    .slice(0, 8)
                    .map((p) => {
                      const isMatch = transferTo.trim().toLowerCase() === p.name.toLowerCase();
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setTransferTo(p.name);
                            setShowPersonSuggestions(false);
                            if (error) setError("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                            isMatch
                              ? "bg-[#282828] text-white font-semibold ring-1 ring-sky-500/40"
                              : "text-[#D4D4D8] hover:bg-[#222222] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-6 h-6 rounded-full bg-sky-950/70 text-sky-400 border border-sky-800/50 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[#F5F5F5] truncate">{p.name}</span>
                          </div>
                          {isMatch && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  {people.filter(
                    (p) => !transferTo.trim() || p.name.toLowerCase().includes(transferTo.trim().toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-xs text-neutral-400">
                      Press enter or save to add &quot;{transferTo.trim()}&quot; as a new contact
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Description / Merchant Input Field */}
          <div>
            <label className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1 px-1">
              Description (Optional)
            </label>
            <div className="bg-[#181818] border border-[#242424] rounded-xl px-4 py-2.5 flex items-center gap-2 focus-within:border-neutral-600 transition">
              <input
                type="text"
                placeholder="Zomato, Groceries, Uber, Note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent text-sm text-[#F5F5F5] outline-none placeholder-[#71717A]"
                maxLength={80}
              />
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription("")}
                  className="text-[#71717A] hover:text-[#F5F5F5] p-1 cursor-pointer"
                  aria-label="Clear description"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 5b. Unwanted / Impulse Spend Flag (Expenses Only) */}
          {type === "expense" && (
            <button
              type="button"
              onClick={() => setIsUnwanted(!isUnwanted)}
              className={`w-full p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer select-none ${
                isUnwanted
                  ? "bg-amber-500/10 border-amber-500/35 text-amber-300 shadow-sm"
                  : "bg-[#181818] border-[#242424] text-[#A1A1AA] hover:border-[#333333]"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${isUnwanted ? "text-amber-400" : "text-[#71717A]"}`} />
                <span className="text-xs font-semibold">Flag as Unwanted / Impulse Spend</span>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                  isUnwanted
                    ? "bg-amber-500 text-black border-amber-400"
                    : "bg-[#121212] border-[#333333] text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          )}

          {/* 6. Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${theme.submitBtn}`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{prefill?.id ? "Update Transaction" : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}</span>
            </button>
          </div>
        </form>

        {/* 7. Interactive Calendar Popup Overlay (100% Reliable in all browsers and iframes) */}
        {showCalendarModal && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 shadow-2xl flex flex-col space-y-3">
              {/* Calendar Month Navigation Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#252525] active:scale-90 transition cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-sm font-bold text-[#F5F5F5] tracking-wide">
                  {monthNames[calendarMonth]} {calendarYear}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={calendarYear === new Date().getFullYear() && calendarMonth >= new Date().getMonth()}
                    className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#252525] active:scale-90 transition disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCalendarModal(false)}
                    className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-neutral-800 transition cursor-pointer ml-1"
                    aria-label="Close calendar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of week abbreviations */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                  <div key={dayName} className="text-[10px] font-bold text-[#71717A] py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty slots for first day offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isFuture = dateStr > getToday();
                  const isSelected = dateStr === date;
                  const isToday = dateStr === getToday();

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isFuture}
                      onClick={() => {
                        setDate(dateStr);
                        setShowCalendarModal(false);
                      }}
                      className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? `${theme.pillBg} ${theme.pillBorder} ${theme.pillText} border shadow-sm font-bold scale-105`
                          : isToday
                          ? "bg-neutral-800 text-white font-bold ring-1 ring-neutral-500"
                          : isFuture
                          ? "text-neutral-600 opacity-30 cursor-not-allowed"
                          : "text-[#D4D4D8] hover:bg-[#242424] hover:text-white"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump: Today & Yesterday */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    setDate(getToday());
                    setShowCalendarModal(false);
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#D4D4D8] hover:text-white transition cursor-pointer text-center"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
                    setDate(yStr);
                    setShowCalendarModal(false);
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#D4D4D8] hover:text-white transition cursor-pointer text-center"
                >
                  Yesterday
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
