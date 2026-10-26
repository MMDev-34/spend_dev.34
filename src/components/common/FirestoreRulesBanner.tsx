import React, { useState } from "react";
import { ShieldAlert, Copy, Check, ExternalLink, X, ChevronDown, ChevronUp } from "lucide-react";
import { FIRESTORE_RULES_SOURCE } from "@/lib/firestoreRulesSource";
import firebaseConfig from "../../../firebase-applet-config.json";

interface FirestoreRulesBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export const FirestoreRulesBanner: React.FC<FirestoreRulesBannerProps> = ({
  onDismiss,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const projectId = (firebaseConfig as any)?.projectId || "spend-d4b10";
  const databaseId = (firebaseConfig as any)?.firestoreDatabaseId;
  const consoleRulesUrl =
    databaseId && databaseId !== "(default)"
      ? `https://console.firebase.google.com/project/${projectId}/firestore/databases/${databaseId}/rules`
      : `https://console.firebase.google.com/project/${projectId}/firestore/rules`;

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SOURCE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.createElement("textarea");
      input.value = FIRESTORE_RULES_SOURCE;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#F5F5F5] shadow-xl space-y-3 animate-in fade-in duration-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="font-bold text-amber-300 text-sm">
              Update Firestore Rules in Firebase Console
            </h4>
            <p className="text-[11px] text-[#D4D4D8] mt-0.5 leading-relaxed">
              Your external Firebase project (<strong>{projectId}</strong>) blocked cloud operations with <code className="text-amber-300 font-mono">Missing or insufficient permissions</code>. Your local changes are saved safely on this device.
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#A1A1AA] hover:text-[#F5F5F5] p-1 rounded-lg hover:bg-white/5 transition"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#2D2D2D] space-y-2">
        <div className="text-[11px] text-[#A1A1AA] leading-relaxed">
          To enable live cloud sync for loans, transactions, and categories:
        </div>
        <ol className="list-decimal list-inside text-[11px] text-[#D4D4D8] space-y-1 pl-1">
          <li>Copy the production security rules below.</li>
          <li>
            Open{" "}
            <a
              href={consoleRulesUrl}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 underline inline-flex items-center gap-1 font-semibold hover:text-amber-300"
            >
              <span>Firebase Console &gt; Firestore &gt; Rules</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          </li>
          <li>Paste into the editor and click <strong>Publish</strong>.</li>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopyRules}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Rules Copied!" : "Copy Firestore Rules"}</span>
        </button>

        <a
          href={consoleRulesUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] border border-[#3A3A3A] text-xs font-semibold text-[#F5F5F5] transition active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          <span>Open Rules Editor</span>
        </a>

        <button
          type="button"
          onClick={() => setShowCode((prev) => !prev)}
          className="ml-auto text-[11px] text-[#A1A1AA] hover:text-[#F5F5F5] flex items-center gap-1 py-1 px-2 rounded hover:bg-white/5 transition"
        >
          <span>{showCode ? "Hide rules preview" : "View rules preview"}</span>
          {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showCode && (
        <div className="mt-2 p-2.5 rounded-xl bg-[#050505] border border-[#222] max-h-48 overflow-y-auto">
          <pre className="text-[10px] font-mono text-[#D4D4D8] whitespace-pre select-all">
            {FIRESTORE_RULES_SOURCE}
          </pre>
        </div>
      )}
    </div>
  );
};
