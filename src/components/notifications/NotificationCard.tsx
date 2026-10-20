import React, { useState, useRef, useEffect } from "react";
import { NotificationItem } from "@/types/notification";
import { formatMoney } from "@/utils/currency";
import { useAppStore } from "@/stores/appStore";
import { 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  X, 
  ChevronRight, 
  Edit2, 
  Calendar,
  ExternalLink,
  Archive,
  Eye,
  EyeOff,
  BellOff,
  Inbox
} from "lucide-react";

interface NotificationCardProps {
  item: NotificationItem;
  onItemClick: (item: NotificationItem) => void;
  onMarkPaid: (item: NotificationItem) => void;
  onSnooze: (id: string, options: { days?: number; hours?: number }) => void;
  onDismiss: (item: NotificationItem) => void;
  onToggleRead?: (id: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  onItemClick,
  onMarkPaid,
  onSnooze,
  onDismiss,
  onToggleRead,
}) => {
  const settings = useAppStore((s) => s.settings);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  const severityStyles = {
    urgent: {
      border: "border-rose-500/30 hover:border-rose-500/50",
      bg: "bg-rose-500/5",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/25",
      iconBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      dot: "bg-rose-500",
    },
    high: {
      border: "border-amber-500/30 hover:border-amber-500/50",
      bg: "bg-amber-500/5",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
      iconBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-500",
    },
    warning: {
      border: "border-yellow-500/20 hover:border-yellow-500/40",
      bg: "bg-yellow-500/5",
      badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
      iconBg: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
      dot: "bg-yellow-500",
    },
    info: {
      border: "border-[#262626] hover:border-[#383838]",
      bg: "bg-[#141414]",
      badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      iconBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
      dot: "bg-cyan-400",
    },
  }[item.severity];

  const getBucketBadge = () => {
    if (item.bucket === "overdue") {
      const days = Math.abs(item.daysRemaining ?? 1);
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          <span>{days}d Overdue</span>
        </span>
      );
    }
    if (item.bucket === "today") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
          <Clock className="w-2.5 h-2.5" />
          <span>Due Today</span>
        </span>
      );
    }
    if (item.bucket === "tomorrow") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
          Tomorrow
        </span>
      );
    }
    if (item.daysRemaining !== undefined && item.daysRemaining > 1) {
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-[#A1A1AA] border border-[#2B2B2B]">
          In {item.daysRemaining} days
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={() => onItemClick(item)}
      className={`group relative rounded-2xl p-4 sm:p-4.5 border transition-all duration-150 cursor-pointer select-none ${
        severityStyles.bg
      } ${severityStyles.border} ${
        !item.isRead ? "shadow-sm" : "opacity-95"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Icon + Information */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Category Icon */}
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105 ${
              severityStyles.iconBg
            }`}
          >
            {item.categoryIcon}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Unread Indicator Dot */}
              {!item.isRead && (
                <span
                  className={`w-2 h-2 rounded-full ${severityStyles.dot} shrink-0 animate-ping`}
                  title="Unread notification"
                />
              )}

              <h4 className="text-xs sm:text-sm font-bold text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h4>

              {/* Bucket & Urgency Badges */}
              {getBucketBadge()}

              {item.isSnoozed && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <BellOff className="w-2.5 h-2.5" />
                  <span>Snoozed</span>
                </span>
              )}

              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${severityStyles.badge}`}
              >
                {item.categoryName || item.type}
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
              {item.description}
            </p>

            {item.detailedMessage && (
              <p className="text-[11px] text-[#71717A] italic line-clamp-1">
                Note: {item.detailedMessage}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Amount + Actions */}
        <div 
          className="flex items-center gap-2.5 self-end sm:self-center shrink-0 pt-1 sm:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Amount Badge */}
          {item.amount !== undefined && item.amount > 0 && (
            <div className="text-right pr-1">
              <span className="font-mono-num font-bold text-[#F5F5F5] text-xs sm:text-sm">
                {formatMoney(item.amount, settings.currency, settings.numberFormat)}
              </span>
            </div>
          )}

          {/* Action Button */}
          {item.actionType === "pay_bill" || item.actionType === "pay_plan" ? (
            <button
              onClick={() => onMarkPaid(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-sm shadow-emerald-950/20"
              title="Quick Record Payment into Transactions"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Mark Paid</span>
            </button>
          ) : item.actionType === "complete_reminder" ? (
            <button
              onClick={() => onMarkPaid(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-sm"
              title="Mark Reminder Done"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Complete</span>
            </button>
          ) : item.actionType === "open_inbox" ? (
            <button
              onClick={() => onItemClick(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition active:scale-95 shadow-sm"
            >
              <Inbox className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Review</span>
            </button>
          ) : (
            <button
              onClick={() => onItemClick(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#D4D4D8] border border-[#2B2B2B] text-xs font-semibold transition"
            >
              <span>Inspect</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Snooze / More Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#2B2B2B] transition active:scale-95"
              title="More notification options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#181818] border border-[#2E2E2E] rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                {/* Snooze options */}
                <div className="px-3 py-1 text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                  Snooze Reminder
                </div>
                <button
                  onClick={() => {
                    onSnooze(item.id, { days: 1 });
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#262626] text-[#D4D4D8] flex items-center gap-2 transition"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Snooze until tomorrow</span>
                </button>
                <button
                  onClick={() => {
                    onSnooze(item.id, { days: 3 });
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#262626] text-[#D4D4D8] flex items-center gap-2 transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Snooze for 3 days</span>
                </button>
                <button
                  onClick={() => {
                    onSnooze(item.id, { days: 7 });
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#262626] text-[#D4D4D8] flex items-center gap-2 transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Snooze for 1 week</span>
                </button>

                <div className="my-1 border-t border-[#262626]" />

                {/* Dismiss */}
                <button
                  onClick={() => {
                    onDismiss(item);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#262626] text-rose-400 flex items-center gap-2 transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Dismiss Notification</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
