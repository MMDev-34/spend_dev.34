import React, { useState } from "react";
import { X, HelpCircle, BookOpen, Smartphone, Shield, Download, FileSpreadsheet, ChevronDown } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const faqs = [
    {
      q: "Where is my expense data stored?",
      a: "All your data is saved locally on your device in your browser's persistent storage (IndexedDB/LocalStorage). It is 100% private and never transmitted to any third-party servers.",
    },
    {
      q: "How do I backup or transfer my data?",
      a: "Go to Settings > Backup & Data to download a complete JSON backup or export your transactions to CSV for Excel / Google Sheets.",
    },
    {
      q: "Can I use Spend offline?",
      a: "Yes! Spend is a Progressive Web App (PWA) with full offline functionality. You can log expenses, track loans, and manage budgets without an active internet connection.",
    },
    {
      q: "How does Borrow & Lend work?",
      a: "Under the Lend tab, you can track money you gave (lent) or money you received (borrowed). You can record partial or full settlements at any time.",
    },
    {
      q: "How do Planned Expenses & Recurring Bills work?",
      a: "In the Plan tab, you can view your monthly calendar and manage upcoming recurring subscriptions and planned expenses due in the current month.",
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="help-title" className="text-base font-bold text-[#F5F5F5]">Help & FAQs</h2>
              <p className="text-xs text-[#71717A]">Learn how to get the most out of Spend</p>
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

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Offline First</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              No cloud accounts needed. Your logs stay on this phone/computer.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#181818] border border-[#262626] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV & JSON Export</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              Instantly export data to spreadsheets or full JSON state files.
            </p>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-semibold uppercase text-[#71717A] tracking-wider">Frequently Asked Questions</h3>
          <div className="space-y-1.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[#181818] border border-[#262626] overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold text-[#F5F5F5] hover:text-emerald-400 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#71717A] shrink-0 transition-transform ${isOpen ? "rotate-180 text-emerald-400" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 text-[11px] leading-relaxed text-[#A1A1AA] border-t border-[#262626]/60 pt-2 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs">
          <span className="text-[#71717A] text-[11px]">Spend Expense Tracker v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
