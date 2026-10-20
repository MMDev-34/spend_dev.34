import React, { useState } from "react";
import { useRouter } from "@/app/router";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import { NotificationItem } from "@/types/notification";
import { NotificationCard } from "./NotificationCard";
import { 
  Bell, 
  CheckCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sliders, 
  Plus,
  Clock,
  Sparkles
} from "lucide-react";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences: () => void;
  onOpenNewReminder: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
  onOpenNewReminder,
}) => {
  const { navigate } = useRouter();
  const { 
    allNotifications, 
    unreadCount, 
    urgentCount,
    markAllAsRead, 
    markPaid, 
    snooze, 
    dismiss, 
    markAsRead 
  } = useNotificationCenter();

  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "bills">("all");

  if (!isOpen) return null;

  const filtered = allNotifications.filter((n) => {
    if (activeTab === "urgent") return n.severity === "urgent" || n.severity === "high" || n.bucket === "overdue";
    if (activeTab === "bills") return n.type === "bill";
    return true;
  });

  const displayList = filtered.slice(0, 4);

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id);
    onClose();
    if (item.type === "bill" || item.type === "planned") {
      navigate("/notifications");
    } else if (item.type === "budget") {
      navigate("/plans");
    } else if (item.type === "loan") {
      navigate("/borrow-lend");
    } else if (item.type === "system") {
      navigate("/settings");
    } else {
      navigate("/notifications");
    }
  };

  return (
    <div 
      className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-[#141414] border border-[#2B2B2B] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-[#262626] flex items-center justify-between bg-[#111111]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-[#F5F5F5]">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500 text-black">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] px-2 py-1 rounded-lg hover:bg-[#222222] transition flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3 h-3 text-emerald-400" />
              <span>Mark read</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenPreferences();
            }}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#222222] transition"
            title="Notification preferences"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[#262626] bg-[#0E0E0E] text-xs">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-[#242424] text-[#F5F5F5]"
              : "text-[#71717A] hover:text-[#D4D4D8]"
          }`}
        >
          All ({allNotifications.length})
        </button>
        <button
          onClick={() => setActiveTab("urgent")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
            activeTab === "urgent"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-[#71717A] hover:text-[#D4D4D8]"
          }`}
        >
          <span>Urgent</span>
          {urgentCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("bills")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
            activeTab === "bills"
              ? "bg-[#242424] text-[#F5F5F5]"
              : "text-[#71717A] hover:text-[#D4D4D8]"
          }`}
        >
          Bills
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenNewReminder();
          }}
          className="ml-auto text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition flex items-center gap-1"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
          <span>Reminder</span>
        </button>
      </div>

      {/* Notification List Body */}
      <div className="max-h-[360px] overflow-y-auto p-2.5 space-y-2">
        {displayList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#F5F5F5]">All caught up!</p>
            <p className="text-[11px] text-[#71717A]">
              No pending alerts in this filter.
            </p>
          </div>
        ) : (
          displayList.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onItemClick={handleItemClick}
              onMarkPaid={markPaid}
              onSnooze={snooze}
              onDismiss={dismiss}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-[#111111] border-t border-[#262626] flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#71717A]">
          {allNotifications.length} total active item{allNotifications.length === 1 ? "" : "s"}
        </span>

        <button
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 transition active:scale-95"
        >
          <span>Open Notification Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
