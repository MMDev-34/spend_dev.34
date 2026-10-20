import React, { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "@/app/router";
import { useUIStore } from "@/stores/uiStore";
import { useAppStore } from "@/stores/appStore";
import { useAuth } from "@/context/AuthContext";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { AccountDropdownMenu } from "@/components/navigation/AccountDropdownMenu";
import { getToday } from "@/utils/dates";
import { Plus, Bell, ChevronDown, Cloud, LogIn } from "lucide-react";

export const TopBar: React.FC = () => {
  const { route, navigate } = useRouter();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const userName = useUIStore((s) => s.userName);
  const { user, cloudSyncStatus, signInWithGoogle } = useAuth();

  const recurringExpenses = useAppStore((s) => s.recurringExpenses || []);
  const plannedExpenses = useAppStore((s) => s.plannedExpenses || []);
  const loans = useAppStore((s) => s.loans || []);
  const settings = useAppStore((s) => s.settings);

  const todayStr = useMemo(() => getToday(), []);
  const currentMonthKey = todayStr.slice(0, 7);
  const today = useMemo(() => new Date(), []);

  // Popup States for mobile and desktop PC mode
  const [isMobilePopupOpen, setIsMobilePopupOpen] = useState(false);
  const [isDesktopPopupOpen, setIsDesktopPopupOpen] = useState(false);

  const userEmail = user?.email || "Guest Mode (Local)";
  const displayName = user?.displayName || userName;

  const mobilePopupRef = useRef<HTMLDivElement>(null);
  const desktopPopupRef = useRef<HTMLDivElement>(null);

  // Handle outside click & escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (mobilePopupRef.current && !mobilePopupRef.current.contains(e.target as Node)) {
        setIsMobilePopupOpen(false);
      }
      if (desktopPopupRef.current && !desktopPopupRef.current.contains(e.target as Node)) {
        setIsDesktopPopupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobilePopupOpen(false);
        setIsDesktopPopupOpen(false);
      }
    };
    if (isMobilePopupOpen || isDesktopPopupOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobilePopupOpen, isDesktopPopupOpen]);

  // Compute active pending notification count
  const notificationCount = useMemo(() => {
    let count = 0;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const alertDays = settings.billAlertDays ?? 7;

    // 1. Unpaid bills in next alertDays
    recurringExpenses
      .filter((r) => !r.isPaused && !r.paidDates?.includes(currentMonthKey))
      .forEach((r) => {
        if (r.frequency === "monthly") {
          const dueDayStr = r.dueDay.toString().padStart(2, "0");
          const monthStr = currentMonth.toString().padStart(2, "0");
          const billDate = new Date(`${currentYear}-${monthStr}-${dueDayStr}T00:00:00`);
          const diffDays = Math.ceil((billDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= -7 && diffDays <= alertDays) count++;
        }
      });

    // 2. Unpaid planned expenses in next alertDays or overdue
    plannedExpenses
      .filter((p) => !p.isPaid)
      .forEach((p) => {
        const planDate = new Date(`${p.targetDate}T00:00:00`);
        const diffDays = Math.ceil((planDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= alertDays) count++;
      });

    // 3. Loans due in next alertDays
    loans
      .filter((l) => l.dueDate)
      .forEach((l) => {
        const dueDate = new Date(`${l.dueDate}T00:00:00`);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= alertDays) count++;
      });

    return count;
  }, [recurringExpenses, plannedExpenses, loans, currentMonthKey, today, settings.billAlertDays]);

  const getPageTitle = () => {
    switch (route) {
      case "/":
        return "Dashboard";
      case "/transactions":
        return "Activity";
      case "/plans":
        return "Budget & Plan";
      case "/overview":
        return "Overview";
      case "/borrow-lend":
        return "Borrow & Lend";
      case "/settings":
        return "Settings";
      case "/profile":
        return "Profile";
      case "/account-settings":
        return "Account Settings";
      case "/notifications":
        return "Notifications";
      case "/auth":
      case "/login":
      case "/signup":
        return "Sign In & Sign Up";
      default:
        return "Spend";
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#262626]">
      {/* Zone 1: Mobile Brand / Page Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Profile Trigger Block */}
        <div 
          ref={mobilePopupRef}
          onClick={() => setIsMobilePopupOpen((prev) => !prev)}
          className="md:hidden relative flex items-center gap-2 px-1.5 py-1 -ml-1.5 rounded-xl hover:bg-[#181818] border border-transparent hover:border-[#262626] transition cursor-pointer select-none active:scale-[0.98] group"
          role="button"
          tabIndex={0}
          aria-expanded={isMobilePopupOpen}
          aria-haspopup="true"
          title="Open user profile & menu"
        >
          {/* Avatar block */}
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-7 h-7 rounded-lg object-cover border border-emerald-500/50 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center group-hover:border-emerald-500/50 group-hover:scale-105 transition shadow-sm shrink-0">
              <span className="text-emerald-400 font-bold text-xs">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-base tracking-tight text-[#F5F5F5]">{getPageTitle()}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#71717A] transition-transform duration-200 ${isMobilePopupOpen ? "rotate-180 text-emerald-400" : "group-hover:text-[#F5F5F5]"}`} />
          </div>

          {/* Small Popup Dropdown for Mobile */}
          {isMobilePopupOpen && (
            <AccountDropdownMenu
              position="bottom"
              align="left"
              userEmail={userEmail}
              onClose={() => setIsMobilePopupOpen(false)}
            />
          )}
        </div>

        {/* Desktop Page Title */}
        <div className="hidden md:block">
          <h1 className="text-base font-semibold text-[#F5F5F5]">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Zone 2: Middle Info / Cloud Status */}
      <div className="hidden sm:flex items-center gap-2 text-xs text-[#71717A]">
        {user ? (
          <div className="flex items-center gap-1.5 text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium">Firestore Connected</span>
          </div>
        ) : (
          <span>Personal expense tracker</span>
        )}
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5">
        <PWAInstallButton compact />

        {/* Top Right Notification Bell Icon Button */}
        <button
          onClick={() => navigate("/notifications")}
          className={`relative p-2 rounded-xl transition border active:scale-95 ${
            route === "/notifications"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
              : "bg-[#141414] hover:bg-[#1C1C1C] border-[#262626] text-[#A1A1AA] hover:text-[#F5F5F5]"
          }`}
          aria-label="View notifications and alerts"
          title="Notifications & Due Reminders"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold flex items-center justify-center ring-2 ring-[#0A0A0A]">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        <button
          onClick={() => openAddModal("expense")}
          className="hidden sm:flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add</span>
        </button>

        {/* Desktop Google Sign-in or User Profile */}
        {!user ? (
          <button
            onClick={() => navigate("/auth")}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            title="Sign up or sign in to sync transactions to Firebase"
          >
            <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Sign In / Sign Up</span>
          </button>
        ) : null}

        {/* Desktop User Profile Trigger Button (PC Mode) */}
        <div className="hidden md:block relative" ref={desktopPopupRef}>
          <button
            type="button"
            onClick={() => setIsDesktopPopupOpen((prev) => !prev)}
            className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition cursor-pointer select-none active:scale-[0.98] ${
              isDesktopPopupOpen 
                ? "bg-[#1C1C1C] border-[#383838]" 
                : "bg-[#141414] hover:bg-[#1A1A1A] border-[#262626]"
            }`}
            aria-expanded={isDesktopPopupOpen}
            aria-haspopup="true"
            title="Account menu (Profile, Settings, Help, Logout)"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-7 h-7 rounded-lg object-cover border border-emerald-500/40 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold text-xs shrink-0 shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-[#F5F5F5] max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#71717A] transition-transform duration-200 ${isDesktopPopupOpen ? "rotate-180 text-emerald-400" : ""}`} />
          </button>

          {/* Small Popup Dropdown for Desktop PC Mode */}
          {isDesktopPopupOpen && (
            <AccountDropdownMenu
              position="bottom"
              align="right"
              userEmail={userEmail}
              onClose={() => setIsDesktopPopupOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};
