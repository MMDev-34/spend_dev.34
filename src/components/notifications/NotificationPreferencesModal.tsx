import React from "react";
import { NotificationPreferences } from "@/types/notification";
import { 
  X, 
  Settings2, 
  Bell, 
  Volume2, 
  Moon, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Sliders
} from "lucide-react";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onUpdate: (updates: Partial<NotificationPreferences>) => void;
  browserPermission: NotificationPermission;
  onRequestPermission: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdate,
  browserPermission,
  onRequestPermission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">Notification Preferences</h3>
              <p className="text-[11px] text-[#71717A]">
                Customize reminder channels, alert lead times, and quiet hours
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

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs">
          {/* Section 1: Browser & Sound Delivery */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Alert Delivery & Sound</span>
            </h4>

            {/* Browser Push Permission Status */}
            <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-[#F5F5F5]">
                  <span>Native Device Push Alerts</span>
                  {browserPermission === "granted" ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                      Active
                    </span>
                  ) : browserPermission === "denied" ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Receive notifications even when the browser tab is in background
                </p>
              </div>

              {browserPermission === "granted" ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.enableBrowserPush}
                    onChange={(e) => onUpdate({ enableBrowserPush: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2B2B2B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              ) : (
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition active:scale-95 shrink-0"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Audio Chime Toggle */}
            <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-[#F5F5F5] flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Interaction Chimes & Sounds</span>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Gentle synthesized audio chime when marking items paid or snoozing
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.soundEnabled}
                  onChange={(e) => onUpdate({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#2B2B2B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Section 2: Quiet Hours */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quiet Hours (Do Not Disturb)</span>
            </h4>

            <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#F5F5F5]">Enable Quiet Hours</div>
                  <p className="text-[11px] text-[#71717A]">
                    Pause background device push alerts during rest hours
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.quietHoursEnabled}
                    onChange={(e) => onUpdate({ quietHoursEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#2B2B2B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {preferences.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2B2B2B] animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA]">Quiet Hours Start</span>
                    <input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(e) => onUpdate({ quietHoursStart: e.target.value })}
                      className="w-full h-8 px-2 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#A1A1AA]">Quiet Hours End</span>
                    <input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(e) => onUpdate({ quietHoursEnd: e.target.value })}
                      className="w-full h-8 px-2 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Reminder Lead Times */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Reminder Lead Times</span>
            </h4>

            <div className="p-3 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#F5F5F5]">Recurring Bills Lead Time</div>
                  <p className="text-[11px] text-[#71717A]">Days before due date to start reminding</p>
                </div>
                <select
                  value={preferences.leadDaysBills}
                  onChange={(e) => onUpdate({ leadDaysBills: Number(e.target.value) })}
                  className="h-8 px-2.5 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                >
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>1 week before</option>
                  <option value={14}>2 weeks before</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2B2B2B]">
                <div>
                  <div className="font-semibold text-[#F5F5F5]">Planned Expenses Lead Time</div>
                  <p className="text-[11px] text-[#71717A]">Days before target date to notify</p>
                </div>
                <select
                  value={preferences.leadDaysPlanned}
                  onChange={(e) => onUpdate({ leadDaysPlanned: Number(e.target.value) })}
                  className="h-8 px-2.5 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                >
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>1 week before</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2B2B2B]">
                <div>
                  <div className="font-semibold text-[#F5F5F5]">Borrow & Lend Due Date Lead Time</div>
                  <p className="text-[11px] text-[#71717A]">Days before repayment due date</p>
                </div>
                <select
                  value={preferences.leadDaysLoans}
                  onChange={(e) => onUpdate({ leadDaysLoans: Number(e.target.value) })}
                  className="h-8 px-2.5 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                >
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>1 week before</option>
                  <option value={14}>2 weeks before</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2B2B2B]">
                <div>
                  <div className="font-semibold text-[#F5F5F5]">Budget Alert Threshold</div>
                  <p className="text-[11px] text-[#71717A]">Trigger warning when spending crosses %</p>
                </div>
                <select
                  value={preferences.budgetThresholdPercent}
                  onChange={(e) => onUpdate({ budgetThresholdPercent: Number(e.target.value) })}
                  className="h-8 px-2.5 bg-[#141414] border border-[#2B2B2B] rounded-lg text-xs text-[#F5F5F5] outline-none"
                >
                  <option value={70}>70% of limit</option>
                  <option value={75}>75% of limit</option>
                  <option value={80}>80% of limit (Recommended)</option>
                  <option value={90}>90% of limit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Channel Filtering */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#A1A1AA] uppercase flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Active Alert Channels</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "channelBills", label: "Bills & Subscriptions", icon: "🧾" },
                { key: "channelPlanned", label: "Planned Expenses", icon: "🎯" },
                { key: "channelBudgets", label: "Budget Limit Alerts", icon: "📊" },
                { key: "channelLoans", label: "Borrow & Lend Debts", icon: "🤝" },
                { key: "channelReminders", label: "Custom Reminders", icon: "📌" },
                { key: "channelSystem", label: "Webhook & System", icon: "📥" },
              ].map((channel) => (
                <label
                  key={channel.key}
                  className="flex items-center justify-between p-2.5 bg-[#1C1C1C] border border-[#2B2B2B] rounded-xl cursor-pointer hover:border-[#3E3E3E] transition"
                >
                  <span className="flex items-center gap-2 text-[11px] text-[#D4D4D8] font-medium truncate">
                    <span>{channel.icon}</span>
                    <span className="truncate">{channel.label}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={(preferences as any)[channel.key]}
                    onChange={(e) => onUpdate({ [channel.key]: e.target.checked } as any)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-[#141414] border-[#2B2B2B]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[#262626] bg-[#141414]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-950/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
