export interface WebhookInboxItem {
  id: string;
  amount: number; // minor units (e.g. 25000 for ₹250.00)
  type: "expense" | "income";
  note: string;
  categoryId?: string;
  categoryName?: string;
  date: string; // YYYY-MM-DD
  source?: string; // e.g. "MacroDroid", "iOS Shortcuts", "Android Tasker", "UPI SMS", "Mobile Webhook"
  rawPayload?: any;
  receivedAt: string; // ISO timestamp
  status: "pending" | "confirmed" | "dismissed";
}

export interface WebhookPayload {
  amount?: number | string;
  type?: "expense" | "income";
  note?: string;
  title?: string;
  description?: string;
  merchant?: string;
  category?: string;
  categoryId?: string;
  date?: string;
  source?: string;
  text?: string;
  message?: string;
  notification?: string;
  body?: any;
  raw?: any;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: any;
  body: any;
  parsedItem?: WebhookInboxItem;
  status: "success" | "error";
  message: string;
}
