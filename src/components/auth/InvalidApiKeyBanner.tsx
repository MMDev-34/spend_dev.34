import React, { useState } from "react";
import { KeyRound, ExternalLink, Check, AlertCircle, RefreshCw } from "lucide-react";
import firebaseConfig from "../../../firebase-applet-config.json";

export const InvalidApiKeyBanner: React.FC = () => {
  const projectId = (firebaseConfig as any)?.projectId || "spend-d4b10";
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${projectId}/settings/general`;

  const [inputKey, setInputKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed.startsWith("AIzaSy") || trimmed.length < 30) {
      setErrorMsg("A valid Google Firebase Web API Key starts with 'AIzaSy' and is ~39 characters long.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/firebase-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setErrorMsg(data.error || "Failed to update configuration");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save API key to server");
    } finally {
      setSaving(false);
    }
  };

  const handleClearCacheAndReload = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {}
    window.location.reload();
  };

  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#F5F5F5] space-y-3.5 shadow-xl animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <KeyRound className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-300 text-sm">
            Firebase Web API Key Required
          </h4>
          <p className="text-[11px] text-[#D4D4D8] leading-relaxed">
            Firebase returned <code className="text-amber-300 font-mono">auth/api-key-not-valid</code> because your project (<strong>{projectId}</strong>) currently has a dummy or invalid API key.
          </p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#2D2D2D] text-[11px] text-[#A1A1AA] space-y-2 leading-relaxed">
        <div className="font-semibold text-[#E4E4E7]">Where to find your real Web API Key:</div>
        <ol className="list-decimal list-inside space-y-1.5 pl-1">
          <li>
            Open{" "}
            <a
              href={consoleSettingsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 underline inline-flex items-center gap-0.5 font-medium hover:text-amber-300"
            >
              <span>Firebase Project Settings for {projectId}</span>
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          </li>
          <li>Under the <strong>General</strong> tab, locate <strong>Web API Key</strong> (or scroll down to <strong>Your apps &gt; SDK setup and configuration</strong>).</li>
          <li>Copy your real API key (starts with <code className="text-amber-300">AIzaSy...</code>) and paste it below:</li>
        </ol>

        <form onSubmit={handleSaveApiKey} className="pt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#141414] border border-[#333333] text-xs text-[#F5F5F5] font-mono outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={saving || !inputKey.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save & Reload</span>
            </button>
          </div>
          {errorMsg && (
            <div className="text-rose-400 text-[11px] flex items-center gap-1 pt-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        <div className="pt-2 border-t border-[#222222] flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#71717A]">Seeing this after a new deployment or publish?</span>
          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-[#E4E4E7] text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Clear App Cache & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
