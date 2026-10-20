import React, { useState, useRef, useEffect } from "react";
import { useRouter, RoutePath } from "@/app/router";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PieChart, 
  Handshake, 
  Settings, 
  Plus,
  CalendarRange,
  User,
  HelpCircle,
  LogOut,
  ChevronsUpDown,
  Cloud,
  LogIn,
  ShieldCheck
} from "lucide-react";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { ProfileModal } from "@/components/navigation/ProfileModal";
import { HelpModal } from "@/components/navigation/HelpModal";
import { LogoutModal } from "@/components/navigation/LogoutModal";

interface NavItem {
  name: string;
  path: RoutePath;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", path: "/", icon: LayoutDashboard },
  { name: "Activity", path: "/transactions", icon: ArrowLeftRight },
  { name: "Budget & Plan", path: "/plans", icon: CalendarRange },
  { name: "Overview", path: "/overview", icon: PieChart },
  { name: "Borrow & Lend", path: "/borrow-lend", icon: Handshake },
  { name: "Settings", path: "/settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { route, navigate } = useRouter();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const showToast = useUIStore((s) => s.showToast);
  const userNameFromStore = useUIStore((s) => s.userName);
  const setUserNameInStore = useUIStore((s) => s.setUserName);

  const { user, cloudSyncStatus, signInWithGoogle, signOut } = useAuth();

  // Popup & Modals State
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const displayName = user?.displayName || userNameFromStore;
  const userEmail = user?.email || "Guest Mode (Local)";

  const popupRef = useRef<HTMLDivElement>(null);

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    if (user) {
      await signOut();
    }
    navigate("/");
  };

  // Close popup on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsPopupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopupOpen(false);
      }
    };
    if (isPopupOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopupOpen]);

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-[#141414] border-r border-[#262626] h-screen sticky top-0 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/60 flex items-center justify-center shadow-inner shrink-0">
              <img src="/icons/icon-192.png" alt="Spend" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#F5F5F5]">SPEND</span>
          </div>

          {user && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Cloud className="w-3 h-3" />
              <span>Cloud</span>
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => openAddModal("expense")}
            className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/20 cursor-pointer"
            aria-label="Add transaction"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Transaction</span>
          </button>

          {!user && (
            <button
              onClick={() => navigate("/auth")}
              className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-[#1C1C1C] hover:bg-[#252525] border border-[#2D2D2D] text-xs font-semibold text-[#F5F5F5] transition active:scale-[0.98] cursor-pointer"
              title="Sign in or sign up to backup data"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = route === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#1C1C1C] text-[#F5F5F5] font-semibold border border-[#262626]"
                    : "text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-neutral-900/60"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-[#71717A]"}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer / User Account Block at bottom of Sidebar */}
        <div className="p-3 border-t border-[#262626] space-y-2 relative" ref={popupRef}>
          <PWAInstallButton />

          {/* User Account Popover Trigger Button */}
          <button
            type="button"
            onClick={() => setIsPopupOpen(!isPopupOpen)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer text-left select-none group ${
              isPopupOpen 
                ? "bg-[#1C1C1C] border-[#333333]" 
                : "bg-transparent border-transparent hover:bg-[#1A1A1A] hover:border-[#262626]"
            }`}
            aria-expanded={isPopupOpen}
            aria-haspopup="true"
            title="Account & Settings menu"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold text-xs shadow-md shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#F5F5F5] truncate group-hover:text-emerald-400 transition-colors">
                  {displayName}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user ? "bg-emerald-400" : "bg-amber-400/80"}`} title={user ? "Cloud Active" : "Guest Mode"} />
              </div>
              <span className="text-[10px] text-[#71717A] truncate block">{userEmail}</span>
            </div>

            <ChevronsUpDown className={`w-3.5 h-3.5 text-[#71717A] group-hover:text-[#F5F5F5] transition-transform ${isPopupOpen ? "text-emerald-400" : ""}`} />
          </button>

          {/* Small Popup Dropdown Menu - Floats above sidebar footer */}
          {isPopupOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left font-sans"
            >
              {/* 1. User Profile Mini Card */}
              <div
                onClick={() => {
                  setIsPopupOpen(false);
                  navigate("/profile");
                }}
                className="p-2.5 rounded-xl bg-[#181818] border border-[#262626] hover:border-neutral-700 transition flex items-center gap-2.5 cursor-pointer group/card"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold text-sm shrink-0 shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F5F5F5] group-hover/card:text-emerald-400 transition truncate">
                      {displayName}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user ? "bg-emerald-400" : "bg-amber-400"}`} />
                  </div>
                  <span className="text-[10px] text-[#71717A] truncate block">{userEmail}</span>
                </div>
              </div>

              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    navigate("/auth");
                  }}
                  className="w-full my-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Sign In / Sign Up</span>
                </button>
              )}

              {/* 2. Menu Navigation Options */}
              <div className="mt-1.5 space-y-0.5 text-xs">
                {/* Option A: Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-emerald-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#F5F5F5]">Profile</div>
                    <div className="text-[10px] text-[#71717A]">Edit identity, DOB & photo</div>
                  </div>
                </button>

                {/* Option B: Account Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    navigate("/account-settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#F5F5F5]">Account Settings</div>
                    <div className="text-[10px] text-[#71717A]">Login, password & security</div>
                  </div>
                </button>

                {/* Option C: Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-neutral-400 shrink-0">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#F5F5F5]">Settings</div>
                    <div className="text-[10px] text-[#71717A]">Preferences, backups & sync</div>
                  </div>
                </button>

                {/* Option C: Help & FAQs */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    setIsHelpModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-amber-400 shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-[#F5F5F5]">Help & FAQs</div>
                    <div className="text-[10px] text-[#71717A]">Shortcuts, offline & guides</div>
                  </div>
                </button>

                {user && (
                  <>
                    <div className="my-1 border-t border-[#262626]" />

                    {/* Option D: Log Out */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPopupOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-rose-400">Log Out</div>
                        <div className="text-[10px] text-rose-400/70">Disconnect Firebase session</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-[#71717A] px-1 font-mono-num">
            <span>Spend v1.0</span>
            <span>{user ? "Firestore Sync" : "Local Mode"}</span>
          </div>
        </div>
      </aside>

      {/* User Profile Details Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userName={displayName}
        userEmail={userEmail}
        onUpdateUserName={setUserNameInStore}
      />

      {/* Help & Support Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirmLogout={handleConfirmLogout}
        userEmail={userEmail}
      />
    </>
  );
};
