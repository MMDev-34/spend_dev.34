import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface MonthPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  pickerYear: number;
  onYearChange: (updater: (prev: number) => number) => void;
  activeMonth: string;
  timeScope: string;
  onSelectMonth: (monthIdx: number, year: number) => void;
  onJumpToCurrentMonth: () => void;
}

export const MonthPickerPopover: React.FC<MonthPickerPopoverProps> = ({
  isOpen,
  onClose,
  pickerYear,
  onYearChange,
  activeMonth,
  timeScope,
  onSelectMonth,
  onJumpToCurrentMonth,
}) => {
  if (!isOpen) return null;

  const now = new Date();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 z-50 w-[270px] sm:w-[290px] bg-black/95 backdrop-blur-md border border-neutral-700/90 rounded-2xl p-3 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-100">
        {/* Year Selector */}
        <div className="flex items-center justify-between px-1 pb-2 border-b border-[#262626]">
          <button
            type="button"
            onClick={() => onYearChange((y) => y - 1)}
            className="p-1 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] text-[#A1A1AA] hover:text-white border border-[#2D2D2D] transition cursor-pointer"
            title="Previous Year"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-white font-mono-num">
            {pickerYear}
          </span>
          <button
            type="button"
            onClick={() => onYearChange((y) => y + 1)}
            className="p-1 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] text-[#A1A1AA] hover:text-white border border-[#2D2D2D] transition cursor-pointer"
            title="Next Year"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 12-Month Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_SHORT.map((name, idx) => {
            const mStr = String(idx + 1).padStart(2, "0");
            const isSelected = activeMonth === `${pickerYear}-${mStr}` && timeScope === "month";
            const isCurrentRealMonth = pickerYear === now.getFullYear() && idx === now.getMonth();

            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectMonth(idx, pickerYear)}
                className={`py-2 rounded-xl text-xs font-semibold transition cursor-pointer select-none flex flex-col items-center justify-center relative ${
                  isSelected
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-950/30 font-bold"
                    : isCurrentRealMonth
                    ? "bg-[#1F1F1F] text-emerald-400 border border-emerald-500/40 hover:bg-[#282828]"
                    : "bg-[#181818] hover:bg-[#242424] text-[#D4D4D8] border border-[#262626] hover:border-neutral-600 hover:text-white"
                }`}
              >
                <span>{name}</span>
                {isCurrentRealMonth && !isSelected && (
                  <span className="text-[8px] text-emerald-400 font-normal leading-none pt-0.5">Current</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onJumpToCurrentMonth}
            className="flex-1 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] border border-[#2D2D2D] text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition cursor-pointer text-center"
          >
            Jump to This Month
          </button>
        </div>
      </div>
    </>
  );
};
