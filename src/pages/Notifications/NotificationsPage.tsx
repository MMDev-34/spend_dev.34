import React, { useState, useMemo } from "react";
import { useRouter } from "@/app/router";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { NotificationItem, CustomReminder } from "@/types/notification";
import { RecurringExpense, PlannedExpense } from "@/types/plan";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { AddCustomReminderModal } from "@/components/notifications/AddCustomReminderModal";
import { NotificationPreferencesModal } from "@/components/notifications/NotificationPreferencesModal";
import { AddRecurringModal } from "@/components/calendar/AddRecurringModal";
import { AddPlannedExpenseModal } from "@/components/calendar/AddPlannedExpenseModal";
import { 
  BellRing, 
  Bell, 
  CheckCircle2, 
  Plus, 
  Download, 
  Sliders, 
  Search, 
  Clock, 
  AlertTriangle, 
  Layers, 
  CheckCheck, 
  ShieldCheck, 
  Trash2, 
  Calendar,
  RotateCcw,
  Sparkles,
  Inbox
} from "lucide-react";

type PageTab = 
  | "all" 
  | "urgent" 
  | "bills" 
  | "planned" 
  | "budgets" 
  | "loans" 
  | "reminders" 
  | "snoozed" 
  | "history";

export const NotificationsPage: React.FC = () => {
  const { navigate } = useRouter();
  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const plannedExpenses = useAppStore((s) => s.plannedExpenses || []);
  const showToast = useUIStore((s) => s.showToast);

  const {
    allNotifications,
    snoozedNotifications,
    overdueList,
    todayList,
    tomorrowList,
    thisWeekList,
    upcomingList,
    urgentCount,
    unreadCount,
    totalCount,
    snoozedCount,
    history,
    preferences,
    customReminders,
    browserPermission,
    markAsRead,
    markAllAsRead,
    snooze,
    unsnooze,
    dismiss,
    restore,
    markPaid,
    updatePreferences,
    addCustomReminder,
    updateCustomReminder,
    toggleCustomReminder,
    deleteCustomReminder,
    requestBrowserPermission,
    exportIcs,
  } = useNotificationCenter();

  // Local View States
  const [activeTab, setActiveTab] = useState<PageTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "urgent" | "high" | "warning">("all");
  const [groupChronologically, setGroupChronologically] = useState(true);

  // Modals
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CustomReminder | null>(null);
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);

  // Inspection modals for Bills and Plans
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlannedExpense | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    let list: NotificationItem[] = [];

    if (activeTab === "all") list = allNotifications;
    else if (activeTab === "urgent") list = allNotifications.filter((n) => n.severity === "urgent" || n.severity === "high" || n.bucket === "overdue");
    else if (activeTab === "bills") list = allNotifications.filter((n) => n.type === "bill");
    else if (activeTab === "planned") list = allNotifications.filter((n) => n.type === "planned");
    else if (activeTab === "budgets") list = allNotifications.filter((n) => n.type === "budget");
    else if (activeTab === "loans") list = allNotifications.filter((n) => n.type === "loan");
    else if (activeTab === "reminders") list = allNotifications.filter((n) => n.type === "reminder");
    else if (activeTab === "snoozed") list = snoozedNotifications;
    else list = allNotifications;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        (n.categoryName && n.categoryName.toLowerCase().includes(q)) ||
        (n.detailedMessage && n.detailedMessage.toLowerCase().includes(q))
      );
    }

    if (severityFilter !== "all") {
      list = list.filter((n) => n.severity === severityFilter);
    }

    return list;
  }, [allNotifications, snoozedNotifications, activeTab, searchQuery, severityFilter]);

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);

    if (item.type === "bill" && item.originalId) {
      const rec = recurringExpenses.find((r) => r.id === item.originalId);
      if (rec) {
        setSelectedRecurring(rec);
        setIsRecurringModalOpen(true);
      }
    } else if (item.type === "planned" && item.originalId) {
      const plan = plannedExpenses.find((p) => p.id === item.originalId);
      if (plan) {
        setSelectedPlan(plan);
        setIsPlanModalOpen(true);
      }
    } else if (item.type === "reminder" && item.originalId) {
      const cr = customReminders.find((r) => r.id === item.originalId);
      if (cr) {
        setEditingReminder(cr);
        setIsReminderModalOpen(true);
      }
    } else if (item.type === "budget") {
      navigate("/plans");
    } else if (item.type === "loan") {
      navigate("/borrow-lend");
    } else if (item.type === "system") {
      navigate("/settings");
    }
  };

  const handleSaveReminder = (data: Omit<CustomReminder, "id" | "isCompleted" | "createdAt" | "updatedAt">) => {
    if (editingReminder) {
      updateCustomReminder(editingReminder.id, data);
      showToast("Reminder updated");
      setEditingReminder(null);
    } else {
      addCustomReminder(data);
      showToast("Reminder created and scheduled");
    }
  };

  // Chronological Grouping Filter
  const renderChronologicalGroups = (items: NotificationItem[]) => {
    const overdue = items.filter((n) => n.bucket === "overdue");
    const today = items.filter((n) => n.bucket === "today");
    const tomorrow = items.filter((n) => n.bucket === "tomorrow");
    const thisWeek = items.filter((n) => n.bucket === "this_week");
    const upcoming = items.filter((n) => n.bucket === "upcoming");

    const groups = [
      { title: "🚨 Overdue Payments & Alerts", items: overdue, color: "text-rose-400" },
      { title: "⏰ Due Today", items: today, color: "text-amber-400" },
      { title: "📅 Due Tomorrow", items: tomorrow, color: "text-yellow-400" },
      { title: "🗓️ Due This Week", items: thisWeek, color: "text-cyan-400" },
      { title: "🔮 Upcoming (Later)", items: upcoming, color: "text-[#A1A1AA]" },
    ].filter((g) => g.items.length > 0);

    if (groups.length === 0) {
      return renderEmptyState();
    }

    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.title} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${g.color}`}>
                {g.title}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1C1C1C] text-[#A1A1AA] border border-[#2B2B2B]">
                {g.items.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {g.items.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  onItemClick={handleNotificationClick}
                  onMarkPaid={markPaid}
                  onSnooze={snooze}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="rounded-2xl bg-[#141414] border border-[#262626] p-12 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#F5F5F5]">All caught up!</h3>
        <p className="text-xs text-[#71717A] max-w-sm mx-auto">
          No pending alerts matching your active filters. All bills, planned budgets, and custom reminders are up to date.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pt-2">
        <button
          onClick={() => setIsReminderModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Custom Reminder</span>
        </button>
        <button
          onClick={() => navigate("/plans")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#D4D4D8] border border-[#2B2B2B] text-xs font-semibold transition"
        >
          <Calendar className="w-4 h-4" />
          <span>View Financial Calendar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Hero Card with Stats Strip & Actions */}
      <div className="rounded-2xl bg-[#141414] border border-[#262626] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-[#F5F5F5]">
                  Notification Center
                </h1>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A]">
                Intelligent financial due dates, smart budget alerts, and scheduled reminders
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingReminder(null);
                setIsReminderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Reminder</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#D4D4D8] font-semibold text-xs border border-[#2B2B2B] transition active:scale-95"
                title="Mark all active notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Read</span>
              </button>
            )}

            <button
              onClick={exportIcs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#D4D4D8] font-semibold text-xs border border-[#2B2B2B] transition active:scale-95"
              title="Export upcoming calendar to Apple / Google Calendar"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .ICS</span>
            </button>

            <button
              onClick={() => setIsPrefsModalOpen(true)}
              className="p-2 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5] border border-[#2B2B2B] transition active:scale-95"
              title="Notification Settings & Lead Times"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#262626]">
          <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#71717A] uppercase">Active Alerts</div>
              <div className="text-base font-bold text-[#F5F5F5]">{totalCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#71717A] uppercase">Urgent & Overdue</div>
              <div className="text-base font-bold text-rose-400">{urgentCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#71717A] uppercase">Due Today</div>
              <div className="text-base font-bold text-amber-400">{todayList.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-[#71717A] uppercase">Snoozed</div>
              <div className="text-base font-bold text-purple-400">{snoozedCount}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Device Push Status Banner if not granted */}
        {browserPermission !== "granted" && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Native push alerts are not yet enabled on this browser. Enable them to never miss a due date.</span>
            </div>
            <button
              onClick={requestBrowserPermission}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition active:scale-95 shrink-0 self-start sm:self-auto"
            >
              Enable Browser Push
            </button>
          </div>
        )}
      </div>

      {/* 2. Filter Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        {[
          { id: "all", label: `All (${totalCount})` },
          { id: "urgent", label: `🚨 Urgent (${urgentCount})` },
          { id: "bills", label: `Bills (${allNotifications.filter((n) => n.type === "bill").length})` },
          { id: "planned", label: `Planned (${allNotifications.filter((n) => n.type === "planned").length})` },
          { id: "budgets", label: `Budgets (${allNotifications.filter((n) => n.type === "budget").length})` },
          { id: "loans", label: `Loans (${allNotifications.filter((n) => n.type === "loan").length})` },
          { id: "reminders", label: `Reminders (${customReminders.length})` },
          { id: "snoozed", label: `Snoozed (${snoozedCount})` },
          { id: "history", label: `History (${history.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PageTab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? "bg-[#262626] text-[#F5F5F5] border border-[#383838]"
                : "text-[#71717A] hover:text-[#F5F5F5]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Search & Control Bar */}
      {activeTab !== "history" && activeTab !== "reminders" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, note, or amount..."
              className="w-full h-9 pl-9 pr-3 bg-[#141414] border border-[#262626] rounded-xl text-xs text-[#F5F5F5] placeholder-[#71717A] focus:border-emerald-500 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="h-9 px-2.5 bg-[#141414] border border-[#262626] rounded-xl text-xs text-[#F5F5F5] outline-none"
            >
              <option value="all">All Severities</option>
              <option value="urgent">Urgent Only</option>
              <option value="high">High Priority</option>
              <option value="warning">Warnings</option>
            </select>

            {/* Grouping Mode Toggle */}
            <button
              onClick={() => setGroupChronologically((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-semibold transition ${
                groupChronologically
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-[#141414] border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5]"
              }`}
              title="Toggle Chronological Grouping vs Flat List"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{groupChronologically ? "Grouped" : "Flat List"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Tab Body Content */}
      {activeTab === "reminders" ? (
        /* Dedicated Custom Reminders Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">Custom Financial Reminders</h2>
              <p className="text-xs text-[#71717A]">
                Personal to-dos, billing checklists, and custom money reminders
              </p>
            </div>
            <button
              onClick={() => {
                setEditingReminder(null);
                setIsReminderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Reminder</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {customReminders.length === 0 ? (
              <div className="rounded-2xl bg-[#141414] border border-[#262626] p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#F5F5F5]">No custom reminders yet</h3>
                <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                  Create quick reminders for cancelling free trials, checking bank fees, or following up on loans.
                </p>
              </div>
            ) : (
              customReminders.map((cr) => (
                <div
                  key={cr.id}
                  className={`p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-3 transition ${
                    cr.isCompleted ? "opacity-60 bg-[#0E0E0E]" : "hover:border-[#383838]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleCustomReminder(cr.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                        cr.isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-[#3A3A3A] hover:border-emerald-400 text-transparent"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="text-xl">{cr.categoryIcon || "📌"}</div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-bold text-[#F5F5F5] truncate ${
                            cr.isCompleted ? "line-through text-[#71717A]" : ""
                          }`}
                        >
                          {cr.title}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-800 text-[#A1A1AA]">
                          {cr.dueDate} {cr.dueTime ? `@ ${cr.dueTime}` : ""}
                        </span>
                        {cr.recurrence !== "none" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                            {cr.recurrence}
                          </span>
                        )}
                      </div>
                      {cr.notes && (
                        <p className="text-xs text-[#71717A] mt-0.5 line-clamp-1">{cr.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingReminder(cr);
                        setIsReminderModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#262626] transition"
                      title="Edit reminder"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCustomReminder(cr.id)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === "history" ? (
        /* Notification History Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#F5F5F5]">Activity History</h2>
              <p className="text-xs text-[#71717A]">
                Audit log of payments confirmed, reminders completed, and alerts dismissed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="rounded-2xl bg-[#141414] border border-[#262626] p-12 text-center text-xs text-[#71717A]">
                No recent notification events recorded.
              </div>
            ) : (
              history.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      ev.action === "paid"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : ev.action === "completed"
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                        : "bg-neutral-800 text-[#A1A1AA]"
                    }`}>
                      {ev.action}
                    </span>
                    <span className="font-semibold text-[#F5F5F5]">{ev.title}</span>
                  </div>

                  <span className="text-[11px] text-[#71717A]">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(ev.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Notifications List / Grouped View */
        <div className="space-y-3">
          {groupChronologically && activeTab === "all" ? (
            renderChronologicalGroups(filteredNotifications)
          ) : filteredNotifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  onItemClick={handleNotificationClick}
                  onMarkPaid={markPaid}
                  onSnooze={snooze}
                  onDismiss={dismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddCustomReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
        initialData={editingReminder}
      />

      <NotificationPreferencesModal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        preferences={preferences}
        onUpdate={updatePreferences}
        browserPermission={browserPermission}
        onRequestPermission={requestBrowserPermission}
      />

      <AddRecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false);
          setSelectedRecurring(null);
        }}
        editExpense={selectedRecurring}
      />

      <AddPlannedExpenseModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setSelectedPlan(null);
        }}
        editPlan={selectedPlan}
      />
    </div>
  );
};
