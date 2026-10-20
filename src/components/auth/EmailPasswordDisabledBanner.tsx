import React from "react";
import { ExternalLink, ShieldAlert, Mail } from "lucide-react";
import firebaseConfig from "../../../firebase-applet-config.json";

interface EmailPasswordDisabledBannerProps {
  onSwitchToGoogle?: () => void;
}

export const EmailPasswordDisabledBanner: React.FC<EmailPasswordDisabledBannerProps> = ({
  onSwitchToGoogle,
}) => {
  const projectId = firebaseConfig.projectId || "spend-d4b10";
  const consoleProvidersUrl = `https://console.firebase.google.com/project/${projectId}/authentication/providers`;

  return (
    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-[#F5F5F5] space-y-3.5 shadow-xl animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="font-bold text-rose-300 text-sm">
              Email/Password Sign-In Not Enabled
            </h4>
            <p className="text-[11px] text-[#D4D4D8] mt-0.5 leading-relaxed">
              Firebase returned <code className="text-rose-300 font-mono">auth/operation-not-allowed</code> because Email/Password authentication is disabled in your Firebase Console.
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2D2D2D] text-[11px] text-[#A1A1AA] space-y-2 leading-relaxed">
        <div className="font-semibold text-[#E4E4E7]">How to enable Email/Password Sign-In:</div>
        <ol className="list-decimal list-inside space-y-1.5 pl-1">
          <li>
            Open{" "}
            <a
              href={consoleProvidersUrl}
              target="_blank"
              rel="noreferrer"
              className="text-rose-400 underline inline-flex items-center gap-0.5 font-medium hover:text-rose-300"
            >
              <span>Firebase Sign-in Method Console</span>
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          </li>
          <li>Click on <strong>Email/Password</strong> under sign-in providers.</li>
          <li>Toggle <strong>Enable</strong> and click <strong>Save</strong>.</li>
        </ol>
      </div>

      {onSwitchToGoogle && (
        <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#D4D4D8]">
            Or sign in instantly with Google:
          </span>
          <button
            type="button"
            onClick={onSwitchToGoogle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Use Google Sign-In</span>
          </button>
        </div>
      )}
    </div>
  );
};
