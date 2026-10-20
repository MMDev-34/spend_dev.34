import React from "react";
import { useUIStore } from "@/stores/uiStore";
import { Plus } from "lucide-react";

export const FloatingAddButton: React.FC = () => {
  const openAddModal = useUIStore((s) => s.openAddModal);

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40 pointer-events-auto">
      <button
        onClick={() => openAddModal("expense")}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-black shadow-xl shadow-emerald-950/40 active:scale-95 active:bg-emerald-400 transition-all border border-emerald-400/40"
        aria-label="Add transaction"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
