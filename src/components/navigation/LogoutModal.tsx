import React from "react";
import { LogOut, X, AlertCircle } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  userEmail: string;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  userEmail,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div 
        className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <LogOut className="w-4 h-4" />
            </div>
            <h3 id="logout-title" className="text-sm font-bold text-[#F5F5F5]">Log Out</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1F1F1F] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] space-y-1.5 text-xs">
          <p className="text-[#F5F5F5] font-medium">
            Are you sure you want to log out of <span className="text-emerald-400 font-semibold">{userEmail}</span>?
          </p>
          <div className="flex items-start gap-1.5 text-[11px] text-[#A1A1AA] pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Your recorded transactions and budgets will remain safely stored on this device.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-[#A1A1AA] hover:text-[#F5F5F5] text-xs font-semibold border border-[#262626] transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={onConfirmLogout}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-md shadow-rose-950/30 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
