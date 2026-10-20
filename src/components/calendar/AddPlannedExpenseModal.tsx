import React, { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { parseMoneyInput, formatMoney } from "@/utils/currency";
import { PlannedExpense } from "@/types/plan";
import { getToday } from "@/utils/dates";
import { X, CalendarClock, Bell, Sparkles, AlertCircle } from "lucide-react";

interface AddPlannedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  editPlan?: PlannedExpense | null;
}

export const AddPlannedExpenseModal: React.FC<AddPlannedExpenseModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  editPlan,
}) => {
  const addPlannedExpense = useAppStore((s) => s.addPlannedExpense);
  const updatePlannedExpense = useAppStore((s) => s.updatePlannedExpense);
  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  const todayStr = getToday();

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [targetDate, setTargetDate] = useState<string>(initialDate || todayStr);
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || "cat-other-expense");
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);
  const [notes, setNotes] = useState("");

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
    if (editPlan) {
      setTitle(editPlan.title);
      setAmountStr((editPlan.amount / 100).toString());
      setTargetDate(editPlan.targetDate);
      setCategoryId(editPlan.categoryId);
      setReminderDaysBefore(editPlan.reminderDaysBefore ?? 1);
      setNotes(editPlan.notes || "");
    } else {
      setTitle("");
      setAmountStr("");
      setTargetDate(initialDate || todayStr);
      setCategoryId(categories[0]?.id || "cat-other-expense");
      setReminderDaysBefore(1);
      setNotes("");
    }
  }, [editPlan, initialDate, isOpen, categories, todayStr]);

  if (!isOpen) return null;

  const handleDateShortcut = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setTargetDate(`${y}-${m}-${day}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseMoneyInput(amountStr);

    if (!title.trim()) {
      showToast("Please enter a title for the planned expense", "error");
      return;
    }

    if (amount <= 0) {
      showToast("Please enter an amount greater than 0", "error");
      return;
    }

    if (!targetDate) {
      showToast("Please select a target date", "error");
      return;
    }

    if (editPlan) {
      updatePlannedExpense(editPlan.id, {
        title: title.trim(),
        amount,
        targetDate,
        categoryId,
        reminderDaysBefore,
        notes: notes.trim() || undefined,
      });
      showToast("Planned expense updated successfully");
    } else {
      addPlannedExpense({
        title: title.trim(),
        amount,
        targetDate,
        categoryId,
        reminderDaysBefore,
        notes: notes.trim() || undefined,
        isPaid: false,
      });
      showToast("Future expense planned! Scheduled on calendar.");
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {editPlan ? "Edit Planned Expense" : "Plan Future Expense"}
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Track upcoming spending & get notified before it arrives
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
          {/* Title */}
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">
              Expense Purpose / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Flight tickets to Goa, Car Major Service, Laptop upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-cyan-500 transition"
              required
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Estimated Amount</label>
            <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
              <span className="text-sm font-bold text-[#71717A] font-mono-num">{settings.currency}</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="4,500"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-[#F5F5F5] outline-none font-mono-num"
                required
              />
            </div>
          </div>

          {/* Target Date with quick shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[#A1A1AA] font-medium">Planned Date</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleDateShortcut(1)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleDateShortcut(7)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  +1 Wk
                </button>
                <button
                  type="button"
                  onClick={() => handleDateShortcut(30)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[#A1A1AA] hover:text-[#F5F5F5] transition"
                >
                  +1 Mo
                </button>
              </div>
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-cyan-500 transition font-mono-num"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-cyan-500 transition"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notification Reminder Timing */}
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reminder Notification</span>
            </label>
            <select
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10))}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-cyan-500 transition"
            >
              <option value={0}>On the day of the expense (9:00 AM)</option>
              <option value={1}>1 day before (recommended)</option>
              <option value={3}>3 days before</option>
              <option value={7}>1 week before</option>
              <option value={-1}>No reminder</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#A1A1AA] font-medium mb-1">Notes / Checklist (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Compare quotes, check credit card cashback"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs transition active:scale-[0.99] shadow-md shadow-cyan-950/30"
            >
              {editPlan ? "Save Changes" : "Schedule Planned Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
