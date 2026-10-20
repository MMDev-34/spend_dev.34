import React, { useState } from "react";
import { Copy, Check, ExternalLink, ShieldAlert, ArrowDown } from "lucide-react";
import firebaseConfig from "../../../firebase-applet-config.json";

interface UnauthorizedDomainBannerProps {
  onDismiss?: () => void;
  onScrollToEmail?: () => void;
}

export const UnauthorizedDomainBanner: React.FC<UnauthorizedDomainBannerProps> = ({
  onDismiss,
  onScrollToEmail,
}) => {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const projectId = firebaseConfig.projectId || "spend-d4b10";
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleCopy = async () => {
    if (!currentHostname) return;
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = currentHostname;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#F5F5F5] space-y-3.5 shadow-xl animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="font-bold text-amber-300 text-sm">
              Authorize Preview Domain in Firebase
            </h4>
            <p className="text-[11px] text-[#D4D4D8] mt-0.5 leading-relaxed">
              Google Sign-In blocked this request because this preview domain is not yet listed in your Firebase project's authorized domains.
            </p>
          </div>
        </div>
      </div>

      {/* Domain display and copy action */}
      <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#2D2D2D] flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-[#71717A] uppercase font-semibold block">
            Domain to add
          </span>
          <code className="text-xs font-mono text-emerald-400 truncate block font-medium">
            {currentHostname}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#282828] border border-[#3A3A3A] text-xs font-semibold text-[#F5F5F5] transition active:scale-95 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy Domain"}</span>
        </button>
      </div>

      {/* Steps */}
      <div className="text-[11px] text-[#A1A1AA] space-y-1.5 leading-relaxed pl-1">
        <div className="font-semibold text-[#E4E4E7]">To enable Google Sign-In:</div>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
          <li>
            Open{" "}
            <a
              href={consoleSettingsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline inline-flex items-center gap-0.5 font-medium hover:text-emerald-300"
            >
              <span>Firebase Auth Settings</span>
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          </li>
          <li>Scroll to the <strong>Authorized domains</strong> section and click <strong>Add domain</strong>.</li>
          <li>Paste the copied domain and click <strong>Save</strong>.</li>
        </ol>
      </div>

      {/* Alternative CTA */}
      <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-[11px] text-[#D4D4D8]">
          ⚡ Want to sign in immediately without domain setup?
        </span>
        <button
          type="button"
          onClick={onScrollToEmail}
          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>Use Email & Password</span>
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
