import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  X,
  Check
} from "lucide-react";
import { getToday, formatDateButtonLabel } from "@/utils/dates";

interface DateSelectorProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  showSteppers?: boolean;
  align?: "left" | "center" | "right";
  placeholder?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const DateSelector: React.FC<DateSelectorProps> = ({
  value,
  onChange,
  className = "",
  showSteppers = true,
  align = "left",
  placeholder = "Select Date",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const currentDate = value ? new Date(value + "T00:00:00") : new Date();
  const validDate = isNaN(currentDate.getTime()) ? new Date() : currentDate;

  const [viewYear, setViewYear] = useState<number>(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validDate.getMonth()); // 0-11

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside and escape key listener to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const changeDateByDays = (deltaDays: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const base = value ? new Date(value + "T00:00:00") : new Date();
      const target = isNaN(base.getTime()) ? new Date() : base;
      target.setDate(target.getDate() + deltaDays);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, "0");
      const d = String(target.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    } catch {
      onChange(getToday());
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number, monthOffset: number = 0) => {
    const target = new Date(viewYear, viewMonth + monthOffset, day);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleSetRelative = (type: "today" | "yesterday" | "tomorrow", e: React.MouseEvent) => {
    e.stopPropagation();
    const target = new Date();
    if (type === "yesterday") target.setDate(target.getDate() - 1);
    if (type === "tomorrow") target.setDate(target.getDate() + 1);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Compute days matrix for the current viewMonth
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Sunday is 0 in JS. We want Monday to be 0 (Mo: 0, Tu: 1, ..., Su: 6)
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7; 
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = getToday();

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Date Bar */}
      <div className="flex items-center justify-between gap-1 bg-[#1C1C1C] border border-[#262626] rounded-xl p-1 text-xs text-[#F5F5F5] hover:border-neutral-700 transition">
        {showSteppers && (
          <button
            type="button"
            onClick={(e) => changeDateByDays(-1, e)}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
            title="Previous Day"
            aria-label="Previous Day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Center Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-1 min-w-0 py-1.5 px-2 rounded-lg text-xs font-semibold text-[#F5F5F5] hover:bg-[#262626] transition flex items-center justify-center gap-1.5 cursor-pointer truncate"
          title="Click to select date"
          aria-label="Toggle calendar"
          aria-expanded={isOpen}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{value ? formatDateButtonLabel(value) : placeholder}</span>
        </button>

        {showSteppers && (
          <button
            type="button"
            onClick={(e) => changeDateByDays(1, e)}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] active:scale-90 transition cursor-pointer shrink-0"
            title="Next Day"
            aria-label="Next Day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-1.5 z-50 w-72 bg-[#171717] border border-[#2E2E2E] rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          }`}
        >
          {/* Quick Shortcuts */}
          <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2 border-b border-[#262626]">
            <button
              type="button"
              onClick={(e) => handleSetRelative("yesterday", e)}
              className="flex-1 py-1 rounded-lg text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] bg-[#222222] hover:bg-[#2A2A2A] border border-[#2C2C2C] transition text-center cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={(e) => handleSetRelative("today", e)}
              className="flex-1 py-1 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-center cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={(e) => handleSetRelative("tomorrow", e)}
              className="flex-1 py-1 rounded-lg text-[11px] font-medium text-[#A1A1AA] hover:text-[#F5F5F5] bg-[#222222] hover:bg-[#2A2A2A] border border-[#2C2C2C] transition text-center cursor-pointer"
            >
              Tomorrow
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#262626] transition cursor-pointer active:scale-90"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-[#F5F5F5]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#262626] transition cursor-pointer active:scale-90"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d, i) => (
              <span key={d} className={`text-[10px] font-semibold ${i >= 5 ? "text-rose-400/80" : "text-[#71717A]"}`}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Prev month days */}
            {Array.from({ length: startingDayIndex }).map((_, i) => {
              const dayNum = daysInPrevMonth - startingDayIndex + i + 1;
              return (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, -1)}
                  className="h-8 rounded-lg text-xs text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#222222] transition flex items-center justify-center cursor-pointer"
                >
                  {dayNum}
                </button>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isSelected = dateKey === value;
              const isToday = dateKey === todayStr;

              return (
                <button
                  key={`cur-${dayNum}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, 0)}
                  className={`h-8 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center relative cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-950/30"
                      : isToday
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      : "text-[#E4E4E7] hover:bg-[#262626] hover:text-white"
                  }`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 -mt-0.5" />
                  )}
                </button>
              );
            })}

            {/* Next month days to fill grid to multiple of 7 */}
            {Array.from({ 
              length: (7 - ((startingDayIndex + daysInMonth) % 7)) % 7 
            }).map((_, i) => {
              const dayNum = i + 1;
              return (
                <button
                  key={`next-${i}`}
                  type="button"
                  onClick={() => handleSelectDay(dayNum, 1)}
                  className="h-8 rounded-lg text-xs text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#222222] transition flex items-center justify-center cursor-pointer"
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
