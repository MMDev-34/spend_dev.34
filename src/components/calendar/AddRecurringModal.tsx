import React, { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { parseMoneyInput } from "@/utils/currency";
import { RecurringFrequency, RecurringExpense } from "@/types/plan";
import { DateSelector } from "@/components/common/DateSelector";
import { X, CalendarClock, Bell, Repeat } from "lucide-react";

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  editExpense?: RecurringExpense | null;
  initialDay?: number;
}

export const AddRecurringModal: React.FC<AddRecurringModalProps> = ({
  isOpen,
  onClose,
  editExpense,
  initialDay,
}) => {
  const addRecurringExpense = useAppStore((s) => s.addRecurringExpense);
  const updateRecurringExpense = useAppStore((s) => s.updateRecurringExpense);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dueDay, setDueDay] = useState<number>(initialDay || 1);
  const [dueMonth, setDueMonth] = useState<number>(1);
  const [dueWeekday, setDueWeekday] = useState<number>(1);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "cat-bills");
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);
  const [autoRemind, setAutoRemind] = useState(true);
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  useEffect(() => {
    if (editExpense) {
      setTitle(editExpense.title);
      setAmountStr((editExpense.amount / 100).toString());
      setDueDay(editExpense.dueDay);
      setDueMonth(editExpense.dueMonth ?? 1);
      setDueWeekday(editExpense.dueWeekday ?? 1);
      setFrequency(editExpense.frequency);
      setCategoryId(editExpense.categoryId);
      setReminderDaysBefore(editExpense.reminderDaysBefore ?? 1);
      setAutoRemind(editExpense.autoRemind ?? true);
      setNotes(editExpense.notes || "");
      setStartDate(editExpense.startDate || "");
      setEndDate(editExpense.endDate || "");
    } else {
      setTitle("");
      setAmountStr("");
      setDueDay(initialDay || 1);
      setDueMonth(1);
      setDueWeekday(1);
      setFrequency("monthly");
      setCategoryId(categories.find((c) => c.id === "cat-bills")?.id || categories[0]?.id || "cat-bills");
      setReminderDaysBefore(1);
      setAutoRemind(true);
      setNotes("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
    }
  }, [editExpense, initialDay, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (!title.trim()) {
      showToast("Please enter a bill / subscription name", "error");
      return;
    }

    if (amount <= 0) {
      showToast("Please enter an amount greater than 0", "error");
      return;
    }

    if (editExpense) {
      updateRecurringExpense(editExpense.id, {
        title: title.trim(),
        amount,
        frequency,
        dueDay,
        dueMonth: frequency === "yearly" ? dueMonth : undefined,
        dueWeekday: frequency === "weekly" || frequency === "biweekly" ? dueWeekday : undefined,
        categoryId,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        reminderDaysBefore,
        autoRemind,
        notes: notes.trim() || undefined,
      });
      showToast("Recurring bill updated!");
    } else {
      addRecurringExpense({
        title: title.trim(),
        amount,
        frequency,
        dueDay,
        dueMonth: frequency === "yearly" ? dueMonth : undefined,
        dueWeekday: frequency === "weekly" || frequency === "biweekly" ? dueWeekday : undefined,
        categoryId,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        reminderDaysBefore,
        autoRemind,
        notes: notes.trim() || undefined,
        isPaused: false,
      });
      showToast("Recurring bill tracked! Added to financial calendar.");
    }

    onClose();
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdayList = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {editExpense ? "Edit Recurring Bill" : "Track Recurring Bill & Payment"}
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Subscriptions, rent, EMIs, utilities & regular payouts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">
              Bill / Subscription Name
            </label>
            <input
              type="text"
              placeholder="e.g. WiFi Fiber, House Rent, Gym, Netflix, Insurance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Amount</label>
            <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 focus-within:border-purple-500 transition">
              <span className="text-sm font-bold text-[#71717A] font-mono-num">{settings.currency}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="1,200"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-[#F5F5F5] outline-none font-mono-num"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition capitalize"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly (Every 2 wks)</option>
                <option value="yearly">Yearly (Annual)</option>
              </select>
            </div>

            {frequency === "monthly" && (
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Due Day of Month</label>
                <select
                  value={dueDay}
                  onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                  className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day} of each month
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(frequency === "weekly" || frequency === "biweekly") && (
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Due Day of Week</label>
                <select
                  value={dueWeekday}
                  onChange={(e) => setDueWeekday(parseInt(e.target.value, 10))}
                  className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
                >
                  {weekdayList.map((w) => (
                    <option key={w.value} value={w.value}>
                      Every {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {frequency === "yearly" && (
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Annual Due Date</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={dueMonth}
                    onChange={(e) => setDueMonth(parseInt(e.target.value, 10))}
                    className="bg-[#1C1C1C] border border-[#262626] rounded-xl px-2 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
                  >
                    {monthsList.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m.slice(0, 3)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value, 10))}
                    className="bg-[#1C1C1C] border border-[#262626] rounded-xl px-2 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date & Optional End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1 text-xs">Start Date</label>
              <DateSelector
                value={startDate}
                onChange={setStartDate}
                placeholder="Select start date"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1 text-xs">End Date (Optional)</label>
              <DateSelector
                value={endDate}
                onChange={setEndDate}
                placeholder="No End Date"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-purple-400" />
              <span>Reminder Notification</span>
            </label>
            <select
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10))}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
            >
              <option value={0}>On the due date (9:00 AM)</option>
              <option value={1}>1 day before due date</option>
              <option value={3}>3 days before due date</option>
              <option value={7}>1 week before due date</option>
              <option value={-1}>No alert</option>
            </select>
          </div>

          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Notes / Account (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Auto-debits from checking account / Card ending in 4128"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition active:scale-[0.99] shadow-md shadow-purple-950/30"
            >
              {editExpense ? "Save Bill Changes" : "Track Recurring Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
