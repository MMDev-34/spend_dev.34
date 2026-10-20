import React, { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "@/app/router";
import { X, User, Mail, Database, ShieldCheck, Check, Settings, Cloud, LogIn, LogOut } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  onUpdateUserName: (name: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  userEmail,
  onUpdateUserName,
}) => {
  const { navigate } = useRouter();
  const { user, cloudSyncStatus, signInWithGoogle, signOut } = useAuth();
  const transactions = useAppStore((s) => s.transactions);
  const settings = useAppStore((s) => s.settings);
  const showToast = useUIStore((s) => s.showToast);

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName || userName);

  React.useEffect(() => {
    if (isOpen) {
      setNameInput(user?.displayName || userName);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose, user, userName]);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUserName(nameInput.trim());
      setIsEditing(false);
      showToast("Profile name updated");
    }
  };

  const displayName = user?.displayName || userName;
  const displayEmail = user?.email || userEmail;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
    >
      <div 
        className="w-full max-w-md rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 id="profile-title" className="text-base font-bold text-[#F5F5F5]">User Profile</h2>
              <p className="text-xs text-[#71717A]">Firebase account & cloud workspace</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] flex items-center gap-3.5">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-13 h-13 rounded-2xl object-cover border border-emerald-500/50 shadow-md shrink-0"
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-extrabold text-xl shadow-md shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isEditing && !user ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-[#141414] border border-neutral-700 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-[#F5F5F5] outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition"
                  title="Save name"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-bold text-[#F5F5F5] truncate">{displayName}</span>
                {!user && (
                  <button
                    onClick={() => {
                      setNameInput(userName);
                      setIsEditing(true);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-medium ml-2"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-[#71717A] truncate mt-0.5">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{displayEmail}</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                user
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user ? "bg-emerald-400 animate-pulse" : "bg-emerald-400"}`} />
                {user ? "Cloud Synced" : "Private Vault"}
              </span>
              <span className="text-[10px] text-[#71717A]">
                · {user ? "Firestore Enterprise" : "Isolated Vault"}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication CTA if Guest */}
        {!user ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-neutral-900 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Cloud className="w-4 h-4" />
              <span>Connect Firebase Account</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              Log in with Google to securely backup your expense logs to Firebase Firestore and sync across all your phones and computers.
            </p>
            <button
              onClick={() => {
                onClose();
                navigate("/auth");
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>Sign In / Sign Up</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-[#F5F5F5] block">Firebase User UID</span>
              <span className="text-[11px] font-mono text-[#71717A] max-w-[200px] truncate block">
                {user.uid}
              </span>
            </div>
            <button
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
            <span className="text-[10px] uppercase text-[#71717A] font-semibold">Transactions</span>
            <div className="text-base font-bold font-mono-num text-[#F5F5F5] mt-0.5">
              {transactions.length} recorded
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626]">
            <span className="text-[10px] uppercase text-[#71717A] font-semibold">Active Currency</span>
            <div className="text-base font-bold font-mono-num text-[#F5F5F5] mt-0.5">
              {settings.currency}
            </div>
          </div>
        </div>

        {/* Storage Security Note */}
        <div className="p-3 rounded-xl bg-[#181818]/70 border border-[#262626] flex items-start gap-2.5 text-xs text-[#A1A1AA]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed">
            <span className="font-semibold text-[#F5F5F5] block">
              {user ? "Zero-Trust Firestore Security" : "Private Local Storage"}
            </span>
            <span>
              {user
                ? "Your financial records are protected by strict Firestore ABAC security rules, isolated strictly to your account UID."
                : "Your financial logs are kept in this browser. Sign in with Google to enable cloud backups."}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              navigate("/settings");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-[#F5F5F5] text-xs font-semibold border border-[#262626] transition active:scale-95 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#71717A]" />
            <span>Open Settings</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
