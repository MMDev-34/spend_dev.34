import React, { useState } from "react";
import { CustomReminder } from "@/types/notification";
import { X, Calendar, Clock, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface AddCustomReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<CustomReminder, "id" | "isCompleted" | "createdAt" | "updatedAt">) => void;
  initialData?: CustomReminder | null;
}

const SMART_SUGGESTIONS = [
  { title: "Review Credit Card Statement", icon: "💳", priority: "high" as const },
  { title: "Cancel Trial Subscription", icon: "⏳", priority: "urgent" as const },
  { title: "Pay Utility Bill", icon: "💡", priority: "high" as const },
  { title: "Transfer to Emergency Fund", icon: "🏦", priority: "normal" as const },
  { title: "Check Tax Deduction Receipts", icon: "📋", priority: "normal" as const },
  { title: "Follow up on Lent Money", icon: "🤝", priority: "high" as const },
];

const ICONS = ["📌", "💳", "💡", "🏦", "⏳", "📋", "🤝", "🚗", "🏠", "🎁", "✈️", "🛒"];

export const AddCustomReminderModal: React.FC<AddCustomReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [title, setTitle] = useState(initialData?.title || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || tomorrowStr);
  const [dueTime, setDueTime] = useState(initialData?.dueTime || "10:00");
  const [priority, setPriority] = useState<"urgent" | "high" | "normal" | "low">(
    initialData?.priority || "normal"
  );
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">(
    initialData?.recurrence || "none"
  );
  const [categoryIcon, setCategoryIcon] = useState(initialData?.categoryIcon || "📌");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for the reminder");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date");
      return;
    }

    onSave({
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueDate,
      dueTime: dueTime || undefined,
      priority,
      recurrence,
      categoryIcon,
    });

    onClose();
  };

  const handleApplySuggestion = (s: typeof SMART_SUGGESTIONS[0]) => {
    setTitle(s.title);
    setCategoryIcon(s.icon);
    setPriority(s.priority);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                {initialData ? "Edit Reminder" : "New Financial Reminder"}
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Schedule custom financial alerts and timely action items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#262626] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Suggestions */}
          {!initialData && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#A1A1AA]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quick Templates</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SMART_SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => handleApplySuggestion(s)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] border border-[#2B2B2B] text-[11px] text-[#D4D4D8] transition"
                  >
                    <span>{s.icon}</span>
                    <span className="truncate max-w-[140px]">{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title & Icon */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D4D4D8]">Title</label>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={categoryIcon}
                  onChange={(e) => setCategoryIcon(e.target.value)}
                  className="h-10 px-2.5 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-base text-center cursor-pointer hover:border-[#3E3E3E] transition outline-none"
                >
                  {ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Cancel trial before renewal"
                className="flex-1 h-10 px-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-emerald-500 outline-none transition"
                autoFocus
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D4D4D8] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] focus:border-emerald-500 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D4D4D8] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                <span>Alert Time (Optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full h-10 px-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Priority & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D4D4D8]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-10 px-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] focus:border-emerald-500 outline-none transition"
              >
                <option value="urgent">🚨 Urgent (Overdue/Immediate)</option>
                <option value="high">⚠️ High Priority</option>
                <option value="normal">🔵 Normal Priority</option>
                <option value="low">⚪ Low / Informational</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D4D4D8]">Recurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as any)}
                className="w-full h-10 px-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] focus:border-emerald-500 outline-none transition"
              >
                <option value="none">One-time only</option>
                <option value="daily">Daily repeat</option>
                <option value="weekly">Weekly repeat</option>
                <option value="monthly">Monthly repeat</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#D4D4D8]">Notes & Details (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any verification links, phone numbers, or account notes..."
              rows={2}
              className="w-full p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-emerald-500 outline-none resize-none transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{initialData ? "Save Changes" : "Create Reminder"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
