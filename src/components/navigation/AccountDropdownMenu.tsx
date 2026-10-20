import React from "react";
import { useRouter } from "@/app/router";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/context/AuthContext";
import { User, Settings, HelpCircle, LogOut, Cloud, LogIn, CheckCircle2, ShieldCheck } from "lucide-react";

interface AccountDropdownMenuProps {
  userEmail?: string;
  align?: "left" | "right";
  position?: "bottom" | "top";
  onClose: () => void;
}

export const AccountDropdownMenu: React.FC<AccountDropdownMenuProps> = ({
  align = "left",
  position = "bottom",
  onClose,
}) => {
  const { navigate } = useRouter();
  const { user, cloudSyncStatus, signInWithGoogle } = useAuth();
  const userName = useUIStore((s) => s.userName);
  const openHelpModal = useUIStore((s) => s.openHelpModal);
  const openLogoutModal = useUIStore((s) => s.openLogoutModal);

  const positionClasses = position === "top"
    ? "bottom-full mb-2"
    : "top-full mt-2";

  const alignClasses = align === "right"
    ? "right-0"
    : "left-0";

  const displayName = user?.displayName || userName || "User";
  const displayEmail = user?.email || "";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute ${positionClasses} ${alignClasses} w-72 rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-left font-sans select-none`}
      role="menu"
    >
      {/* 1. User Profile Mini Card */}
      <div
        onClick={() => {
          onClose();
          navigate("/profile");
        }}
        className="p-2.5 rounded-xl bg-[#181818] border border-[#262626] hover:border-neutral-700 transition flex items-center gap-2.5 cursor-pointer group/card"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40 shrink-0 shadow-sm"
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
            {user ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Cloud Synced" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400/80 shrink-0" title="Guest Mode" />
            )}
          </div>
          <span className="text-[10px] text-[#71717A] truncate block">{displayEmail}</span>
        </div>
      </div>

      {/* Cloud Sync Status Indicator */}
      <div className="mx-1 my-1.5 px-2.5 py-1.5 rounded-lg bg-[#101010] border border-[#222222] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[#A1A1AA]">
          <Cloud className={`w-3.5 h-3.5 ${user ? "text-emerald-400" : "text-neutral-500"}`} />
          <span>{user ? "Firebase Sync" : "Storage"}</span>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          user
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-neutral-800 text-neutral-400 border border-neutral-700"
        }`}>
          {user ? (cloudSyncStatus === "syncing" ? "Syncing..." : "Online · Active") : "Local Offline"}
        </span>
      </div>

      {/* Sign-in / Sign-up Prompt if Guest */}
      {!user && (
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/auth");
          }}
          className="w-full mb-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Sign In / Sign Up</span>
        </button>
      )}

      {/* 2. Menu Navigation Options */}
      <div className="space-y-0.5 text-xs">
        {/* Option A: Profile */}
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/profile");
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
          role="menuitem"
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
            onClose();
            navigate("/account-settings");
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
          role="menuitem"
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
            onClose();
            navigate("/settings");
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
          role="menuitem"
        >
          <div className="w-7 h-7 rounded-lg bg-[#1C1C1C] border border-[#262626] flex items-center justify-center text-neutral-400 shrink-0">
            <Settings className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-semibold text-xs text-[#F5F5F5]">Settings</div>
            <div className="text-[10px] text-[#71717A]">Preferences, currency & backups</div>
          </div>
        </button>

        {/* Option C: Help & Support */}
        <button
          type="button"
          onClick={() => {
            onClose();
            openHelpModal();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1C] transition cursor-pointer text-left"
          role="menuitem"
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
                onClose();
                openLogoutModal();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer text-left"
              role="menuitem"
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
  );
};
