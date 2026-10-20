import React from "react";
import { useUIStore } from "@/stores/uiStore";
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from "lucide-react";

export const Toast: React.FC = () => {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  if (!toast) return null;

  return (
    <aside 
      aria-label="Notification"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#1C1C1C] border border-[#2D2D2D] text-sm text-[#F5F5F5] shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
        {toast.type === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
        <span className="truncate text-xs sm:text-sm font-medium">{toast.message}</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              hideToast();
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{toast.action.label}</span>
          </button>
        )}
        <button
          onClick={hideToast}
          className="p-1 rounded-md text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
