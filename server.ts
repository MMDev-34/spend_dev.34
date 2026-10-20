import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(__dirname, "data");
const INBOX_FILE = path.resolve(DATA_DIR, "webhook_inbox.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data dir:", err);
  }
}

interface WebhookItem {
  id: string;
  amount: number; // in minor units
  type: "expense" | "income";
  note: string;
  categoryId?: string;
  categoryName?: string;
  date: string; // YYYY-MM-DD
  source?: string;
  rawPayload?: any;
  receivedAt: string;
  status: "pending" | "confirmed" | "dismissed";
}

interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: any;
  body: any;
  parsedItem?: WebhookItem;
  status: "success" | "error";
  message: string;
}

// Load persisted inbox items
function loadInbox(): WebhookItem[] {
  try {
    if (fs.existsSync(INBOX_FILE)) {
      const data = fs.readFileSync(INBOX_FILE, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error("Failed to read inbox file:", err);
  }
  return [];
}

// Save persisted inbox items
function saveInbox(items: WebhookItem[]) {
  try {
    fs.writeFileSync(INBOX_FILE, JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Failed to write inbox file:", err);
  }
}

let inbox: WebhookItem[] = loadInbox();
let recentLogs: WebhookLog[] = [];

function addLog(log: WebhookLog) {
  recentLogs.unshift(log);
  if (recentLogs.length > 40) {
    recentLogs = recentLogs.slice(0, 40);
  }
}

// --- Middlewares ---

// 1. CORS headers - allow mobile MacroDroid, Tasker, Shortcuts, and web browsers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 2. Multi-format body parsers: JSON, URL-encoded form data, and raw/plain text
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.text({ type: "*/*", limit: "5mb" }));

// Helper: infer category from text
function inferCategory(text: string, categoryHint?: string): { id: string; name: string } {
  const combined = `${categoryHint || ""} ${text}`.toLowerCase();

  if (/food|cafe|coffee|starbucks|restaurant|dining|lunch|dinner|breakfast|swiggy|zomato|burger|pizza|tea|chai|bakery/i.test(combined)) {
    return { id: "cat-food", name: "Food & Dining" };
  }
  if (/transport|travel|uber|ola|cab|fuel|petrol|diesel|metro|train|flight|parking|toll|auto/i.test(combined)) {
    return { id: "cat-transport", name: "Transport" };
  }
  if (/grocery|supermarket|mart|vegetable|fruit|milk|ration|blinkit|zepto|instamart|dmart/i.test(combined)) {
    return { id: "cat-groceries", name: "Groceries" };
  }
  if (/rent|landlord|flat|apartment|maintenance|society/i.test(combined)) {
    return { id: "cat-rent", name: "Housing / Rent" };
  }
  if (/bill|electricity|water|wifi|broadband|internet|recharge|mobile|utility|gas|bescom|tneb|airtel|jio/i.test(combined)) {
    return { id: "cat-bills", name: "Bills & Utilities" };
  }
  if (/shop|amazon|flipkart|myntra|clothes|shoes|electronics|purchase|store/i.test(combined)) {
    return { id: "cat-shopping", name: "Shopping" };
  }
  if (/movie|cinema|netflix|spotify|game|entertainment|party|club|prime/i.test(combined)) {
    return { id: "cat-entertainment", name: "Entertainment" };
  }
  if (/hospital|doctor|pharmacy|medicine|health|clinic|dentist|gym|medplus|apollo/i.test(combined)) {
    return { id: "cat-health", name: "Health" };
  }
  if (/salary|payroll|wage|credit|bonus|stipend/i.test(combined)) {
    return { id: "cat-salary", name: "Salary" };
  }

  return { id: "cat-other-expense", name: "Other" };
}

// Helper: parse money into minor units (e.g. 250 -> 25000)
function parseToMinorUnits(val: any): number {
  if (typeof val === "number") {
    return Math.round(val * 100);
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100);
    }
  }
  return 0;
}

// Smart extractor from raw SMS / notification text
function extractFromNotificationText(text: string): { amountMinor: number; note: string; inferredType: "expense" | "income" } {
  let amountMinor = 0;
  let note = "";
  let inferredType: "expense" | "income" = "expense";

  // Check if credit or debit
  if (/\b(?:credited|received|refund|deposited|added)\b/i.test(text) && !/\bdebited\b/i.test(text)) {
    inferredType = "income";
  }

  // 1. Amount extraction (e.g. "Rs. 250.00", "INR 350", "₹1,250", "debited by 450", "paid 240")
  const amountMatch = text.match(
    /(?:rs\.?|inr|₹|\$|€|£|amount\s*[:=]?|paid|spent|debited(?:\s+by)?|transfer(?:red)?(?:\s+of)?|received)\s*[:₹RsINR\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );

  if (amountMatch && amountMatch[1]) {
    amountMinor = parseToMinorUnits(amountMatch[1]);
  } else {
    // Fallback: look for standard decimal or integer number with currency
    const fallbackMatch = text.match(/(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
      text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\b/);
    if (fallbackMatch && fallbackMatch[1]) {
      amountMinor = parseToMinorUnits(fallbackMatch[1]);
    }
  }

  // 2. Note / Merchant extraction (e.g. "to Starbucks", "at Cafe Coffee Day", "for Uber ride", "VPA xyz@upi")
  const merchantMatch = text.match(
    /(?:to|at|vpa|towards|for|merchant|info)\s+([A-Za-z0-9&.\-_ ]{3,35}?)(?:\s+(?:on|via|ref|using|avlbl|bal|upi|thru|from|ending|dated)|$)/i
  );

  if (merchantMatch && merchantMatch[1]) {
    note = merchantMatch[1].trim();
  } else {
    // Look for short descriptive words
    const words = text.split(/\s+/).slice(0, 6).join(" ");
    note = words || "Mobile Payment";
  }

  return { amountMinor, note, inferredType };
}

// Get today's date YYYY-MM-DD
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// --- Firebase Config Endpoint ---
app.get("/api/firebase-config", (_req, res) => {
  try {
    const configPath = path.resolve(__dirname, "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (process.env.FIREBASE_API_KEY && (!data.apiKey || data.apiKey.includes("Dummy"))) {
        data.apiKey = process.env.FIREBASE_API_KEY;
        try {
          fs.writeFileSync(configPath, JSON.stringify(data, null, 2), "utf-8");
        } catch {}
      }
      return res.json(data);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
  return res.json({});
});

app.post("/api/firebase-config", express.json(), (req, res) => {
  try {
    const configPath = path.resolve(__dirname, "firebase-applet-config.json");
    const existing = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
    const updated = { ...existing, ...req.body };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --- Firebase Auth Reverse Proxy ---
// Prevents mobile third-party cookie/storage blocking on iOS Safari and mobile Chrome
app.all("/__/auth/*", async (req, res) => {
  try {
    const targetUrl = `https://spend-d4b10.firebaseapp.com${req.originalUrl}`;
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host" && val) {
        headers[key] = Array.isArray(val) ? val.join(", ") : val;
      }
    }
    headers["host"] = "spend-d4b10.firebaseapp.com";

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      if (typeof req.body === "object" && !(req.body instanceof Buffer)) {
        fetchOptions.body = JSON.stringify(req.body);
      } else {
        fetchOptions.body = req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);
    res.status(response.status);
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (lower !== "content-encoding" && lower !== "transfer-encoding") {
        res.setHeader(name, value);
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error("Firebase auth proxy error:", err);
    res.status(502).send("Auth Proxy Error");
  }
});

// --- Webhook Endpoints ---

const WEBHOOK_PATHS = [
  "/api/webhook",
  "/api/webhook/",
  "/api/webhook/transaction",
  "/api/webhook/payment",
  "/api/webhook/macrodroid",
  "/api/macrodroid",
  "/webhook",
  "/macrodroid",
];

// Handles both POST, GET, and PUT for mobile flexibility
app.all(WEBHOOK_PATHS, (req, res) => {
  // If it's a GET request without any parameters, return service info
  if (req.method === "GET" && Object.keys(req.query).length === 0) {
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "http";
    const webhookUrl = `${protocol}://${host}/api/webhook`;
    return res.json({
      status: "active",
      message: "Spend Webhook Endpoint is ready to receive requests from MacroDroid, Tasker, iOS Shortcuts, or curl.",
      webhookUrl,
      supportedMethods: ["POST", "GET"],
      samplePostJson: { amount: 250, note: "Coffee", category: "Food" },
      sampleGetUrl: `${webhookUrl}?amount=250&note=Coffee&category=Food`,
    });
  }

  const logEntry: WebhookLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: {
      "user-agent": req.headers["user-agent"] || "",
      "content-type": req.headers["content-type"] || "",
    },
    query: req.query,
    body: typeof req.body === "string" ? req.body.slice(0, 500) : req.body,
    status: "error",
    message: "",
  };

  try {
    let payload: any = req.body;

    // If body came as raw string (e.g. plain text or misconfigured Content-Type)
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Plain text notification or SMS
        payload = { text: payload };
      }
    } else if (payload && typeof payload === "object") {
      // If express.urlencoded treated a raw JSON body as a key with empty value: {"{...}": ""}
      const keys = Object.keys(payload);
      if (keys.length === 1 && typeof keys[0] === "string" && keys[0].trim().startsWith("{") && keys[0].trim().endsWith("}")) {
        try {
          payload = JSON.parse(keys[0]);
        } catch {
          // Keep as is
        }
      }
    } else if (!payload || typeof payload !== "object") {
      payload = {};
    }

    // Merge query params so GET requests like /api/webhook?amount=250&note=Coffee work too!
    payload = { ...req.query, ...payload };

    // Extract amount
    let rawAmount = payload.amount ?? payload.value ?? payload.price ?? payload.total ?? payload.amt ?? payload.val;
    let amountMinor = parseToMinorUnits(rawAmount);

    let note = payload.note || payload.title || payload.merchant || payload.description || payload.name || payload.desc || payload.recipient || "";
    let type: "expense" | "income" = payload.type === "income" ? "income" : "expense";

    // If amount is not found directly, parse from notification / SMS text
    const textContent = payload.text || payload.message || payload.notification || payload.sms || payload.not_text || payload.body;
    if ((!amountMinor || amountMinor <= 0) && typeof textContent === "string" && textContent.length > 0) {
      const extracted = extractFromNotificationText(textContent);
      amountMinor = extracted.amountMinor;
      if (!note && extracted.note) {
        note = extracted.note;
      }
      if (!payload.type && extracted.inferredType) {
        type = extracted.inferredType;
      }
    }

    if (!amountMinor || amountMinor <= 0) {
      logEntry.message = "Failed: Missing or unparseable amount in payload";
      addLog(logEntry);
      console.warn(`[Webhook Warning] Rejected request with invalid amount. Payload:`, payload);
      return res.status(400).json({
        success: false,
        error: "Missing or unparseable 'amount'. Please provide amount (e.g. {\"amount\": 250, \"note\": \"Coffee\"}) or notification text with amount.",
        receivedPayload: payload,
      });
    }

    if (!note) {
      note = "MacroDroid Payment";
    }

    // Identify source
    const userAgent = req.headers["user-agent"] || "";
    let source = payload.source;
    if (!source) {
      if (/MacroDroid/i.test(userAgent) || /MacroDroid/i.test(JSON.stringify(payload))) {
        source = "MacroDroid";
      } else if (/Shortcuts/i.test(userAgent)) {
        source = "iOS Shortcuts";
      } else if (/Tasker/i.test(userAgent)) {
        source = "Android Tasker";
      } else {
        source = "MacroDroid / Mobile";
      }
    }

    const date = payload.date && /^\d{4}-\d{2}-\d{2}/.test(payload.date) ? payload.date.slice(0, 10) : getTodayString();
    const inferred = inferCategory(note, payload.category || payload.categoryId);

    const newItem: WebhookItem = {
      id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount: amountMinor,
      type,
      note,
      categoryId: payload.categoryId || inferred.id,
      categoryName: payload.category || inferred.name,
      date,
      source,
      rawPayload: payload,
      receivedAt: new Date().toISOString(),
      status: "pending",
    };

    inbox.unshift(newItem);
    if (inbox.length > 100) {
      inbox = inbox.slice(0, 100);
    }
    saveInbox(inbox);

    logEntry.status = "success";
    logEntry.parsedItem = newItem;
    logEntry.message = `Successfully queued ${type}: ${note} (${amountMinor / 100})`;
    addLog(logEntry);

    console.log(`[Webhook] Success from ${source}: ${note} (${amountMinor / 100})`);

    return res.status(201).json({
      success: true,
      message: "Transaction received and queued in Spend inbox for confirmation",
      inboxItem: newItem,
      pendingCount: inbox.filter((i) => i.status === "pending").length,
    });
  } catch (err: any) {
    console.error("[Webhook Error]:", err);
    logEntry.message = `Server exception: ${err.message || String(err)}`;
    addLog(logEntry);
    return res.status(500).json({ success: false, error: err.message || "Failed to process webhook" });
  }
});

// 2. Query pending inbox transactions
app.get("/api/webhook/inbox", (req, res) => {
  const pendingOnly = req.query.all !== "true";
  const items = pendingOnly ? inbox.filter((i) => i.status === "pending") : inbox;
  res.json({
    success: true,
    items,
    count: items.length,
    totalPending: inbox.filter((i) => i.status === "pending").length,
  });
});

// 3. Confirm an inbox item
app.post("/api/webhook/inbox/:id/confirm", (req, res) => {
  const { id } = req.params;
  const index = inbox.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Inbox item not found" });
  }

  inbox.splice(index, 1);
  saveInbox(inbox);

  res.json({
    success: true,
    message: "Transaction confirmed and removed from inbox query",
    remainingPending: inbox.filter((i) => i.status === "pending").length,
  });
});

// 4. Batch confirm all
app.post("/api/webhook/inbox/confirm-all", (req, res) => {
  inbox = inbox.filter((i) => i.status !== "pending");
  saveInbox(inbox);
  res.json({ success: true, message: "All inbox items confirmed", remainingPending: 0 });
});

// 5. Dismiss an inbox item
app.delete("/api/webhook/inbox/:id", (req, res) => {
  const { id } = req.params;
  const index = inbox.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Inbox item not found" });
  }

  inbox.splice(index, 1);
  saveInbox(inbox);

  res.json({ success: true, message: "Inbox item dismissed" });
});

// 6. Clear inbox
app.post("/api/webhook/inbox/clear", (req, res) => {
  inbox = [];
  saveInbox(inbox);
  res.json({ success: true, message: "Inbox cleared" });
});

// 7. Request logs endpoint for Live Debugger in UI
app.get("/api/webhook/logs", (req, res) => {
  res.json({
    success: true,
    logs: recentLogs,
    count: recentLogs.length,
  });
});

// Clear logs
app.post("/api/webhook/logs/clear", (req, res) => {
  recentLogs = [];
  res.json({ success: true });
});

// 8. Simulation test endpoint
app.post("/api/webhook/test", (req, res) => {
  const sampleTransactions = [
    { note: "Starbucks Cappuccino", amount: 32000, categoryId: "cat-food", categoryName: "Food & Dining", source: "MacroDroid (Simulated)" },
    { note: "Uber to Downtown", amount: 24500, categoryId: "cat-transport", categoryName: "Transport", source: "MacroDroid (Simulated)" },
    { note: "Swiggy Food Delivery", amount: 46000, categoryId: "cat-food", categoryName: "Food & Dining", source: "MacroDroid (Simulated)" },
    { note: "Grocery Supermarket", amount: 115000, categoryId: "cat-groceries", categoryName: "Groceries", source: "MacroDroid (Simulated)" },
    { note: "Pharmacy Medicals", amount: 48000, categoryId: "cat-health", categoryName: "Health", source: "MacroDroid (Simulated)" },
  ];

  const random = sampleTransactions[Math.floor(Math.random() * sampleTransactions.length)];
  const testItem: WebhookItem = {
    id: `inbox-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    amount: random.amount,
    type: "expense",
    note: random.note,
    categoryId: random.categoryId,
    categoryName: random.categoryName,
    date: getTodayString(),
    source: random.source,
    receivedAt: new Date().toISOString(),
    status: "pending",
  };

  inbox.unshift(testItem);
  saveInbox(inbox);

  addLog({
    id: `log-test-${Date.now()}`,
    timestamp: new Date().toISOString(),
    method: "POST",
    path: "/api/webhook/test",
    headers: { "user-agent": "Internal Simulator" },
    query: {},
    body: random,
    parsedItem: testItem,
    status: "success",
    message: `Simulated MacroDroid transaction: ${random.note}`,
  });

  res.json({
    success: true,
    message: "Simulated payment webhook received!",
    item: testItem,
    totalPending: inbox.filter((i) => i.status === "pending").length,
  });
});

// 9. Config info endpoint
app.get("/api/webhook/config", (req, res) => {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol || "http";
  const webhookUrl = `${protocol}://${host}/api/webhook`;

  res.json({
    webhookUrl,
    methods: ["POST", "GET"],
    macrodroid: {
      action: "HTTP Request",
      url: webhookUrl,
      method: "POST",
      contentType: "application/json",
      jsonBody: '{"amount": "{lv=amount}", "note": "{lv=merchant}"}',
      alternativeNotificationBody: '{"text": "[not_text]"}',
      alternativeGetUrl: `${webhookUrl}?amount={lv=amount}&note={lv=merchant}`,
    },
    curlExample: `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 280, "note": "Lunch at Cafe", "category": "Food"}'`,
  });
});

// Start Server with Vite
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Spend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
