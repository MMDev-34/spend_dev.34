import React, { useState, useEffect } from "react";
import { useInboxStore } from "@/stores/inboxStore";
import { useAppStore } from "@/stores/appStore";
import { formatMoney } from "@/utils/currency";
import { 
  Inbox, 
  Check, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Smartphone, 
  Sparkles, 
  Code, 
  ChevronRight, 
  X,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  RefreshCw,
  Terminal,
  AlertCircle
} from "lucide-react";
import { WebhookInboxItem } from "@/types/webhook";

export const WebhookInboxModal: React.FC = () => {
  const isOpen = useInboxStore((s) => s.isOpen);
  const setIsOpen = useInboxStore((s) => s.setIsOpen);
  const items = useInboxStore((s) => s.items);
  const logs = useInboxStore((s) => s.logs);
  const fetchInbox = useInboxStore((s) => s.fetchInbox);
  const fetchLogs = useInboxStore((s) => s.fetchLogs);
  const clearLogs = useInboxStore((s) => s.clearLogs);
  const confirmItem = useInboxStore((s) => s.confirmItem);
  const dismissItem = useInboxStore((s) => s.dismissItem);
  const confirmAll = useInboxStore((s) => s.confirmAll);
  const simulateTestWebhook = useInboxStore((s) => s.simulateTestWebhook);
  const isSendingTest = useInboxStore((s) => s.isSendingTest);

  const categories = useAppStore((s) => s.categories);
  const settings = useAppStore((s) => s.settings);

  const [activeTab, setActiveTab] = useState<"inbox" | "guide" | "logs">("inbox");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedGetUrl, setCopiedGetUrl] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit item locally before confirm
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchInbox();
      fetchLogs();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, fetchInbox, fetchLogs, setIsOpen]);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${currentHost}/api/webhook`;
  const sampleGetUrl = `${webhookUrl}?amount=250&note=Coffee`;
  const macroDroidJsonBody = `{"amount": 250, "note": "Coffee", "category": "Food"}`;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchInbox(), fetchLogs()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopy = (text: string, type: "url" | "body" | "get") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === "body") {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } else {
      setCopiedGetUrl(true);
      setTimeout(() => setCopiedGetUrl(false), 2000);
    }
  };

  const handleConfirmWithCategory = (item: WebhookInboxItem) => {
    const updatedCategory = selectedCategories[item.id] || item.categoryId;
    confirmItem({
      ...item,
      categoryId: updatedCategory,
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-modal-title"
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#141414] border border-[#262626] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#262626] bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="inbox-modal-title" className="text-base font-semibold text-[#F5F5F5]">MacroDroid & Mobile Webhook</h2>
                {items.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {items.length} unconfirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#71717A]">
                Receive HTTP requests from MacroDroid, Tasker, or iOS Shortcuts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              className={`p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition ${
                isRefreshing ? "animate-spin text-emerald-400" : ""
              }`}
              title="Refresh inbox"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#F5F5F5] hover:bg-neutral-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher & Simulation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-[#171717] border-b border-[#262626] text-xs">
          <div className="flex items-center gap-1 bg-[#141414] p-0.5 rounded-lg border border-[#262626]">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                activeTab === "inbox"
                  ? "bg-[#262626] text-emerald-400 font-semibold"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              Inbox Queue ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`px-3 py-1 rounded-md font-medium transition ${
                activeTab === "guide"
                  ? "bg-[#262626] text-cyan-400 font-semibold"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              MacroDroid Guide
            </button>
            <button
              onClick={() => {
                setActiveTab("logs");
                fetchLogs();
              }}
              className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
                activeTab === "logs"
                  ? "bg-[#262626] text-amber-400 font-semibold"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Live Logs ({logs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => simulateTestWebhook()}
              disabled={isSendingTest}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[#F5F5F5] border border-neutral-700/60 font-medium transition active:scale-95 text-xs"
              title="Simulates an incoming HTTP request from MacroDroid"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              <span>{isSendingTest ? "Testing..." : "Test MacroDroid"}</span>
            </button>

            {items.length > 0 && activeTab === "inbox" && (
              <button
                onClick={() => confirmAll()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition active:scale-95 text-xs shadow-sm"
              >
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Confirm All ({items.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: INBOX QUEUE */}
          {activeTab === "inbox" && (
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3 bg-[#1C1C1C]/40 rounded-2xl border border-[#262626]">
                  <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] border border-[#262626] flex items-center justify-center mx-auto text-emerald-400">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">Inbox is ready & waiting for requests</h3>
                  <p className="text-xs text-[#71717A] max-w-md mx-auto">
                    When MacroDroid sends an HTTP request from your mobile phone, it will appear right here for 1-tap confirmation.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => simulateTestWebhook()}
                      className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[#F5F5F5] text-xs font-medium transition"
                    >
                      Send Sample MacroDroid Request
                    </button>
                    <button
                      onClick={() => setActiveTab("guide")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition"
                    >
                      Check MacroDroid Settings
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => {
                    const currentCategory = selectedCategories[item.id] || item.categoryId || "cat-other-expense";
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl bg-[#1C1C1C] border border-[#262626] p-3.5 space-y-3 hover:border-[#383838] transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#F5F5F5] truncate">
                                {item.note}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-emerald-400 border border-emerald-500/30">
                                {item.source || "MacroDroid"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#71717A]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{item.date}</span>
                              </span>
                              {item.categoryName && (
                                <span>Category: {item.categoryName}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-bold font-mono-num text-emerald-400">
                              {formatMoney(item.amount, settings.currency, settings.numberFormat)}
                            </div>
                            <span className="text-[10px] text-[#71717A] uppercase font-medium">
                              {item.type}
                            </span>
                          </div>
                        </div>

                        {/* Category Selector & Confirmation Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#262626]/70">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#71717A] shrink-0">Category:</span>
                            <select
                              value={currentCategory}
                              onChange={(e) =>
                                setSelectedCategories((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              className="bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-1 text-xs text-[#F5F5F5] outline-none"
                            >
                              {categories
                                .filter((c) => c.type === "expense" || c.type === "both")
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon} {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => dismissItem(item.id)}
                              className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-neutral-800 transition"
                              title="Dismiss"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleConfirmWithCategory(item)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Confirm & Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MACRODROID SETUP GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-5 text-xs">
              {/* Webhook Endpoint Box */}
              <div className="space-y-1.5">
                <label className="block text-[#A1A1AA] font-semibold">Your Webhook Target URL</label>
                <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#262626] rounded-xl p-2.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full bg-transparent text-xs text-emerald-400 font-mono outline-none"
                  />
                  <button
                    onClick={() => handleCopy(webhookUrl, "url")}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[#F5F5F5] text-xs font-medium transition shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl ? "Copied!" : "Copy URL"}</span>
                  </button>
                </div>
              </div>

              {/* Exact MacroDroid Settings Card */}
              <div className="rounded-xl bg-[#1C1C1C] border border-[#262626] p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <span>MacroDroid HTTP Request Configuration</span>
                </div>

                <div className="space-y-2 text-[#A1A1AA]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="text-[10px] text-[#71717A] block font-semibold uppercase">Action</span>
                      <span className="text-xs text-[#F5F5F5] font-semibold">HTTP Request</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="text-[10px] text-[#71717A] block font-semibold uppercase">Request Method</span>
                      <span className="text-xs text-[#F5F5F5] font-semibold">POST (or GET)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="text-[10px] text-[#71717A] block font-semibold uppercase">Content-Type</span>
                      <span className="text-xs text-[#F5F5F5] font-semibold">application/json</span>
                    </div>
                  </div>

                  {/* Option 1: JSON Body */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#F5F5F5] font-semibold">Option A: Send JSON Body (Recommended)</span>
                      <button
                        onClick={() => handleCopy(macroDroidJsonBody, "body")}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedBody ? "Copied" : "Copy JSON"}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 bg-[#0A0A0A] border border-[#262626] rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto">
                      {macroDroidJsonBody}
                    </pre>
                    <p className="text-[11px] text-[#71717A]">
                      In MacroDroid, replace <code className="text-white">250</code> with your extracted variable like <code className="text-white">{"{lv=amount}"}</code> and note with <code className="text-white">{"{lv=merchant}"}</code>.
                    </p>
                  </div>

                  {/* Option 2: Send Raw Notification SMS text directly */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[#F5F5F5] font-semibold">Option B: Send Notification SMS text directly (Auto-Extract)</span>
                    <pre className="p-2.5 bg-[#0A0A0A] border border-[#262626] rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto">
                      {`{"text": "[not_text]"}`}
                    </pre>
                    <p className="text-[11px] text-[#71717A]">
                      Spend's backend automatically parses bank SMS and notification formats (e.g. <em>"Rs. 250 paid to Starbucks via UPI"</em>) and extracts the amount and merchant!
                    </p>
                  </div>

                  {/* Option 3: GET query URL */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#F5F5F5] font-semibold">Option C: Simple GET Request (No body needed!)</span>
                      <button
                        onClick={() => handleCopy(sampleGetUrl, "get")}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedGetUrl ? "Copied" : "Copy GET URL"}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 bg-[#0A0A0A] border border-[#262626] rounded-xl font-mono text-[11px] text-[#A1A1AA] overflow-x-auto">
                      {sampleGetUrl}
                    </pre>
                  </div>
                </div>
              </div>

              {/* 403 Forbidden Troubleshooting Card */}
              <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Getting "403 Forbidden" from MacroDroid on Mobile?</span>
                </div>

                <div className="space-y-2 text-[#A1A1AA] text-xs leading-relaxed">
                  <p>
                    <strong className="text-[#F5F5F5]">Why this happens:</strong> Google Cloud's development preview URL (<code className="text-amber-300">ais-dev-...run.app</code>) is protected by Google AI Studio authentication. Your laptop browser is logged in, but your mobile MacroDroid background app does not have the Google login cookie by default.
                  </p>

                  <div className="pt-1 space-y-2">
                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="font-semibold text-[#F5F5F5] block mb-1">
                        ⭐ Fix Method 1: Use MacroDroid "Open Website / URL" (100% Works)
                      </span>
                      <p className="text-[11px] text-[#71717A] mb-1.5">
                        In MacroDroid, replace the "HTTP Request" action with <strong className="text-white">"Open Website / URL"</strong> pointing to:
                      </p>
                      <pre className="p-1.5 bg-[#0A0A0A] rounded text-[10px] text-emerald-300 font-mono overflow-x-auto">
                        {`${currentHost}/?amount={lv=amount}&note={lv=merchant}`}
                      </pre>
                      <p className="text-[10px] text-[#71717A] mt-1">
                        Since your mobile Chrome browser is logged into Google, it bypasses the 403 instantly, opens Spend, and auto-records the transaction in 1 second!
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#141414] border border-[#262626]">
                      <span className="font-semibold text-[#F5F5F5] block mb-1">
                        Fix Method 2: Add Cookie Header in MacroDroid HTTP Request
                      </span>
                      <p className="text-[11px] text-[#71717A]">
                        In MacroDroid's HTTP Request action, add a custom Request Header:
                        <br />
                        <code className="text-white">Cookie: &lt;your Google session cookie from browser DevTools&gt;</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE LOGS & DEBUGGER */}
          {activeTab === "logs" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-[#F5F5F5]">Real-Time Webhook Request Logs</h3>
                  <p className="text-xs text-[#71717A]">
                    Every HTTP request that hits your server shows here instantly so you can verify MacroDroid
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLogs()}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[#F5F5F5] transition"
                    title="Refresh logs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {logs.length > 0 && (
                    <button
                      onClick={() => clearLogs()}
                      className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-neutral-800 transition text-[11px]"
                    >
                      Clear Logs
                    </button>
                  )}
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-10 bg-[#1C1C1C]/40 rounded-xl border border-[#262626] space-y-2">
                  <Terminal className="w-6 h-6 mx-auto text-[#71717A]" />
                  <p className="text-xs text-[#71717A]">No HTTP requests recorded yet.</p>
                  <p className="text-[11px] text-[#52525B]">
                    Send a request from MacroDroid on your mobile or click "Test MacroDroid" above to test.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const isSuccess = log.status === "success";
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border space-y-1.5 font-mono text-[11px] ${
                          isSuccess
                            ? "bg-[#1C1C1C] border-[#262626]"
                            : "bg-rose-950/20 border-rose-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                                isSuccess
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {log.method}
                            </span>
                            <span className="text-[#F5F5F5] font-semibold">{log.path}</span>
                          </div>
                          <span className="text-[10px] text-[#71717A]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-xs text-[#A1A1AA]">
                          {log.message}
                        </div>

                        {log.body && (
                          <div className="p-2 rounded-lg bg-[#0A0A0A] text-[#71717A] overflow-x-auto text-[10px]">
                            <span className="text-[#52525B] block mb-0.5">Payload received:</span>
                            {typeof log.body === "object" ? JSON.stringify(log.body) : String(log.body)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
