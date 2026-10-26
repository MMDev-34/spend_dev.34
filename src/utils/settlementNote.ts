export interface FormatSettlementNoteParams {
  direction: "lent" | "borrowed";
  personName: string;
  isFullSettlement: boolean;
  paymentMethod?: string;
  userMemo?: string;
}

/**
 * Returns a clean, structured multi-line note for settlement transactions:
 * 
 * Paid Back to [Contact Name] / Got Back from [Contact Name]
 * Type: Full settlement / Partial settlement
 * Payment Mode: UPI / Cash / Bank Transfer / Other
 * Note: [Optional custom memo]
 */
export function formatSettlementNote({
  direction,
  personName,
  isFullSettlement,
  paymentMethod = "upi",
  userMemo,
}: FormatSettlementNoteParams): string {
  const title =
    direction === "borrowed"
      ? `Paid Back to ${personName}`
      : `Got Back from ${personName}`;

  const typeLine = `Type: ${isFullSettlement ? "Full settlement" : "Partial settlement"}`;

  // Normalize payment method label
  const pmLower = (paymentMethod || "other").toLowerCase();
  let pmLabel = "Other";
  if (pmLower === "cash") {
    pmLabel = "Cash";
  } else if (pmLower === "upi") {
    pmLabel = "UPI";
  } else if (
    pmLower.includes("bank") ||
    pmLower.includes("transfer") ||
    pmLower === "netbanking"
  ) {
    pmLabel = "Bank Transfer";
  } else if (pmLower === "card") {
    pmLabel = "Card";
  } else if (paymentMethod && paymentMethod.toLowerCase() !== "settlement") {
    pmLabel = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
  }

  const paymentLine = `Payment Mode: ${pmLabel}`;

  const lines = [title, typeLine, paymentLine];

  // Clean user memo: avoid redundant duplicate lines if user passed auto-generated strings
  const cleanMemo = userMemo?.trim();
  if (
    cleanMemo &&
    !cleanMemo.toLowerCase().includes("full settlement") &&
    !cleanMemo.toLowerCase().includes("partial settlement") &&
    !cleanMemo.toLowerCase().includes("settled in full") &&
    !cleanMemo.toLowerCase().includes("partial installment") &&
    !cleanMemo.toLowerCase().startsWith("paid back to") &&
    !cleanMemo.toLowerCase().startsWith("got back from") &&
    !cleanMemo.toLowerCase().startsWith("debt settlement to") &&
    !cleanMemo.toLowerCase().startsWith("debt repayment from")
  ) {
    lines.push(`Note: ${cleanMemo}`);
  }

  return lines.join("\n");
}

export interface ParsedSettlementNote {
  isSettlement: boolean;
  noteTitle: string;
  type?: string;
  paymentMode?: string;
  memo?: string;
}

/**
 * Parses a note string to detect if it's a settlement transaction and breaks it
 * down into Note title, Type, Payment Mode, and optional Memo for structured rendering.
 */
export function parseSettlementNote(
  note?: string,
  fallbackPaymentMethod?: string
): ParsedSettlementNote {
  if (!note || !note.trim()) {
    return { isSettlement: false, noteTitle: "" };
  }

  const rawLines = note.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = rawLines[0] || "";
  const lowerFirst = firstLine.toLowerCase();

  const isGotBack = lowerFirst.startsWith("got back from");
  const isPaidBack = lowerFirst.startsWith("paid back to");
  const isDebtSettle = lowerFirst.startsWith("debt settlement to");
  const isDebtRepay = lowerFirst.startsWith("debt repayment from");
  const isFullDebtSettle = lowerFirst.startsWith("full debt settlement to");
  const isFullDebtRepay = lowerFirst.startsWith("full debt repayment from");

  if (
    !isGotBack &&
    !isPaidBack &&
    !isDebtSettle &&
    !isDebtRepay &&
    !isFullDebtSettle &&
    !isFullDebtRepay
  ) {
    return { isSettlement: false, noteTitle: note };
  }

  // Normalize title
  let noteTitle = firstLine;
  if (isDebtSettle || isFullDebtSettle) {
    const contact = firstLine
      .replace(/full debt settlement to/i, "")
      .replace(/debt settlement to/i, "")
      .replace(/\(.*?\)/, "")
      .trim();
    noteTitle = `Paid Back to ${contact}`;
  } else if (isDebtRepay || isFullDebtRepay) {
    const contact = firstLine
      .replace(/full debt repayment from/i, "")
      .replace(/debt repayment from/i, "")
      .replace(/\(.*?\)/, "")
      .trim();
    noteTitle = `Got Back from ${contact}`;
  }

  let type: string | undefined = undefined;
  let paymentMode: string | undefined = undefined;
  let memo: string | undefined = undefined;

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lower = line.toLowerCase();
    if (lower.startsWith("type:")) {
      type = line.slice(5).trim();
    } else if (lower.startsWith("payment mode:")) {
      paymentMode = line.slice(13).trim();
    } else if (lower.startsWith("note:")) {
      memo = line.slice(5).trim();
    } else if (lower.startsWith("memo:")) {
      memo = line.slice(5).trim();
    } else if (!memo) {
      memo = line;
    }
  }

  // Fallbacks if not explicitly provided
  if (!type) {
    type = lowerFirst.includes("full") ? "Full settlement" : "Partial settlement";
  }
  if (!paymentMode && fallbackPaymentMethod && fallbackPaymentMethod.toLowerCase() !== "settlement") {
    paymentMode =
      fallbackPaymentMethod.toLowerCase() === "upi"
        ? "UPI"
        : fallbackPaymentMethod.charAt(0).toUpperCase() + fallbackPaymentMethod.slice(1);
  } else if (!paymentMode) {
    paymentMode = "Cash";
  }

  return {
    isSettlement: true,
    noteTitle,
    type,
    paymentMode,
    memo,
  };
}
