import React, { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/app/router";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { ThemeMode, WeekStartDay, NumberFormatType, DefaultPaymentMethod } from "@/types/settings";
import { storage } from "@/lib/storage";
import { uploadCurrentLocalStateToCloud } from "@/lib/firebaseSync";
import { ManageCategoriesModal } from "@/components/settings/ManageCategoriesModal";
import { 
  Download, 
  Upload, 
  Trash2, 
  Moon, 
  DollarSign, 
  Calendar, 
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  X, 
  Cloud, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  CreditCard,
  Bell,
  Eye,
  ShieldAlert,
  Smartphone,
  ChevronRight,
  Layers,
  Compass,
  User,
  ShieldCheck
} from "lucide-react";
import { getLocalUserProfile } from "@/utils/userProfile";

export const SettingsPage: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const loadDemoData = useAppStore((s) => s.loadDemoData);
  const importState = useAppStore((s) => s.importState);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);

  const { navigate } = useRouter();
  const { user, cloudSyncStatus, signOut } = useAuth();
  const showToast = useUIStore((s) => s.showToast);

  const profile = getLocalUserProfile(user?.uid);

  const [resetConfirmText, setResetConfirmText] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  React.useEffect(() => {
    if (showResetModal) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowResetModal(false);
          setResetConfirmText("");
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showResetModal]);

  const handleManualCloudSync = async () => {
    if (!user) {
      showToast("Please sign in with Google first", "info");
      return;
    }
    setIsManualSyncing(true);
    try {
      const currentState = useAppStore.getState();
      await uploadCurrentLocalStateToCloud(user.uid, currentState);
      showToast("Cloud sync completed successfully", "success");
    } catch {
      showToast("Cloud sync failed. Check connection.", "error");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = storage.exportState();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spend-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported successfully");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleExportCSV = () => {
    try {
      const catMap = new Map(categories.map((c) => [c.id, c.name]));
      const headers = ["id", "type", "amount_minor_units", "category", "date", "note", "paymentMethod", "createdAt"];
      
      const rows = transactions.map((t) => [
        t.id,
        t.type,
        t.amount,
        `"${catMap.get(t.categoryId) || "Other"}"`,
        t.date,
        `"${(t.note || "").replace(/"/g, '""')}"`,
        t.paymentMethod || "other",
        t.createdAt,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spend-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("CSV exported successfully");
    } catch {
      showToast("CSV export failed", "error");
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importState(content);
        if (result.success) {
          showToast("State restored successfully");
        } else {
          showToast(`Import failed: ${result.error}`, "error");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (resetConfirmText.trim() !== "RESET") {
      showToast("Type RESET to confirm deletion", "error");
      return;
    }
    resetAllData();
    setShowResetModal(false);
    setResetConfirmText("");
    showToast("All data has been reset to defaults");
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* 0. User Profile Banner (Matching Design Reference Screen 2 & 4) */}
      <div
        onClick={() => navigate("/profile")}
        className="rounded-2xl bg-[#141414] hover:bg-[#181818] border border-[#262626] hover:border-[#383838] p-4 sm:p-5 transition cursor-pointer flex items-center justify-between gap-4 group shadow-sm active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-[#333333] bg-[#1C1C1C] flex items-center justify-center shrink-0 shadow-md">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName || "User"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-700 text-[#F5F5F5] font-bold text-lg font-mono">
                {profile.displayName?.slice(0, 2).toUpperCase() || "SV"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-[#F5F5F5] group-hover:text-emerald-400 transition-colors truncate">
              {profile.displayName || "User"}
            </h3>
            <span className="text-xs text-[#71717A] flex items-center gap-1 group-hover:text-[#A1A1AA] transition-colors">
              <span>View profile</span>
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-[#71717A] group-hover:text-[#F5F5F5] group-hover:translate-x-0.5 transition shrink-0" />
      </div>

      {/* Quick Navigation Cards: Profile & Account Settings (Matching Reference Screen 4 items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="p-3.5 sm:p-4 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] flex items-center justify-between text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#F5F5F5] block group-hover:text-emerald-400 transition">
                Profile
              </span>
              <span className="text-[11px] text-[#71717A]">
                Name, photo, DOB & contact
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#F5F5F5] transition shrink-0" />
        </button>

        <button
          onClick={() => navigate("/account-settings")}
          className="p-3.5 sm:p-4 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] flex items-center justify-between text-left transition group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#F5F5F5] block group-hover:text-cyan-400 transition">
                Account Settings
              </span>
              <span className="text-[11px] text-[#71717A]">
                Login email, password & security
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-[#F5F5F5] transition shrink-0" />
        </button>
      </div>

      {/* 1. Account & Cloud Sync Card */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans">
            Account & Cloud Sync
          </h2>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            user 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}>
            {user ? "Cloud Active" : "Local Mode"}
          </span>
        </div>

        <div className="rounded-2xl bg-[#141414] border border-[#262626] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold text-lg shrink-0 shadow-sm">
                  {user ? (user.displayName || user.email || "U").charAt(0).toUpperCase() : <Cloud className="w-6 h-6 text-black" />}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#F5F5F5] truncate">
                    {user ? user.displayName || "Google Account" : "Guest Account (Offline)"}
                  </h3>
                </div>
                <p className="text-xs text-[#71717A] truncate mt-0.5">
                  {user ? user.email : "Data stored privately on this device. Sign in to sync across devices."}
                </p>
                {user && (
                  <p className="text-[11px] text-emerald-400/90 font-medium mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{cloudSyncStatus === "syncing" ? "Syncing..." : "Real-time sync active"}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {!user ? (
                <button
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-950/30 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Sign In with Google</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleManualCloudSync}
                    disabled={isManualSyncing}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1C1C] hover:bg-neutral-800 text-xs font-semibold text-[#F5F5F5] border border-[#2D2D2D] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Force cloud sync"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isManualSyncing ? "animate-spin" : ""}`} />
                    <span>Sync Now</span>
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Regional & Display Preferences Card */}
      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans px-1">
          Regional & Display Preferences
        </h2>

        <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#242424] overflow-hidden text-sm shadow-sm">
          {/* Currency */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <DollarSign className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Currency</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Active symbol: {settings.currency}</span>
              </div>
            </div>

            <select
              value={settings.currency}
              onChange={(e) => {
                const val = e.target.value;
                updateSettings({ currency: val });
                showToast(`Currency changed to ${val}`);
              }}
              className="bg-[#1C1C1C] border border-[#262626] text-xs text-[#F5F5F5] rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Number Format */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Number Format</span>
              <span className="text-[11px] sm:text-xs text-[#71717A]">Digit separator styling</span>
            </div>

            <select
              value={settings.numberFormat}
              onChange={(e) => {
                const val = e.target.value as NumberFormatType;
                updateSettings({ numberFormat: val });
                showToast("Number formatting updated");
              }}
              className="bg-[#1C1C1C] border border-[#262626] text-xs text-[#F5F5F5] rounded-xl px-3 py-1.5 outline-none font-mono-num cursor-pointer"
            >
              <option value="comma">1,234.56 (Standard)</option>
              <option value="dot">1.234,56 (European)</option>
              <option value="space">1 234,56 (Space)</option>
            </select>
          </div>

          {/* Week Start Day */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Week Starts On</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Applies to weekly budgets and summaries</span>
              </div>
            </div>

            <div className="flex p-0.5 bg-[#1C1C1C] rounded-xl border border-[#262626] text-xs shrink-0">
              {(["monday", "sunday"] as WeekStartDay[]).map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    updateSettings({ weekStartsOn: day });
                    showToast(`Week starts on ${day.charAt(0).toUpperCase() + day.slice(1)}`);
                  }}
                  className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                    settings.weekStartsOn === day
                      ? "bg-[#262626] text-[#F5F5F5] font-semibold shadow-sm"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Moon className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Theme Mode</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Spend is dark-first by design</span>
              </div>
            </div>

            <div className="flex p-0.5 bg-[#1C1C1C] rounded-xl border border-[#262626] text-xs shrink-0">
              {(["dark", "light", "system"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    updateSettings({ theme: mode });
                    showToast(`Theme mode set to ${mode}`);
                  }}
                  className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                    settings.theme === mode
                      ? "bg-[#262626] text-[#F5F5F5] font-semibold shadow-sm"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Default Start Screen */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Compass className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Default Start Tab</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Screen opened on app launch</span>
              </div>
            </div>

            <select
              value={settings.defaultStartRoute || "/"}
              onChange={(e) => {
                const route = e.target.value;
                updateSettings({ defaultStartRoute: route });
                showToast("Default start tab updated");
              }}
              className="bg-[#1C1C1C] border border-[#262626] text-xs text-[#F5F5F5] rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="/">Dashboard</option>
              <option value="/transactions">Activity (Transactions)</option>
              <option value="/plans">Budget & Plan</option>
              <option value="/borrow-lend">Borrow & Lend</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Transaction & Budget Defaults Card */}
      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans px-1">
          Entry Defaults & Behavior
        </h2>

        <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#242424] overflow-hidden text-sm shadow-sm">
          {/* Default Payment Method */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <CreditCard className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Default Payment Method</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Pre-selected in the 5-second Quick Add sheet</span>
              </div>
            </div>

            <select
              value={settings.defaultPaymentMethod || "upi"}
              onChange={(e) => {
                const method = e.target.value as DefaultPaymentMethod;
                updateSettings({ defaultPaymentMethod: method });
                showToast(`Default payment method set to ${method.toUpperCase()}`);
              }}
              className="bg-[#1C1C1C] border border-[#262626] text-xs text-[#F5F5F5] rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank">Net Banking</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Budget Alert Level */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Budget Warning Alert</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Triggers amber badge when budget spend reaches this level</span>
              </div>
            </div>

            <div className="flex p-0.5 bg-[#1C1C1C] rounded-xl border border-[#262626] text-xs shrink-0">
              {[80, 90, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    updateSettings({ budgetAlertThreshold: pct });
                    showToast(`Budget warning threshold set to ${pct}%`);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono-num ${
                    (settings.budgetAlertThreshold ?? 80) === pct
                      ? "bg-[#262626] text-emerald-400 font-bold shadow-sm"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Bill Due Alert Window */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Bill Reminder Alert Window</span>
              <span className="text-[11px] sm:text-xs text-[#71717A]">Notify upcoming bills and loan deadlines</span>
            </div>

            <div className="flex p-0.5 bg-[#1C1C1C] rounded-xl border border-[#262626] text-xs shrink-0">
              {[3, 7, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    updateSettings({ billAlertDays: days });
                    showToast(`Bill reminders alert set to ${days} days`);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono-num ${
                    (settings.billAlertDays ?? 7) === days
                      ? "bg-[#262626] text-emerald-400 font-bold shadow-sm"
                      : "text-[#71717A] hover:text-[#F5F5F5]"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Category Management Trigger */}
          <div 
            onClick={() => setIsCategoriesModalOpen(true)}
            className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[#181818] transition cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm group-hover:text-emerald-400 transition">
                  Manage Categories
                </span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">
                  {categories.length} active categories · Add, rename, or drag to arrange
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#71717A] group-hover:text-[#F5F5F5] transition shrink-0">
              <span>Configure</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Safety & Privacy Controls Card */}
      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans px-1">
          Safety & Privacy Controls
        </h2>

        <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#242424] overflow-hidden text-sm shadow-sm">
          {/* Confirm Before Delete */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldAlert className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Confirm Before Deleting</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Show confirmation prompt to avoid accidental taps</span>
              </div>
            </div>

            <button
              onClick={() => {
                const nextVal = !settings.confirmBeforeDelete;
                updateSettings({ confirmBeforeDelete: nextVal });
                showToast(nextVal ? "Confirmation before deletion enabled" : "Confirmation before deletion disabled");
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.confirmBeforeDelete ? "bg-emerald-500" : "bg-neutral-800 border border-neutral-700"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.confirmBeforeDelete ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Mask Balances on Launch */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Eye className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Mask Sensitive Balances</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Mask net worth until tapped for privacy in public</span>
              </div>
            </div>

            <button
              onClick={() => {
                const nextVal = !settings.hideSensitiveBalances;
                updateSettings({ hideSensitiveBalances: nextVal });
                showToast(nextVal ? "Sensitive balances masked by default" : "Sensitive balances unmasked");
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.hideSensitiveBalances ? "bg-emerald-500" : "bg-neutral-800 border border-neutral-700"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.hideSensitiveBalances ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Haptic Feedback */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Smartphone className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Haptic Tap Feedback</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Tactile vibration on mobile during entry logging</span>
              </div>
            </div>

            <button
              onClick={() => {
                const nextVal = settings.hapticFeedback === false;
                updateSettings({ hapticFeedback: nextVal });
                if (nextVal && typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(15);
                }
                showToast(nextVal ? "Haptic feedback enabled" : "Haptic feedback disabled");
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                settings.hapticFeedback !== false ? "bg-emerald-500" : "bg-neutral-800 border border-neutral-700"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.hapticFeedback !== false ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Data Management & Storage Card */}
      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider font-sans px-1">
          Data Management & Safe Storage
        </h2>

        <div className="rounded-2xl bg-[#141414] border border-[#262626] divide-y divide-[#242424] overflow-hidden text-sm shadow-sm">
          {/* CSV Export */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Export CSV Spreadsheet</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Download all {transactions.length} transactions for Excel or Sheets</span>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-neutral-800 text-xs font-semibold text-[#F5F5F5] border border-[#262626] transition active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* JSON Backup */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Download className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Full State Backup</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Complete offline snapshot of transactions, plans, and debts</span>
              </div>
            </div>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-neutral-800 text-xs font-semibold text-[#F5F5F5] border border-[#262626] transition active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>
          </div>

          {/* JSON Restore */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Upload className="w-4 h-4 text-[#71717A] shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Restore from Backup</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Reinstate data from previously exported JSON</span>
              </div>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C1C1C] hover:bg-neutral-800 text-xs font-semibold text-[#F5F5F5] border border-[#262626] transition cursor-pointer shrink-0 active:scale-95">
              <Upload className="w-3.5 h-3.5" />
              <span>Import File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>

          {/* Load Sample Data */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium text-[#F5F5F5] block text-xs sm:text-sm">Load Demo Data</span>
                <span className="text-[11px] sm:text-xs text-[#71717A]">Seed realistic transactions and borrow/lend items to test charts</span>
              </div>
            </div>

            <button
              onClick={() => {
                loadDemoData();
                showToast("Sample demo data loaded");
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-[#F5F5F5] border border-neutral-700/60 transition active:scale-95 cursor-pointer shrink-0"
            >
              Load Demo
            </button>
          </div>

          {/* Reset All Data (Danger Zone) */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-rose-950/10">
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-rose-400 block text-xs sm:text-sm">Reset All App Data</span>
                <span className="text-[11px] sm:text-xs text-rose-300/70">Permanently clear transactions, plans, and debts</span>
              </div>
            </div>

            <button
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-400 border border-rose-500/30 transition active:scale-95 cursor-pointer shrink-0"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* 6. About Box */}
      <section className="p-4 rounded-2xl bg-[#141414] border border-[#262626] text-xs text-[#71717A] space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#F5F5F5] font-bold text-sm">Spend</span>
          <span className="text-[10px] font-mono-num px-2 py-0.5 rounded-md bg-[#1C1C1C] text-[#A1A1AA] border border-[#262626]">
            v1.2.0
          </span>
        </div>
        <p className="leading-relaxed">
          Log an expense in under 5 seconds and understand "Am I okay?" in under 3 seconds.
        </p>
        <p className="text-[11px] text-[#A1A1AA] pt-1">
          {user ? "Authenticated and synced with private Firestore cloud." : "Operating in offline local-storage mode."} Your financial logs are strictly private to you.
        </p>
      </section>

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowResetModal(false);
              setResetConfirmText("");
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span id="reset-modal-title">Confirm Data Reset</span>
              </div>
              <button 
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText("");
                }} 
                className="text-[#71717A] hover:text-white p-1 rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              This will irreversibly delete all transactions, budgets, people, and borrow/lend entries. To proceed, please type <strong className="text-white font-mono">RESET</strong> below:
            </p>

            <input
              type="text"
              placeholder="Type RESET"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#262626] rounded-xl p-2.5 text-xs text-[#F5F5F5] font-mono outline-none uppercase"
              autoFocus
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText("");
                }}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-xs font-semibold text-[#F5F5F5] hover:bg-neutral-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetConfirmText.trim() !== "RESET"}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
              >
                Permanently Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      <ManageCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
      />
    </div>
  );
};
