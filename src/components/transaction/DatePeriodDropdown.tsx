import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, Check, X, ArrowRight } from "lucide-react";
import { getToday, formatShortDate } from "@/utils/dates";

export type PeriodType = "this_month" | "last_month" | "last_7_days" | "this_year" | "all_time" | "custom";

export interface DatePeriodValue {
  type: PeriodType;
  customStartDate?: string;
  customEndDate?: string;
}

interface DatePeriodDropdownProps {
  value: DatePeriodValue;
  onChange: (val: DatePeriodValue) => void;
  className?: string;
}

export const DatePeriodDropdown: React.FC<DatePeriodDropdownProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(value.type === "custom");
  const [tempStart, setTempStart] = useState(value.customStartDate || "");
  const [tempEnd, setTempEnd] = useState(value.customEndDate || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync temp dates when value changes
  useEffect(() => {
    if (value.customStartDate) setTempStart(value.customStartDate);
    if (value.customEndDate) setTempEnd(value.customEndDate);
    if (value.type === "custom") setIsEditingCustom(true);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Compute readable button label
  const buttonLabel = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleDateString("en-US", { month: "long" });

    switch (value.type) {
      case "this_month":
        return `${currentMonthName} ${currentYear}`;
      case "last_month": {
        const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
        const lastMonthName = lastMonthDate.toLocaleDateString("en-US", { month: "long" });
        return `${lastMonthName} ${lastMonthDate.getFullYear()}`;
      }
      case "last_7_days":
        return "Last 7 Days";
      case "this_year":
        return `Year ${currentYear}`;
      case "all_time":
        return "All Time";
      case "custom": {
        if (value.customStartDate && value.customEndDate) {
          if (value.customStartDate === value.customEndDate) {
            return formatShortDate(value.customStartDate);
          }
          return `${formatShortDate(value.customStartDate)} – ${formatShortDate(value.customEndDate)}`;
        }
        if (value.customStartDate) return `From ${formatShortDate(value.customStartDate)}`;
        if (value.customEndDate) return `Until ${formatShortDate(value.customEndDate)}`;
        return "Custom Range";
      }
      default:
        return `${currentMonthName} ${currentYear}`;
    }
  }, [value]);

  const handleSelectPredefined = (type: PeriodType) => {
    setIsEditingCustom(false);
    onChange({ type });
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (!tempStart && !tempEnd) return;
    onChange({
      type: "custom",
      customStartDate: tempStart || undefined,
      customEndDate: tempEnd || undefined,
    });
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl bg-[#1C1C1C] hover:bg-[#222222] border border-[#2D2D2D] hover:border-[#383838] text-xs font-semibold text-[#F5F5F5] transition active:scale-[0.98] cursor-pointer shadow-sm select-none"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="truncate max-w-[160px] xs:max-w-[200px] sm:max-w-none">{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#71717A] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 sm:w-72 rounded-2xl bg-[#141414] border border-[#2D2D2D] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-[#71717A] border-b border-[#262626]">
            Select Period
          </div>

          <div className="py-1 space-y-0.5">
            {[
              { id: "this_month" as PeriodType, label: "This Month" },
              { id: "last_month" as PeriodType, label: "Last Month" },
              { id: "last_7_days" as PeriodType, label: "Last 7 Days" },
              { id: "this_year" as PeriodType, label: "This Year" },
              { id: "all_time" as PeriodType, label: "All Time" },
            ].map((option) => {
              const isSelected = value.type === option.id && !isEditingCustom;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectPredefined(option.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                      : "text-[#D4D4D8] hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
                  }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#262626] my-1" />

          {/* Custom Date Range Section */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => setIsEditingCustom(true)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                value.type === "custom" || isEditingCustom
                  ? "bg-[#1E1E1E] text-emerald-400 font-semibold"
                  : "text-[#D4D4D8] hover:bg-[#1E1E1E] hover:text-[#F5F5F5]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Custom Date Range</span>
              </div>
              {value.type === "custom" && !isEditingCustom && (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {isEditingCustom && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#181818] border border-[#282828] space-y-2 animate-in fade-in">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                    <span>From:</span>
                    <input
                      type="date"
                      value={tempStart}
                      onChange={(e) => setTempStart(e.target.value)}
                      className="bg-[#121212] border border-[#2D2D2D] text-[#F5F5F5] rounded-lg px-2 py-1 text-xs outline-none focus:border-emerald-500/60"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                    <span>To:</span>
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="bg-[#121212] border border-[#2D2D2D] text-[#F5F5F5] rounded-lg px-2 py-1 text-xs outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (value.type !== "custom") setIsEditingCustom(false);
                      else setIsOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#202020] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    disabled={!tempStart && !tempEnd}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
